import Address from '../models/address';
import ErrorHandler from '../utils/errorHandler';
import User from '../models/user';
import PaymentType from '../models/paymentType';
import next from 'next';
import DeliveryPrice from '../models/deliveryPrice';

export const newAddress = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email }).select('_id');

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    req.body.user = user._id;

    const address = await Address.create(req.body);

    return res.status(201).json({
      address,
    });
  } catch (error) {
    return res.json(error);
  }
};

export const getAddresses = async (req, res) => {
  try {
    const user = await User.findOne({ email: req?.user?.email }).select('_id');

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    const addresses = await Address.find({ user: user?._id });

    if (addresses) {
      const paymentTypes = await PaymentType.find();
      const deliveryPrice = await DeliveryPrice.find();

      return res.status(200).json({
        addresses,
        paymentTypes,
        deliveryPrice,
      });
    }
  } catch (error) {
    return res.json(error);
  }
};

export const getAddress = async (req, res) => {
  try {
    const address = await Address.findById(req?.query?.id);

    if (!address) {
      return next(new ErrorHandler('Address not found', 404));
    }

    return res.status(200).json({
      address,
    });
  } catch (error) {
    return res.json(error);
  }
};

export const updateAddress = async (req, res) => {
  try {
    console.log('Updating address');
    const addressId = req.query.id;
    const newAddress = req.body;

    console.log('newAddress: ');
    console.log(newAddress);

    const oldAddress = await Address.findById(addressId);

    console.log('oldAddress: ');
    console.log(oldAddress);

    if (!oldAddress) {
      return next(new ErrorHandler('Address not found', 404));
    }

    newAddress.user = oldAddress.user;

    console.log('newAddress after user added: ');
    console.log(newAddress);

    const address = await Address.findByIdAndUpdate(addressId, newAddress, {
      new: true,
    });

    console.log('address updated: ');
    console.log(address);

    return res.status(200).json({
      address,
    });
  } catch (error) {
    return res.json(error);
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const addressDeleted = await Address.findByIdAndDelete(req.query.id);

    if (!addressDeleted) {
      return next(new ErrorHandler('Address not found', 404));
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    return res.json(error);
  }
};
