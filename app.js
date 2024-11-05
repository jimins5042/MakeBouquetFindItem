const express = require('express');

const app = express();
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const port = 8000;

app.set('views', path.join(__dirname, 'views')); // views 폴더 경로 설정
app.set('view engine', 'ejs'); // EJS를 기본 템플릿 엔진으로 설정
app.use('/public', express.static('public'));

//app.use('/route', require('./routes/test'))

// routes 폴더의 모든 파일을 읽어와서 등록
fs.readdirSync(path.join(__dirname, 'routes')).forEach((file) => {
    const route = require(`./routes/${file}`);
    const routePath = `/route/${file.replace('.js', '')}`; // 파일 이름을 경로로 사용
    app.use(routePath, route);
});


// Render index.ejs file
app.get('/', function (req, res) {
    res.render('index'); // .ejs 확장자는 생략
});


// Server setup
app.listen(port, function (error) {
    if (error)
        throw error;
    else
        console.log(`Server is running at http://127.0.0.1:${port}/`);

});



