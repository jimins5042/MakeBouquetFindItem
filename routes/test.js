const router = require('express').Router();
const ejs = require('ejs');

const multer = require('multer');
const path = require('path');
require('dotenv').config();
let upload = multer({
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


// 메인 페이지 렌더링
router.get('/', (req, res) => {
  res.render('classifyTest', { imageUrl: null });
});

router.post('/upload', upload.single('image'), (req, res) => {
  console.log(req.file); // 업로드된 파일 정보 출력

  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  //let img_url = req.file?.path;
  let img_url = '/public/image/' + path.basename(req.file.path);  // '/image/파일명'
  console.log("Uploaded file path:", img_url);
  res.json({ img_url });
});


module.exports = router;
