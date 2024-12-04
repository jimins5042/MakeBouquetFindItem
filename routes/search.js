const router = require('express').Router();
const multer = require('multer');
const searchController = require('../controller/searchController');
require('dotenv').config();

const upload = multer({ storage: multer.memoryStorage() })

router.get('/', searchController.searchView);

router.post('/upload', upload.single('image'), searchController.uploadImageBF);
//router.post('/upload', upload.single('image'), searchController.uploadImageLSH);

router.get('/findImg', searchController.searchImgLogic);

module.exports = router;
