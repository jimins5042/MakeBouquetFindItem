const mysql = require('mysql2');
require('dotenv').config();


const connection = mysql.createConnection({
    host: process.env.db_url,
    port: process.env.db_port,
    user: process.env.db_username,
    password: process.env.db_password,
    database: process.env.db_name
});

connection.connect(function (err) {
    if (err) throw err;
    console.log('DB ====> CONNECTED');
});

module.exports = connection;