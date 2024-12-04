const db = require('../../db/db');

module.exports = {
    selectAll() {
        return new Promise((resolve, reject) => {
            db.query(`SELECT package_imageLink FROM bouquet_package_select`, (err, results) => {
                if (err) {
                    return reject(err);
                }
                const images = results.map(row => row.package_imageLink); // 배열로 추출
                resolve(images);
            });
        });
    }
};
