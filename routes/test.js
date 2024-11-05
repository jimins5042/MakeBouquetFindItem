const express = require('express')
const ejs = require('ejs'); 
const router = express.Router()


//http://127.0.0.1:8000/test?name=테스트
router.get('/test', function (req, res) {
    // 쿼리 문자열에서 'name' 파라미터를 받아오기
    const name = req.query.name

    // 'test.ejs' 파일 렌더링, 'name' 파라미터를 전달
    ejs.renderFile('test.ejs', { name: name }, {}, function (err, template) {
        if (err) {
            throw err;
        } else {
            res.end(template);
        }
    });
});



module.exports = router