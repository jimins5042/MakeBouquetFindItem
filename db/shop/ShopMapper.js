const db = require('../../db/db');


/*
CREATE TABLE shop_board (
    item_id INT AUTO_INCREMENT PRIMARY KEY,       -- 글 고유 ID (자동 증가)
    item_title VARCHAR(255) NOT NULL,             -- 글 제목
    item_content TEXT NOT NULL,                   -- 글 내용
    item_date DATETIME DEFAULT CURRENT_TIMESTAMP, -- 작성일자 (기본값: 현재 시간)
    item_price DECIMAL(10, 2) DEFAULT 0.00,       -- 아이템 가격
    item_image_link VARCHAR(500)                  -- 이미지 링크 (최대 500자)
);

CREATE TABLE image_info (
    image_id INT AUTO_INCREMENT PRIMARY KEY, -- 기본 키 (자동 증가)
    image_uuid VARCHAR(255) NOT NULL UNIQUE, -- UUID (고유 값)
    image_original_name VARCHAR(255) NOT NULL, -- 원래 파일 이름
    image_url TEXT NOT NULL, -- S3 이미지 URL
    image_hash_code VARCHAR(64) NOT NULL, -- 개선된 pHash를 통한 이미지 해시 값
    image_phash_v1 VARCHAR(64) NULL, -- pHash를 통한 이미지 해시 값
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 생성 시간
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- 갱신 시간
);

CREATE TABLE image_color_tag (
    image_color_id INT AUTO_INCREMENT PRIMARY KEY, -- 기본 키 (자동 증가)
    image_color_uuid VARCHAR(255) NOT NULL, -- UUID (고유 값)
    color_tag VARCHAR(255) NOT NULL -- UUID (고유 값)
);
*/

module.exports = {
    selectHashValueV1, selectHashValue, showItem, selectThumnailAll, countAllItems, selectAll,
    insertColorTag, insertImageInfo, insertItem,
    updatePhash, deleteItem
}

function selectAll(page, n) {
    return new Promise((resolve, reject) => {
        db.query(
            `SELECT item_id, item_title, item_date FROM shop_board order by item_id desc limit ${(page - 1) * n} , ${n};`, (err, results) => {
                if (err) {
                    return reject(err);
                }
                resolve(results); // 쿼리 결과를 resolve로 전달
            });
    });
}

function countAllItems() {
    return new Promise((resolve, reject) => {
        db.query(
            `SELECT COUNT(*) AS total FROM shop_board`, // 'AS total'로 별칭 지정
            (err, results) => {
                if (err) {
                    return reject(err); // 오류 발생 시 reject
                }

                console.log(results)
                resolve(results[0].total); // 결과의 첫 번째 항목에서 total 값을 반환
            }
        );
    });
}


function selectThumnailAll(page, n) {

    return new Promise((resolve, reject) => {
        db.query(
            `SELECT 
                    s.item_id, s.item_title, s.item_price, i.image_url 
                FROM 
                    shop_board as s
                LEFT JOIN 
                    image_info AS i
                ON 
                    s.item_image_link = i.image_uuid
                where 
                    s.item_image_link is not null                
                limit ${(page - 1) * n} , ${n};
                `, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results); // 쿼리 결과를 resolve로 전달
        });
    });
}
function showItem(item_id) {
    return new Promise((resolve, reject) => {

        let sql = `
                SELECT 
                    s.item_id,
                    s.item_title, 
                    s.item_content, 
                    s.item_date, 
                    s.item_price, 
                    i.image_url,
                    i.image_hash_code
                FROM 
                    shop_board AS s
                LEFT JOIN 
                    image_info AS i
                ON 
                    s.item_image_link = i.image_uuid
                WHERE 
                    s.item_id = ${item_id};
                `

        db.query(sql, (err, results) => {

            if (err) {
                return reject(err);
            }
            resolve(results); // 쿼리 결과를 resolve로 전달
        });
    });
}

function insertItem(data) {

    console.log(data);

    return new Promise((resolve, reject) => {
        let sql = `INSERT INTO shop_board (item_title, item_content, item_price, item_image_link) 
                VALUES ('${data.title}', '${data.content}', ${data.price}, '${data.image}')`

        if (data.image == null) {
            sql = `INSERT INTO shop_board (item_title, item_content, item_price) 
                VALUES ('${data.title}', '${data.content}', ${data.price})`
        }

        db.query(
            sql, (err, results) => {
                if (err) {
                    return reject(err);
                }

                resolve(results.insertId); // insert 후 자동으로 생성된 item_id 값 반환
            });
    });
}

function insertImageInfo(data) {
    return new Promise((resolve, reject) => {
        let sql =
            `INSERT INTO 
                image_info (image_uuid, image_original_name, image_url, image_hash_code) 
                VALUES 
                ('${data.imageUuid}', '${data.imageOriginalName}', '${data.imageUrl}', '${data.imageHashCode}')`

        db.query(
            sql, (err, results) => {
                if (err) {
                    return reject(err);
                }

                resolve(results.insertId); // insert 후 자동으로 생성된 item_id 값 반환
            });
    });
}

function insertColorTag(uuid, tag) {
    return new Promise((resolve, reject) => {
        let sql =
            `INSERT IGNORE INTO 
                image_color_tag (image_color_uuid, color_tag) 
                VALUES 
                ('${uuid}', '${tag}')`

        db.query(
            sql, (err, results) => {
                if (err) {
                    return reject(err);
                }

                resolve(results); // insert 후 자동으로 생성된 item_id 값 반환
            });
    });
}

function deleteItem(item_id) {
    return new Promise((resolve, reject) => {
        const sql = `
            DELETE s, i, c
            FROM shop_board AS s
            LEFT JOIN image_info AS i 
                ON s.item_image_link = i.image_uuid
            LEFT JOIN image_color_tag AS c 
                ON s.item_image_link = c.image_color_uuid
            WHERE s.item_id = ?;
        `;
        
        db.query(sql, [item_id], (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results); // 삭제 결과 반환
        });
    });
}


function selectHashValue() {

    return new Promise((resolve, reject) => {
        db.query(


            `SELECT 
                    s.item_id, s.item_title, s.item_price, i.image_url ,i.image_hash_code
                FROM 
                    shop_board as s
                LEFT JOIN 
                    image_info AS i
                ON 
                    s.item_image_link = i.image_uuid
                where 
                    s.item_image_link is not null
                `, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results); // 쿼리 결과를 resolve로 전달
        });
    });
}

function selectHashValueV1() {

    return new Promise((resolve, reject) => {
        db.query(


            `SELECT 
                    s.item_id, s.item_title, s.item_price, i.image_url, i.image_phash_v1 as image_hash_code
                FROM 
                    shop_board as s
                LEFT JOIN 
                    image_info AS i
                ON 
                    s.item_image_link = i.image_uuid
                where 
                    s.item_image_link is not null
                `, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results); // 쿼리 결과를 resolve로 전달
        });
    });
}

function updatePhash(hash, url) {
    return new Promise((resolve, reject) => {
        let sql =
            //`update image_info set image_hash_code = '${hash}'
            `update image_info set image_phash_v1 = '${hash}'
                where image_uuid = '${url}'`


        db.query(
            sql, (err, results) => {
                if (err) {
                    return reject(err);
                }

                resolve(results); // insert 후 자동으로 생성된 item_id 값 반환
            });
    });
}
