import User from '../models/user';
import { uploads } from '../utils/cloudinary';
import fs from 'fs';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import Contact from '../models/contact';
import next from 'next';
import ErrorHandler from '../utils/errorHandler';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for port 465, false for other ports
  auth: {
    user: process.env.NODEMAILER_EMAIL_ACCOUNT,
    pass: process.env.NODEMAILER_PASSWORD_ACCOUNT,
  },
});

export const registerUser = async (req, res) => {
  try {
    const { name, phone, email, password } = JSON.parse(req.body);
    const user = await User.create({
      name,
      phone,
      email,
      password,
    });

    return res.status(201).json({
      user,
    });
  } catch (error) {
    return res.json(error);
  }
};

export const updateProfile = async (req, res) => {
  try {
    // CHECKING IF PASSWORD ENTERED IS THE SAME AS PASSWORD STORED

    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }
    const newUserData = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
    };

    // IF USER IS UPDATING PROFILE PICTURE...
    if (req.files.length > 0) {
      const uploader = async (path) => await uploads(path, 'buyitnow/avatars');

      const file = req.files[0];
      const { path } = file;

      const avatarResponse = await uploader(path);
      fs.unlinkSync(path);

      newUserData.avatar = avatarResponse;
    }

    // ...THEN UPDATE USER DATA WITH NEW DATA

    const updatedUser = await User.findOneAndUpdate(
      { email: req.user.email },
      newUserData,
    );

    return res.status(200).json({
      updatedUser,
    });
  } catch (error) {
    return res.json(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    console.log('We are updating password');

    const user = await User.findOne({ email: req.user.email }).select(
      '+password',
    );

    console.log('User connected');
    console.log(user);

    console.log('Body of the request');
    console.log(req.body);

    const currentPassword = JSON.parse(req.body.currentPassword);

    console.log('currentPassword: ');
    console.log(currentPassword);

    const isPasswordMatched = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    console.log('isPasswordMatched: ');
    console.log(isPasswordMatched);

    if (!isPasswordMatched) {
      return next(new ErrorHandler('Old password is incorrect', 400));
    }

    const newPassword = JSON.parse(req.body.newPassword);

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    return res.json(error);
  }
};

export const sendEmail = async (req, res) => {
  try {
    // CHECKING IF PASSWORD ENTERED IS THE SAME AS PASSWORD STORED

    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    const subject = JSON.parse(req?.body?.subject);
    const message = JSON.parse(req?.body?.message);

    const messageSent = {
      from: user?._id,
      subject,
      message,
    };

    await transporter
      .sendMail({
        from: user?.email,
        to: process.env.NODEMAILER_EMAIL_ACCOUNT,
        subject: subject,
        html: message,
      })
      .then(async () => await Contact.create(messageSent));

    return res.status(201).json({
      success: true,
    });
  } catch (error) {
    return res.json(error);
  }
};
