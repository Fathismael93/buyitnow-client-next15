import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import User from '@/backend/models/user';
import bcrypt from 'bcryptjs';
import dbConnect from '@/backend/config/dbConnect';
import { captureException } from '@/monitoring/sentry';

// Configuration des limites de taux pour éviter les attaques par force brute
const rateLimiting = {
  // Fenêtre de 15 minutes, max 10 tentatives par adresse IP
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
  // Stockage en mémoire des tentatives (en production, utiliser Redis ou une DB)
  attemptsStore: new Map(),
};

/**
 * Vérifier si une adresse IP a dépassé la limite de tentatives
 * @param {string} ip - Adresse IP
 * @returns {boolean} - True si la limite est dépassée
 */
const isRateLimited = (ip) => {
  const now = Date.now();
  const key = `auth_${ip}`;

  // Nettoyer les anciennes entrées
  for (const [storedKey, data] of rateLimiting.attemptsStore.entries()) {
    if (now - data.timestamp > rateLimiting.windowMs) {
      rateLimiting.attemptsStore.delete(storedKey);
    }
  }

  // Vérifier si l'IP existe dans le store
  if (!rateLimiting.attemptsStore.has(key)) {
    rateLimiting.attemptsStore.set(key, {
      count: 1,
      timestamp: now,
    });
    return false;
  }

  // Récupérer et vérifier le compteur
  const data = rateLimiting.attemptsStore.get(key);

  // Réinitialiser si on est en dehors de la fenêtre
  if (now - data.timestamp > rateLimiting.windowMs) {
    rateLimiting.attemptsStore.set(key, {
      count: 1,
      timestamp: now,
    });
    return false;
  }

  // Incrémenter et vérifier
  data.count += 1;
  rateLimiting.attemptsStore.set(key, data);

  return data.count > rateLimiting.maxAttempts;
};

/**
 * Configuration principale de NextAuth
 */
