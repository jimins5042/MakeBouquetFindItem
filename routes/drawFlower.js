const express = require('express');
const ejs = require('ejs'); 
const FlowerMapper = require('../db/flower/FlowerMapper');
const router = express.Router();


router.get('/FlowerCanvas', async function (req, res) {

    res.render('flower/FlowerCanvas'); // .ejs 확장자는 생략
});

router.get('/selectPackage', async function (req, res) {

    var images = await FlowerMapper.selectAll();

    console.log(images);
        
    res.render('flower/SelectFlowerPackage', {images : images}); // .ejs 확장자는 생략
});

module.exports = router;
