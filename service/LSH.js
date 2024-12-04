const crypto = require('crypto');
const express = require('express');
const app = express();
app.use(express.json());
const SearchMapper = require('../db/shop/SearchImageMapper');

// LSH 버킷 저장소
const lshBuckets = new Map();

//버킷 수
const numBuckets = 30;

// Hamming Distance 계산
function calculateHammingDistance(hash1, hash2) {
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) distance++;
    }
    return distance;
}

function addToLSH(itemId, hashValue) {
    for (let i = 0; i < numBuckets; i++) {
        const bucketKey = crypto.createHash('md5').update(`${i}_${hashValue}`).digest('hex').substring(0, 8);
        if (!lshBuckets.has(bucketKey)) {
            lshBuckets.set(bucketKey, []);
        }
        lshBuckets.get(bucketKey).push({ itemId, hashValue });
    }
}

module.exports = {
    // LSH 버킷 초기화
    async initializeLSH() {
        console.log("LSH 초기화 시작...");
        const items = await SearchMapper.selectAllImageHash(); // DB에서 데이터 가져오기
        items.forEach(item => addToLSH(item.image_uuid, item.image_hash_code)); // 데이터 추가
        console.log("LSH 초기화 완료!");
    },

    // LSH 검색
    async searchLSH(hashValue) {
        const results = [];
        for (let i = 0; i < numBuckets; i++) {
            const bucketKey = crypto.createHash('md5').update(`${i}_${hashValue}`).digest('hex').substring(0, 8);
            if (lshBuckets.has(bucketKey)) {
                results.push(...lshBuckets.get(bucketKey));
            }
        }

        // Hamming Distance로 정확도 향상
        const candidates = results.map(item => ({
            ...item,
            hammingDistance: calculateHammingDistance(item.hashValue, hashValue)
        }));

        // 거리 기준으로 정렬 후 상위 10개 반환
        /*
            {
                itemId: "item_123",            // 데이터의 고유 식별자
                hashValue: "1010101010101010", // 데이터의 해시 값
                hammingDistance: 3             // 입력된 해시 값과의 Hamming Distance
            }
        */
        return candidates.sort((a, b) => a.hammingDistance - b.hammingDistance).slice(0, 10);
    },

    // 해시 값을 기반으로 LSH 버킷에 데이터 추가
    addToLSH(itemId, hashValue) {
        for (let i = 0; i < numBuckets; i++) {
            const bucketKey = crypto.createHash('md5').update(`${i}_${hashValue}`).digest('hex').substring(0, 8);
            if (!lshBuckets.has(bucketKey)) {
                lshBuckets.set(bucketKey, []);
            }
            lshBuckets.get(bucketKey).push({ itemId, hashValue });
        }
    },

    removeFromLSH(itemId, hashValue) {
        for (let i = 0; i < numBuckets; i++) {
            const bucketKey = crypto.createHash('md5').update(`${i}_${hashValue}`).digest('hex').substring(0, 8);
            if (lshBuckets.has(bucketKey)) {
                const bucket = lshBuckets.get(bucketKey);
                const index = bucket.findIndex(item => item.itemId === itemId);
                if (index !== -1) {
                    bucket.splice(index, 1); // 데이터 제거
                    if (bucket.length === 0) {
                        lshBuckets.delete(bucketKey); // 비어 있는 버킷 제거
                    }
                }
            }
        }
    }

}






// 검색 API
app.post('/search-hash', (req, res) => {
    const { hashValue } = req.body;
    const similarItems = searchLSH(hashValue);
    res.json({ similarItems });
});

//해시값 추가
app.post('/add-hash', (req, res) => {
    const { itemId, hashValue } = req.body;
    addToLSH(itemId, hashValue);
    res.status(200).send('Hash added successfully');
});



//해시값 제거
app.post('/remove-hash', (req, res) => {
    const { itemId, hashValue } = req.body;
    removeFromLSH(itemId, hashValue);
    res.status(200).send('Hash removed successfully');
});