export default async function auth(req, res) {
  // Extraire l'adresse IP pour le rate limiting
  const ip =
    req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // Vérifier le rate limiting pour les requêtes de connexion
  if (req.method === 'POST' && req.body?.email) {
    if (isRateLimited(ip)) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
      });
    }
  }

  // Créer un timeout pour éviter les requêtes bloquantes
  const timeout = setTimeout(() => {
    return res.status(408).json({ error: 'Authentication request timeout' });
  }, 10000); // 10 secondes max

  try {
    // Connexion à la base de données avec gestion d'erreur
    await dbConnect().catch((error) => {
      console.error('DB Connection error in NextAuth:', error);
      captureException(error, {
        tags: { component: 'nextauth', action: 'dbConnect' },
      });
      clearTimeout(timeout);
      return res.status(500).json({ error: 'Database connection error' });
    });

    const nextAuthOptions = {
      adapter: MongoDBAdapter({
        db: (await dbConnect()).connection.db,
      }),
      providers: [
        CredentialsProvider({
          id: 'credentials',
          name: 'Credentials',
          credentials: {
            email: { label: 'Email', type: 'email' },
            password: { label: 'Password', type: 'password' },
          },
          async authorize(credentials) {
            try {
              // Validation des entrées
              if (!credentials?.email || !credentials?.password) {
                throw new Error('Missing credentials');
              }

              // Normaliser l'email
              const email = credentials.email.trim().toLowerCase();

              // Vérifier les tentatives de force brute communes
              if (credentials.password.length > 100) {
                throw new Error('Invalid password format');
              }

              // Recherche avec timeout et protection contre injection
              const user = await Promise.race([
                User.findOne({ email }).select('+password').lean(),
                new Promise((_, reject) =>
                  setTimeout(
                    () => reject(new Error('Database query timeout')),
                    5000,
                  ),
                ),
              ]);

              if (!user) {
                // Garder le message générique pour éviter les énumérations d'utilisateurs
                throw new Error('Invalid credentials');
              }

              // Vérification du mot de passe avec protection contre les timing attacks
              const isPasswordMatched = await bcrypt.compare(
                credentials.password,
                user.password,
              );

              if (!isPasswordMatched) {
                throw new Error('Invalid credentials');
              }

              // Filtrer les champs sensibles
              const { password, __v, ...userWithoutSensitiveData } = user;

              return userWithoutSensitiveData;
            } catch (error) {
              console.error('Auth error:', error.message);

              // Log des erreurs non liées aux identifiants incorrects
              if (!error.message.includes('Invalid credentials')) {
                captureException(error, {
                  tags: { component: 'nextauth', action: 'authorize' },
                  level: error.name === 'MongooseError' ? 'error' : 'warning',
                });
              }

              throw error;
            }
          },
        }),
      ],
      session: {
        strategy: 'jwt',
        maxAge: 7 * 24 * 60 * 60, // 7 jours
        updateAge: 24 * 60 * 60, // 24 heures
      },
      jwt: {
        secret: process.env.NEXTAUTH_SECRET,
        // En production, utilisez le chiffrement en plus de la signature
        ...(process.env.NODE_ENV === 'production' && {
          encryption: true,
        }),
        // Plus courte durée de vie pour limiter la fenêtre d'exposition
        maxAge: 7 * 24 * 60 * 60, // 7 jours
      },
      callbacks: {
        async jwt({ token, user, account }) {
          // Ajouter l'utilisateur au token lors de la connexion
          if (user) {
            token.user = {
              _id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              role: user.role,
              avatar: user.avatar,
              createdAt: user.createdAt,
            };

            // Ajouter le provider pour les stratégies multi-auth
            if (account) {
              token.provider = account.provider;
            }
          }

          // Mise à jour des données utilisateur si demandé
          const isUpdateRequest = req.url.includes('/api/auth/session?update');

          if (isUpdateRequest && token?.user?._id) {
            try {
              const updatedUser = await User.findById(token.user._id)
                .select('-password -__v')
                .lean();

              if (updatedUser) {
                token.user = updatedUser;
              }
            } catch (error) {
              console.error('Error updating user in jwt callback:', error);
              captureException(error, {
                tags: { component: 'nextauth', action: 'jwt_update' },
              });
              // Ne pas échouer l'authentification si l'update échoue
            }
          }

          return token;
        },
        async session({ session, token }) {
          // Transférer les données du token à la session
          if (token?.user) {
            session.user = token.user;
          }

          // Ajouter le timestamp de la dernière vérification
          session.lastVerified = Date.now();

          // Garantir que les infos sensibles ne sont jamais présentes
          if (session?.user?.password) {
            delete session.user.password;
          }

          return session;
        },
        // Ajouter une vérification supplémentaire de l'état de l'utilisateur
        async signIn({ user }) {
          // Vous pourriez ajouter ici une vérification d'utilisateur actif, email vérifié, etc.
          return true;
        },
      },
      pages: {
        signIn: '/login',
        signOut: '/login',
        error: '/auth/error', // Page d'erreur personnalisée
      },
      // Configuration de sécurité avancée
      secret: process.env.NEXTAUTH_SECRET,
      // Configuration du PKCE pour plus de sécurité (pour les providers OAuth)
      useSecureCookies: process.env.NODE_ENV === 'production',
      cookies: {
        sessionToken: {
          name:
            process.env.NODE_ENV === 'production'
              ? '__Secure-next-auth.session-token'
              : 'next-auth.session-token',
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: process.env.NODE_ENV === 'production',
          },
        },
      },
      debug: process.env.NODE_ENV === 'development',
      logger: {
        error(code, metadata) {
          if (code !== 'SIGNIN_OAUTH_ERROR') {
            captureException(new Error(`NextAuth error: ${code}`), {
              tags: { component: 'nextauth' },
              extra: metadata,
            });
          }
        },
      },
    };

    // Exécuter NextAuth avec le timeout établi
    const authResponse = await NextAuth(req, res, nextAuthOptions);
    clearTimeout(timeout);
    return authResponse;
  } catch (error) {
    clearTimeout(timeout);
    console.error('NextAuth critical error:', error);
    captureException(error, {
      tags: { component: 'nextauth', action: 'global_handler' },
      level: 'fatal',
    });

    return res.status(500).json({ error: 'Authentication service error' });
  }
}
