import User from '../models/user';
import { uploads } from '../utils/cloudinary';
import fs from 'fs';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import Contact from '../models/contact';
import next from 'next';
import ErrorHandler from '../utils/errorHandler';
import { Resend } from 'resend';

// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 465,
//   secure: true, // true for port 465, false for other ports
//   auth: {
//     user: process.env.NODEMAILER_EMAIL_ACCOUNT,
//     pass: process.env.NODEMAILER_PASSWORD_ACCOUNT,
//   },
// });

const resend = new Resend(process.env.RESEND_API_KEY);

export const registerUser = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
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
    const user = await User.findOne({ email: req.user.email }).select(
      '+password',
    );

    const isPasswordMatched = await bcrypt.compare(
      req.body.currentPassword,
      user.password,
    );

    if (!isPasswordMatched) {
      return next(new ErrorHandler('Old password is incorrect', 400));
    }

    user.password = req.body.newPassword;
    await user.save();

    return res.status(200).json({
      sucess: true,
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

    const messageSent = {
      from: user?._id,
      subject: req?.body?.subject,
      message: req?.body?.message,
    };

    const { data, error } = await resend.emails.send({
      from: user?.email,
      to: process.env.RESEND_EMAIL_ACCOUNT,
      subject: req.body.subject,
      react: req.body.message,
    });

    await Contact.create(messageSent);

    if (error) {
      return res.status(400).json(error);
    }

    // transporter.sendMail({
    //   to: process.env.NODEMAILER_EMAIL_ACCOUNT,
    //   subject: req.body.subject,
    //   html: req.body.message,
    // });

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.json(error);
  }
};
