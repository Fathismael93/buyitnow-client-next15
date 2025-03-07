import cloudinary from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploads = (file, folder) => {
  return new Promise((resolve) => {
    cloudinary.uploader.upload(
      file,
      (result) => {
        resolve({
          public_id: result.public_id,
          url: result.secure_url,
        });
      },

      {
        resource_type: 'auto',
        folder: folder,
      },
    );
  });
};

export { uploads };
