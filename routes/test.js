const express = require('express');
const ejs = require('ejs'); 
const router = express.Router();

// http://127.0.0.1:8000/test?name=테스트
router.get('/test', function (req, res) {
    // 쿼리 문자열에서 'name' 파라미터를 받아오기
    const name = req.query.name;
    
    // EJS 템플릿에 'name'을 전달하여 렌더링
    res.render('test', { name: name }); // .ejs 확장자는 생략
});

router.get('/', function (req, res) {
    // 쿼리 문자열에서 'name' 파라미터를 받아오기
    const name = req.query.name;
    
    // EJS 템플릿에 'name'을 전달하여 렌더링
    res.render('flower/FlowerCanvas'); // .ejs 확장자는 생략
});

module.exports = router;
