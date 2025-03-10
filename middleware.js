import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Cache pour le rate limiting (en production, utiliser Redis ou autre solution distribuée)
const loginAttempts = new Map();

// Nettoyer le cache périodiquement pour éviter les fuites mémoire
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date.now();
      // Supprimer les entrées plus anciennes que 30 minutes
      for (const [key, data] of loginAttempts.entries()) {
        if (now - data.timestamp > 30 * 60 * 1000) {
          loginAttempts.delete(key);
        }
      }
    },
    5 * 60 * 1000,
  ); // Nettoyer toutes les 5 minutes
}

/**
 * Fonction pour vérifier les tentatives de connexion
 * @param {string} ip Adresse IP
 * @param {number} windowMs Fenêtre de temps en ms
 * @param {number} maxAttempts Nombre maximum de tentatives
 * @returns {Object} Informations sur les tentatives
 */
function checkRateLimit(ip, windowMs = 15 * 60 * 1000, maxAttempts = 5) {
  const now = Date.now();
  const key = `login_${ip}`;

  if (!loginAttempts.has(key)) {
    loginAttempts.set(key, { count: 1, timestamp: now });
    return {
      blocked: false,
      attemptsLeft: maxAttempts - 1,
      resetTime: now + windowMs,
    };
  }

  const data = loginAttempts.get(key);

  // Réinitialiser si en dehors de la fenêtre
  if (now - data.timestamp > windowMs) {
    loginAttempts.set(key, { count: 1, timestamp: now });
    return {
      blocked: false,
      attemptsLeft: maxAttempts - 1,
      resetTime: now + windowMs,
    };
  }

  // Incrémenter le compteur
  data.count += 1;
  loginAttempts.set(key, data);

  const blocked = data.count > maxAttempts;
  const attemptsLeft = Math.max(0, maxAttempts - data.count);

  return { blocked, attemptsLeft, resetTime: data.timestamp + windowMs };
}

/**
 * Ajouter des headers de sécurité à la réponse
 * @param {NextResponse} response La réponse Next.js
 * @returns {NextResponse} La réponse avec les headers de sécurité
 */
function addSecurityHeaders(response) {
  // Headers OWASP recommandés
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

  // Protection contre le clickjacking
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  // Caching sécurisé pour les réponses non-statiques
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  // En-tête moderne HSTS
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );

  // Permissions policy (anciennement Feature-Policy)
  response.headers.set(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()',
  );

  return response;
}

/**
 * Journaliser les tentatives d'accès avec un niveau de détail adapté
 * @param {Object} req Requête
 * @param {string} action Type d'action
 * @param {Object} details Détails supplémentaires
 */
function logSecurityEvent(req, action, details = {}) {
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const url = req.nextUrl.pathname;

  // Format de log structuré
  const logData = {
    timestamp: new Date().toISOString(),
    action,
    ip,
    url,
    userAgent: userAgent.substring(0, 100), // Tronquer pour éviter les logs trop longs
    ...details,
  };

  // En production, envoyer à un service de logs
  if (process.env.NODE_ENV === 'production') {
    // Simuler l'envoi à un service de logs externe
    console.warn(`SECURITY_EVENT: ${JSON.stringify(logData)}`);

    // Dans une implémentation réelle:
    // await fetch('https://log-service.example.com/security-events', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(logData)
    // });
  } else {
    console.warn(`Security event: ${action}`, logData);
  }
}

