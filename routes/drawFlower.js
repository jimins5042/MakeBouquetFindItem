const express = require('express');
const ejs = require('ejs');
const FlowerMapper = require('../db/flower/FlowerMapper');
const router = express.Router();

let imageLink;

router.get('/FlowerCanvas', async function (req, res) {

    res.render('flower/FlowerCanvas'); // .ejs 확장자는 생략
});

router.get('/selectPackage', async function (req, res) {

    var images = await FlowerMapper.selectAll();

    console.log(images);

    res.render('flower/SelectFlowerPackage', { images: images }); // .ejs 확장자는 생략
});

router.use(express.json()); // JSON 데이터를 처리하기 위해 추가

router.get('/decorate', async function (req, res) {
    res.render('flower/decorateBouquet', { backgroundImage: imageLink });
});

router.post('/decorate', async function (req, res) {
    imageLink = req.body.image;
    console.log(imageLink);
    res.status(200).send('Image URL received');
});



module.exports = router;
