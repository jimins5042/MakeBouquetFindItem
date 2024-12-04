const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const testController = require('../controller/testController');
require('dotenv').config();

let upload_local = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/image');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + file.originalname);
    }
  }),
  fileFilter: function (req, file, callback) {
    let ext = path.extname(file.originalname);
    if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.gif') {
      return callback(new Error('PNG, JPG, GIF만 업로드하세요'));
    }
    callback(null, true);
  }
});

const upload = multer({ storage: multer.memoryStorage() })

// 메인 페이지 렌더링
router.get('/', (req, res) => {
  res.render('classifyTest', { imageUrl: null });
});

router.post('/upload', upload.single('image'), testController.upload);

router.post('/updatePhash',testController.updatePhash);


module.exports = router;
