import User from '../models/user';
import Cart from '../models/cart';
import { DECREASE, INCREASE } from '@/helpers/constants';
import Product from '../models/product';
import next from 'next';
import ErrorHandler from '../utils/errorHandler';

export const newCart = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email }).select('_id');

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    const body = JSON.parse(req.body);

    const product = await Product.findById(body.productId);

    if (!product) {
      return next(new ErrorHandler('Product not found', 404));
    }

    let quantity = 1;

    // IF QUANTITY ASKED BY THE USER IS MORE THEN THE PRODUCT'STOCK...

    if (quantity > product.stock) {
      return next(new ErrorHandler('Product inavailable', 404));
    }

    const cart = {
      product: product._id,
      user: user._id,
      quantity,
    };

    const cartAdded = await Cart.create(cart);

    return res.status(201).json({
      cartAdded,
    });
  } catch (error) {
    return res.json(error);
  }
};

export const getCart = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email }).select('_id');

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    let cart;
    const result = await Cart.find({ user: user._id }).populate('product');
    cart = result;

    // IF THE QUANTITY HAS EXCEDEED THE PRODUCT STOCK AVAILABLE THEN UPDATE THE QUANTITY TO EQUAL THE PRODUCT STOCK

    for (let index = 0; index < result.length; index++) {
      const productQuantity = result[index].quantity;
      const productStock = result[index].product.stock;
      const id = result[index]._id;

      if (productQuantity > productStock) {
        const cartUpdated = await Cart.findByIdAndUpdate(id, {
          quantity: productStock,
        });

        cart = cartUpdated;
      }
    }

    const cartCount = cart.length;

    return res.status(200).json({
      cartCount,
      cart,
    });
  } catch (error) {
    return res.json(error);
  }
};

export const updateCart = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    const body = JSON.parse(req.body);

    const productId = body.product.product._id;
    const product = await Product.findById(productId);

    if (!product) {
      return next(new ErrorHandler('Product not found', 404));
    }

    // IF THE USER WANT TO INCREASE THE QUANTITY OF A PRODUCT IN THE CART THEN THE VALUE WILL BE INCREASE

    if (body.value === INCREASE) {
      const neededQuantity = body.product.quantity + 1;
      if (neededQuantity > product.stock) {
        return next(new ErrorHandler('Inavailable Quantity', 404));
      }

      const updatedCart = await Cart.findByIdAndUpdate(body.product._id, {
        quantity: neededQuantity,
      });

      if (updatedCart) {
        return res.status(200).json('Item updated in cart');
      } else {
        return next(new ErrorHandler('Unknown error! Try again later', 500));
      }
    }

    // IF THE USER WANT TO DECREASE THE QUANTITY OF A PRODUCT IN THE CART THEN THE VALUE WILL BE DECREASE

    if (body.value === DECREASE) {
      const neededQuantity = body.product.quantity - 1;
      const updatedCart = await Cart.findByIdAndUpdate(body.product._id, {
        quantity: neededQuantity,
      });

      if (updatedCart) {
        return res.status(200).json('Item updated in cart');
      } else {
        return next(new ErrorHandler('Unknown error! Try again later', 500));
      }
    }
  } catch (error) {
    return res.json(error);
  }
};

export const deleteCart = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    const cartid = req.query.id;
    const deleteCart = await Cart.findByIdAndDelete(cartid);

    if (deleteCart) {
      return res.status(200).json('Item deleted in cart');
    } else {
      return next(new ErrorHandler('Unknown error! Try again later', 500));
    }
  } catch (error) {
    return res.json(error);
  }
};