export default withAuth(
  async function middleware(req) {
    try {
      // Get the pathname from the URL
      const url = req.nextUrl.pathname;
      const user = req?.nextauth?.token?.user;
      const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';

      // Détection de comportements suspects
      const isAnonymousProxyHeader =
        req.headers.get('via') || req.headers.get('forwarded');
      const suspiciousUserAgent = (
        req.headers.get('user-agent') || ''
      ).toLowerCase();
      const isSuspiciousUserAgent =
        suspiciousUserAgent.includes('burp') ||
        suspiciousUserAgent.includes('sqlmap') ||
        suspiciousUserAgent.includes('nikto') ||
        suspiciousUserAgent.includes('nmap') ||
        suspiciousUserAgent.length < 10 ||
        suspiciousUserAgent === 'curl' ||
        suspiciousUserAgent === 'wget';

      if (isAnonymousProxyHeader || isSuspiciousUserAgent) {
        logSecurityEvent(req, 'suspicious_request', {
          reason: isAnonymousProxyHeader
            ? 'anonymous_proxy'
            : 'suspicious_user_agent',
          userAgent: suspiciousUserAgent,
          headers: isAnonymousProxyHeader
            ? {
                via: req.headers.get('via'),
                forwarded: req.headers.get('forwarded'),
              }
            : undefined,
        });

        // Bloquer les requêtes très suspectes
        if (isSuspiciousUserAgent && url.includes('/api/')) {
          const response = NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 },
          );
          return addSecurityHeaders(response);
        }
      }

      // For API routes, add CORS headers but be more specific for security
      if (url.startsWith('/api')) {
        // Vérification avancée du rate limiting pour les API sensibles
        if (
          url.includes('/api/auth') ||
          url.includes('/api/payment') ||
          url.includes('/api/admin')
        ) {
          const { blocked, attemptsLeft, resetTime } = checkRateLimit(
            ip,
            5 * 60 * 1000,
            30,
          ); // 30 requêtes par 5 minutes

          if (blocked) {
            logSecurityEvent(req, 'api_rate_limit_exceeded', { endpoint: url });

            const response = NextResponse.json(
              { error: 'Too Many Requests' },
              { status: 429 },
            );

            response.headers.set(
              'Retry-After',
              Math.ceil((resetTime - Date.now()) / 1000).toString(),
            );
            return addSecurityHeaders(response);
          }

          // Ajouter des informations de limite pour le débogage
          const response = NextResponse.next();
          response.headers.set(
            'X-RateLimit-Remaining',
            attemptsLeft.toString(),
          );
          response.headers.set(
            'X-RateLimit-Reset',
            Math.ceil(resetTime / 1000).toString(),
          );

          // Ajouter les en-têtes de sécurité
          return addSecurityHeaders(response);
        }

        const response = NextResponse.next();

        // More restrictive CORS policy for production
        const allowedOrigins =
          process.env.NODE_ENV === 'production'
            ? [
                process.env.NEXT_PUBLIC_SITE_URL ||
                  'https://buyitnow-client-next15.vercel.app',
              ]
            : ['http://localhost:3000'];

        const origin = req.headers.get('origin');

        if (origin && allowedOrigins.includes(origin)) {
          response.headers.set('Access-Control-Allow-Origin', origin);
          response.headers.set(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, DELETE, OPTIONS',
          );
          response.headers.set(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization',
          );
          response.headers.set('Access-Control-Max-Age', '86400');
        } else if (origin) {
          // Log des tentatives CORS non autorisées
          logSecurityEvent(req, 'cors_violation', { origin, endpoint: url });
        }

        return addSecurityHeaders(response);
      }

      // Protect routes that require authentication
      if (
        url?.startsWith('/me') ||
        url?.startsWith('/address') ||
        url?.startsWith('/cart') ||
        url?.startsWith('/shipping')
      ) {
        if (!user) {
          logSecurityEvent(req, 'unauthorized_access_attempt', {
            endpoint: url,
            redirectTo: '/login',
          });

          const response = NextResponse.redirect(new URL('/login', req.url));
          return addSecurityHeaders(response);
        }

        const response = NextResponse.next();
        return addSecurityHeaders(response);
      }

      // Rate limiting pour les pages d'authentification
      if (
        url === '/login' ||
        url === '/register' ||
        url === '/forgot-password'
      ) {
        if (req.method === 'POST') {
          const { blocked, attemptsLeft, resetTime } = checkRateLimit(ip);

          if (blocked) {
            logSecurityEvent(req, 'auth_rate_limit_exceeded', { page: url });

            const response = NextResponse.redirect(
              new URL('/too-many-requests', req.url),
            );
            response.headers.set(
              'Retry-After',
              Math.ceil((resetTime - Date.now()) / 1000).toString(),
            );
            return addSecurityHeaders(response);
          }

          // Intégration avec NextAuth: ajouter ces infos au flux d'auth/signin pourrait être utile
          const response = NextResponse.next();
          response.headers.set(
            'X-RateLimit-Remaining',
            attemptsLeft.toString(),
          );
          return addSecurityHeaders(response);
        }
      }

      // Allow authenticated requests to continue
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    } catch (error) {
      console.error('Middleware error:', error);

      // Log the error for security monitoring
      try {
        logSecurityEvent(req, 'middleware_error', {
          error: error.message,
          stack:
            process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
      } catch (e) {
        // Fail silently
      }

      // Redirect to error page in case of unexpected errors
      const response = NextResponse.redirect(new URL('/error', req.url));
      return addSecurityHeaders(response);
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Return true if the token exists, false otherwise
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    '/me/:path*',
    '/address/:path*',
    '/cart',
    '/shipping',
    '/forgot-password',
  ],
};
