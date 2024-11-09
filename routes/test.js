const express = require('express');
const ejs = require('ejs');
const router = express.Router();
const axios = require("axios");

require('dotenv').config();


// http://127.0.0.1:8000/test?name=테스트
router.get('/test', function (req, res) {
  const name = req.query.name;
  res.render('test', { name: name }); // .ejs 확장자는 생략
});



module.exports = router;
