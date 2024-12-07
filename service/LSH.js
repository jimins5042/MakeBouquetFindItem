const crypto = require('crypto');
const express = require('express');
const app = express();
app.use(express.json());
const SearchMapper = require('../db/shop/SearchImageMapper');

// LSH 버킷 저장소
const lshBuckets = new Map();

// 버킷 수
let numBuckets = 30; // 기본값

// Hamming Distance 계산
function calculateHammingDistance(hash1, hash2) {
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) distance++;
    }
    
    return 1 - distance / hexToBinary(hash1).length;
    //return distance;
}

function hexToBinary(hex) {
    return [...hex].map(char => parseInt(char, 16).toString(2).padStart(4, '0')).join('');
}

function printBucketDistribution() {
    lshBuckets.forEach((data, bucketKey) => {
        console.log(`Bucket ${bucketKey} contains ${data.length} items`);
    });
}

function generateBucketKey(hashValue, bucketIndex) {
    const hashSegments = hashValue.match(/.{1,4}/g); // 해시 값을 4자리씩 분할
    const segmentIndex = bucketIndex % hashSegments.length;
    return `${bucketIndex}_${hashSegments[segmentIndex]}`; // 고유 키 생성
    //return `${hashSegments[segmentIndex]}`; // 고유 키 생성
}

module.exports = {
    // LSH 버킷 초기화
    async initializeLSH() {
        console.log("LSH 초기화 시작...");
        const items = await SearchMapper.selectAllImageHash(); // DB에서 데이터 가져오기
        numBuckets = Math.min(256, Math.ceil(items.length / 10)); // 버킷 수 동적 설정
        items.forEach(item => this.addToLSH(item.image_uuid, item.image_hash_code)); // 데이터 추가
        console.log("LSH 초기화 완료!");
        //printBucketDistribution();
    },

    // LSH 검색
    async searchLSH(hashValue) {
        let resultsMap = new Map();

        for (let i = 0; i < numBuckets; i++) {
            const bucketKey = generateBucketKey(hashValue, i); // 개선된 버킷 키 생성 방식

            if (lshBuckets.has(bucketKey)) {
                lshBuckets.get(bucketKey).forEach(item => {
                    if (!resultsMap.has(item.itemId)) {
                        console.log("Matching Bucket Data:", lshBuckets.get(bucketKey));
                        resultsMap.set(item.itemId, item);
                    }
                });
            }
        }
        const uniqueResults = Array.from(resultsMap.values());

        // Hamming Distance 계산
        const candidates = uniqueResults.map(item => ({
            ...item,
            similarity: calculateHammingDistance(item.hashValue, hashValue)
        }));

        // 거리 기준으로 정렬 후 반환
        return candidates;
    },

    // LSH 버킷에 데이터 추가
    addToLSH(itemId, hashValue) {
        for (let i = 0; i < numBuckets; i++) {
            const bucketKey = generateBucketKey(hashValue, i); // 개선된 버킷 키 생성 방식
            if (!lshBuckets.has(bucketKey)) {
                lshBuckets.set(bucketKey, []);
            }
            // 중복 데이터 확인 후 추가
            if (!lshBuckets.get(bucketKey).some(item => item.itemId === itemId)) {
                lshBuckets.get(bucketKey).push({ itemId, hashValue });
            }
        }
    },

    removeFromLSH(itemId, hashValue) {
        for (let i = 0; i < numBuckets; i++) {
            const bucketKey = generateBucketKey(hashValue, i); // 개선된 버킷 키 생성 방식
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
};
