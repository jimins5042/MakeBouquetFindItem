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

// SimHash 계산
function calculateSimHash(data) {
    const vector = Array(128).fill(0);
    const tokens = data.split(' '); // 데이터를 공백 기준으로 나눔

    tokens.forEach(token => {
        const hash = crypto.createHash('md5').update(token).digest('hex');
        const binaryHash = BigInt(`0x${hash}`).toString(2).padStart(128, '0');

        for (let i = 0; i < 128; i++) {
            vector[i] += binaryHash[i] === '1' ? 1 : -1;
        }
    });

    return vector.map(v => (v > 0 ? '1' : '0')).join('');
}

function addToLSHbymd5(itemId, hashValue) {
    for (let i = 0; i < numBuckets; i++) {
        const bucketKey = crypto.createHash('md5').update(`${i}_${hashValue}`).digest('hex').substring(0, 8);
        if (!lshBuckets.has(bucketKey)) {
            lshBuckets.set(bucketKey, []);
        }
        lshBuckets.get(bucketKey).push({ itemId, hashValue });
    }
}

// LSH 버킷에 데이터 추가
function addToLSH(itemId, data) {
    const hashValue = calculateSimHash(data);
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
    async searchLSHv1(hashValue) {
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
        return candidates.sort((a, b) => a.hammingDistance - b.hammingDistance).slice(0, 30);
    },

    // LSH 검색 2.0 - Set 자료형을 이용하여 탐색값에서 중복 제거
    async searchLSHv2(hashValue) {
        let resultsMap = new Map();
        for (let i = 0; i < numBuckets; i++) {
            const bucketKey = crypto.createHash('md5').update(`${i}_${hashValue}`).digest('hex').substring(0, 8);
            if (lshBuckets.has(bucketKey)) {

                lshBuckets.get(bucketKey).forEach(item => {
                    if (!resultsMap.has(item.itemId)) {
                        resultsMap.set(item.itemId, item);
                    }
                });
            }
        }
        const uniqueResults = Array.from(resultsMap.values());

        // Hamming Distance 계산
        const candidates = uniqueResults.map(item => ({
            ...item,
            hammingDistance: calculateHammingDistance(item.hashValue, hashValue)
        }));

        // 거리 기준으로 정렬 후 상위 10개 반환
        //return candidates.sort((a, b) => a.hammingDistance - b.hammingDistance).slice(0, 10);
        return candidates.sort((a, b) => a.hammingDistance - b.hammingDistance);
    },
    async searchLSH(data) {
        const hashValue = calculateSimHash(data); // 입력 데이터를 SimHash로 변환
        const results = []; // 결과 데이터를 저장할 배열

        for (let i = 0; i < numBuckets; i++) {
            const bucketKey = crypto.createHash('md5').update(`${i}_${hashValue}`).digest('hex').substring(0, 8);
            const bucketData = lshBuckets.get(bucketKey); // 버킷 데이터 가져오기
            if (bucketData) {
                console.log(`Matching Bucket Key: ${bucketKey}, Data:`, bucketData);
                results.push(...bucketData); // 일치하는 버킷의 모든 데이터 추가
            }
        }

        // 중복 제거 없이 결과 반환
        return results;
    }
    ,

    addToLSH(itemId, data) {
        const hashValue = calculateSimHash(data);
        for (let i = 0; i < numBuckets; i++) {
            const bucketKey = crypto.createHash('md5').update(`${i}_${hashValue}`).digest('hex').substring(0, 8);
            if (!lshBuckets.has(bucketKey)) {
                lshBuckets.set(bucketKey, []);
            }
            lshBuckets.get(bucketKey).push({ itemId, hashValue });
        }
    },


    // 해시 값을 기반으로 LSH 버킷에 데이터 추가
    addToLSHbymd5(itemId, hashValue) {
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


//module.exports = { initializeLSH, searchLSH, addToLSH, removeFromLSH };