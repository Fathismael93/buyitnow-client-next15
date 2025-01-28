import multer from 'multer';

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, new Date().toDateString() + '-' + file.originalname);

    console.log('File Name');
    console.log(file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg'
  ) {
    file;

    console.log('File is present here');

    cb(null, true);
  } else {
    ({ error: 'Unsupported file format. Upload only JPEG/JPG or PNG' }), false;
  }
};

const upload = multer({
  storage,
  limits: { fieldSize: 1024 * 1024 },
  fileFilter,
});

export default upload;
