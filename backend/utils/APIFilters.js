import mongoose from 'mongoose';
import { captureException } from '@/monitoring/sentry';

/**
 * Classe utilitaire pour appliquer des filtres, recherches et pagination aux requêtes API
 */
class APIFilters {
  /**
   * Constructeur de la classe APIFilters
   * @param {Object} query - Requête Mongoose
   * @param {Object} queryStr - Chaîne de requête HTTP
   */
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  /**
   * Applique un filtre de recherche par mot-clé
   * @returns {APIFilters} - Instance de la classe pour chaînage
   */
  search() {
    try {
      const keyword = this.queryStr.keyword
        ? {
            $or: [
              {
                name: {
                  $regex: this.queryStr.keyword,
                  $options: 'i',
                },
              },
              {
                description: {
                  $regex: this.queryStr.keyword,
                  $options: 'i',
                },
              },
            ],
          }
        : {};

      this.query = this.query.find({ ...keyword });
      return this;
    } catch (error) {
      captureException(error, {
        tags: { action: 'api_filters_search' },
        extra: { keyword: this.queryStr.keyword },
      });
      // Retourner une requête vide en cas d'erreur
      this.query = this.query.find({ _id: null });
      return this;
    }
  }

  /**
   * Applique des filtres avancés (gt, gte, lt, lte, etc.)
   * @returns {APIFilters} - Instance de la classe pour chaînage
   */
  filter() {
    try {
      const queryCopy = { ...this.queryStr };

      // Champs à exclure des filtres
      const removeFields = ['keyword', 'page', 'limit', 'sort', 'fields'];
      removeFields.forEach((el) => delete queryCopy[el]);

      let output = {};

      // Traiter chaque clé de filtre
      for (let key in queryCopy) {
        // Ignorer les clés vides ou null
        if (!queryCopy[key]) continue;

        // Traiter les opérateurs MongoDB (gt, gte, lt, lte, in)
        if (key.match(/\b(gt|gte|lt|lte|in)\b/)) {
          const prop = key.split('[')[0];
          const operator = key.match(/\[(.*)\]/)[1];

          if (!output[prop]) {
            output[prop] = {};
          }

          // Traiter les valeurs numériques
          let value = queryCopy[key];
          if (!isNaN(value)) {
            value = Number(value);
          }

          output[prop][`$${operator}`] = value;
        }
        // Traiter les catégories (convertir en ObjectId)
        else if (
          key === 'category' &&
          mongoose.Types.ObjectId.isValid(queryCopy[key])
        ) {
          const categoryId = new mongoose.Types.ObjectId(queryCopy[key]);
          output[key] = categoryId;
        }
        // Traiter les autres filtres
        else {
          output[key] = queryCopy[key];
        }
      }

      this.query = this.query.find(output);
      return this;
    } catch (error) {
      captureException(error, {
        tags: { action: 'api_filters_filter' },
        extra: { queryStr: this.queryStr },
      });
      // Retourner une requête inchangée en cas d'erreur
      return this;
    }
  }

  /**
   * Applique la pagination à la requête
   * @param {number} resPerPage - Nombre de résultats par page
   * @returns {APIFilters} - Instance de la classe pour chaînage
   */
  pagination(resPerPage = 10) {
    try {
      // Obtenir le numéro de page demandé (par défaut: 1)
      const currentPage = Math.max(Number(this.queryStr.page) || 1, 1);

      // Valider le nombre de résultats par page
      const validatedResPerPage = Math.min(Math.max(resPerPage, 1), 50);

      // Calculer le nombre d'éléments à sauter
      const skip = validatedResPerPage * (currentPage - 1);

      this.query = this.query.limit(validatedResPerPage).skip(skip);
      return this;
    } catch (error) {
      captureException(error, {
        tags: { action: 'api_filters_pagination' },
        extra: { page: this.queryStr.page, resPerPage },
      });
      // Appliquer une pagination par défaut en cas d'erreur
      this.query = this.query.limit(10).skip(0);
      return this;
    }
  }

