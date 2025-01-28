import Order from '../models/order';
import APIFilters from '../utils/APIFilters';
import User from '../models/user';
import Product from '../models/product';
import Cart from '../models/cart';
import Category from '../models/category';
import next from 'next';
import ErrorHandler from '../utils/errorHandler';
import DeliveryPrice from '../models/deliveryPrice';

export const myOrders = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email }).select('_id');

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    const resPerPage = 2;
    const ordersCount = await Order.countDocuments({ user: user._id });

    const apiFilters = new APIFilters(Order.find(), req.query).pagination(
      resPerPage,
    );

    const orders = await apiFilters.query
      .find({ user: user._id })
      .populate('shippingInfo user')
      .sort({ createdAt: -1 });

    const result = ordersCount / resPerPage;
    const totalPages = Number.isInteger(result) ? result : Math.ceil(result);

    const deliveryPrice = await DeliveryPrice.find();

    return res.status(200).json({
      deliveryPrice,
      totalPages,
      orders,
    });
  } catch (error) {
    return res.json(error);
  }
};

// SAVING AN ORDER MADE BY A CLIENT

export const webhook = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email }).select('_id');

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    // GETTING ORDER DATA FROM THE REQUEST BODY
    const orderData = JSON.parse(req?.body);

    orderData.user = user?._id;

    // GETTING THE IDs AND THE QUANTITES OF THE PRODUCTS ORDERED BY USER
    let productsIdsQuantities = [];

    if (Array.isArray(orderData?.orderItems) && orderData?.orderItems[0]) {
      const orderItems = orderData?.orderItems;

      for (let index = 0; index < orderItems?.length; index++) {
        const element = orderItems[index];
        productsIdsQuantities.push({
          id: element.product,
          quantity: element.quantity,
          cartId: element.cartId,
        });

        delete orderItems[index].cartId;
        delete orderItems[index].category;
      }
    }

    // STARTING THE OPERATION OF ORDER
    let updatedProductsReturned = [];
    let inavailableStockProducts = [];

    for (let index = 0; index < productsIdsQuantities?.length; index++) {
      // GETTING THE PRODUCT ORDERED BY USER
      const element = productsIdsQuantities[index];
      const itemInOrder = orderData?.orderItems[index];
      const product = await Product.findById(element.id).populate('category');

      itemInOrder.category = product?.category.categoryName;

      // CHECKING IF THE QUANTITY ASKED BY USER IS LESS THAN PRODUCT STOCK
      const isProductLeft = product.stock >= element.quantity;

      // IF STOCK IS MORE THAN QUANTITY THAN...
      if (isProductLeft) {
        const newStock = product.stock - element.quantity;

        const productUpdated = await Product.findByIdAndUpdate(product._id, {
          stock: newStock,
        });

        updatedProductsReturned.push(productUpdated);
      } else {
        // ...ELSE
        const rejectedProduct = {
          id: product._id,
          name: product.name,
          image: product.images[0].url,
          stock: product.stock,
          quantity: element.quantity,
        };

        inavailableStockProducts.push(rejectedProduct);
      }
    }

    // CHECKING IF THE OPERATION IS SUCCESSFUL WITH EVERY PRODUCT ORDERED BY USER
    const difference =
      productsIdsQuantities.length - updatedProductsReturned.length;

    // IF THE OPERATION IS SUCCESSFUL THEN ADD THE ORDER TO THE DATABASE
    if (difference === 0) {
      for (let index = 0; index < productsIdsQuantities.length; index++) {
        const element = productsIdsQuantities[index];
        await Cart.findByIdAndDelete(element.cartId);
      }

      const order = await Order.create(orderData);

      return res.status(201).json({ success: true, id: order?._id });
    } else {
      // IF OPERATION IS NOT SUCCESSFUL, THAN RETURN THE PRODUCTS WITH UNAVAILABLE STOCK
      return res.json({ success: false, inavailableStockProducts });
    }
  } catch (error) {
    return res.json(error);
  }
};
