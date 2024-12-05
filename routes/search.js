const router = require('express').Router();
const multer = require('multer');
const searchController = require('../controller/searchController');
require('dotenv').config();

const upload = multer({ storage: multer.memoryStorage() })

router.get('/', searchController.searchView);

router.post('/upload', upload.single('image'), searchController.uploadImageBF);
//router.post('/upload', upload.single('image'), searchController.uploadImageLSH);

router.get('/findImg', searchController.searchImgLogic);

/*
    이미지 검색 로직 테스트 용
*/
router.post('/upload/phashV1', upload.single('image'), searchController.uploadImageBFV1); //기본 phash + 완전 탐색
router.post('/upload/phashV2', upload.single('image'), searchController.uploadImageBF); //개선된 phash + 완전 탐색
router.post('/upload/lsh', upload.single('image'), searchController.uploadImageLSH); // 개선된 phash + LSH

module.exports = router;
