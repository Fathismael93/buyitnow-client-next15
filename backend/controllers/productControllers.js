import Product from '../models/product';
import Category from '../models/category';
import APIFilters from '../utils/APIFilters';
import next from 'next';
import ErrorHandler from '../utils/errorHandler';

export const getProducts = async (req, res) => {
  try {
    const resPerPage = 2;

    const apiFilters = new APIFilters(Product.find(), req.query)
      .search()
      .filter();

    let products = await apiFilters.query.populate('category');
    const filteredProductsCount = products.length;

    apiFilters.pagination(resPerPage);

    products = await apiFilters.query.populate('category').clone();

    const result = filteredProductsCount / resPerPage;
    const totalPages = Number.isInteger(result) ? result : Math.ceil(result);

    const categories = await Category.find();

    return res.status(200).json({
      categories,
      totalPages,
      products,
    });
  } catch (error) {
    return res.json(error);
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.query.id).populate('category');

    if (!product) {
      return next(new ErrorHandler('Product not found', 404));
    }

    const sameCategoryProducts = await Product.find({
      category: product?.category,
    }).limit(5);

    return res.status(200).json({
      sameCategoryProducts,
      product,
    });
  } catch (error) {
    return res.json(error);
  }
};