  /**
   * Applique un tri à la requête
   * @returns {APIFilters} - Instance de la classe pour chaînage
   */
  sort() {
    try {
      // Si un paramètre de tri est spécifié
      if (this.queryStr.sort) {
        // Convertir 'field,field2' en 'field field2'
        const sortBy = this.queryStr.sort.split(',').join(' ');
        this.query = this.query.sort(sortBy);
      } else {
        // Tri par défaut par date de création (du plus récent au plus ancien)
        this.query = this.query.sort('-createdAt');
      }
      return this;
    } catch (error) {
      captureException(error, {
        tags: { action: 'api_filters_sort' },
        extra: { sort: this.queryStr.sort },
      });
      // Appliquer un tri par défaut en cas d'erreur
      this.query = this.query.sort('-createdAt');
      return this;
    }
  }

  /**
   * Limite les champs retournés dans la réponse
   * @returns {APIFilters} - Instance de la classe pour chaînage
   */
  limitFields() {
    try {
      // Si des champs spécifiques sont demandés
      if (this.queryStr.fields) {
        // Convertir 'field,field2' en 'field field2'
        const fields = this.queryStr.fields.split(',').join(' ');
        this.query = this.query.select(fields);
      } else {
        // Par défaut, exclure le champ __v
        this.query = this.query.select('-__v');
      }
      return this;
    } catch (error) {
      captureException(error, {
        tags: { action: 'api_filters_limit_fields' },
        extra: { fields: this.queryStr.fields },
      });
      // Appliquer une sélection par défaut en cas d'erreur
      this.query = this.query.select('-__v');
      return this;
    }
  }

  /**
   * Applique tous les filtres (recherche, filtre, tri, limitation de champs et pagination)
   * @param {number} resPerPage - Nombre de résultats par page
   * @returns {APIFilters} - Instance de la classe pour chaînage
   */
  applyAllFilters(resPerPage = 10) {
    return this.search().filter().sort().limitFields().pagination(resPerPage);
  }

  /**
   * Compte le nombre total de documents correspondant aux filtres appliqués
   * @returns {Promise<number>} - Nombre total de documents
   */
  async countDocuments() {
    try {
      // Créer une copie de la requête pour le comptage
      const countQuery = this.query.model.find().merge(this.query);

      // Supprimer les options de pagination et de tri qui ne sont pas nécessaires pour le comptage
      countQuery.options.limit = undefined;
      countQuery.options.skip = undefined;
      countQuery.options.sort = undefined;

      return await countQuery.countDocuments();
    } catch (error) {
      captureException(error, {
        tags: { action: 'api_filters_count_documents' },
      });
      return 0;
    }
  }

  /**
   * Effectue la requête et retourne les résultats
   * @returns {Promise<Array>} - Résultats de la requête
   */
  async exec() {
    try {
      return await this.query.exec();
    } catch (error) {
      captureException(error, {
        tags: { action: 'api_filters_exec' },
      });
      return [];
    }
  }

  /**
   * Effectue la requête, compte les documents et retourne les résultats avec des métadonnées
   * @param {number} resPerPage - Nombre de résultats par page
   * @returns {Promise<Object>} - Résultats de la requête avec métadonnées
   */
  async getResults(resPerPage = 10) {
    try {
      const countPromise = this.countDocuments();
      const dataPromise = this.pagination(resPerPage).exec();

      const [totalCount, data] = await Promise.all([countPromise, dataPromise]);

      const currentPage = Number(this.queryStr.page) || 1;
      const totalPages = Math.ceil(totalCount / resPerPage);

      return {
        success: true,
        count: totalCount,
        page: currentPage,
        totalPages,
        data,
      };
    } catch (error) {
      captureException(error, {
        tags: { action: 'api_filters_get_results' },
      });
      return {
        success: false,
        count: 0,
        page: 1,
        totalPages: 0,
        data: [],
      };
    }
  }
}

export default APIFilters;
