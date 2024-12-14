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


module.exports = { selectAllImageHash, selectItemList }


function selectAllImageHash() {
    return new Promise((resolve, reject) => {

        let sql = 'select image_uuid, image_hash_code from image_info'
        db.query(
            sql, (err, results) => {
                if (err) {
                    return reject(err);
                }
                resolve(results); // 쿼리 결과를 resolve로 전달
            });
    });
}

function selectItemList(items) {
    return new Promise((resolve, reject) => {


        const sql = `
            SELECT 
                s.item_id, s.item_title, s.item_price, i.image_url ,i.image_hash_code
            FROM 
                shop_board as s
            LEFT JOIN 
                image_info AS i
            ON 
                s.item_image_link = i.image_uuid
            where 
                i.image_uuid in (${items.join(',')});
            `
        console.log("sql", sql)
        db.query(
            sql, (err, results) => {
                if (err) {
                    return reject(err);
                }
                
                resolve(results); // 쿼리 결과를 resolve로 전달
            });

    });

}
/*
    const ids = [1, 2, 3]; // 원하는 id 리스트
    
*/

