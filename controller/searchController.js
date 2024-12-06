const ShopMapper = require('../db/shop/ShopMapper');
const analyzImgInfoService = require('../service/analyzImgInfoService');
const sharp = require('sharp');
const lsh = require('../service/LSH');
const SearchImageMapper = require('../db/shop/SearchImageMapper');
require('dotenv').config();

module.exports = { searchView, searchImgLogic, uploadImageBF, uploadImageLSH, uploadImageBFV1 }



async function searchView(req, res) {
    res.render('search/tempSearch', { imageUrl: null });
}


async function searchImgLogic(req, res) {

    res.render('search/imageSearch',
        {
            imageUrl: null
        })

}

//개선된 phash + 완전 탐색
async function uploadImageBF(req, res, selectVersion) {
    let start = new Date();
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    let map = new Map();
    //db에 저장된 p hash 값 리스트를 불러옴

    let items = await ShopMapper.selectHashValue();

    try {
        const rgb = JSON.parse(req.body.rgb);
        console.log("받은 색:", rgb);

        const nearestColor = await analyzImgInfoService.getNearestColor(rgb);
        console.log("색 분류:", nearestColor);

        //const hashValue = await analyzImgInfoService.dhash(req.file.buffer);

        const hashValue = await analyzImgInfoService.phash(req.file.buffer, 0);



        console.log("phash:", hashValue);

        const img_url = `/virtual/image/${Date.now()}.png`;
        console.log("Generated virtual file path:", img_url);

        //완전 탐색으로 유사도가 높은 데이터 탐색
        const itemPromises = items.map(async (item) => {
            if (!item.image_hash_code) {
                console.warn("해시 코드가 없는 항목:", item);
                return;
            }
            try {

                const value = await analyzImgInfoService.calHowSimilarHash(hashValue, item.image_hash_code);


                item.similarity = value.similarity;
                map.set(item, value);

            } catch (err) {
                console.error("유사도 계산 오류:", item, err);
            }
        });

        await Promise.all(itemPromises);

        const sortedMap = [...map.entries()].sort((a, b) => b[1].similarity - a[1].similarity);

        // 상위 8개의 항목만 가져오기
        let sort_items = sortedMap.slice(0, 10).map(entry => entry[0]); // entry[0]은 item 객체
        //console.log("values 기준으로 정렬된 Map:", sort_items);

        // 각 이미지를 비동기적으로 병렬 처리
        const sortPromises = sort_items.map(async (item) => {

            item.item_price =
                parseFloat(item.item_price)
                    .toFixed(0)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

            const base64Image = await analyzImgInfoService.resizeImage2Base64(item.image_url, 400, 350);
            item.image_url = `data:image/jpeg;base64,${base64Image}`; // Base64 문자열로 설정

            return item; // 수정된 item 객체 반환
        });

        // 모든 이미지를 병렬로 처리
        const processedItems = await Promise.all(sortPromises);

        console.log("검색 시간 : ", new Date() - start);

        res.json({ img_url, hashValue, nearestColor, items: processedItems, time: new Date() - start });


    } catch (error) {
        console.error("Error processing image:", error);
        res.status(500).send("Error processing image");
    }
}

// 개선된 phash + LSH
async function uploadImageLSH(req, res) {
    let start = new Date();
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    try {
        const rgb = JSON.parse(req.body.rgb);
        console.log("받은 색:", rgb);

        const nearestColor = await analyzImgInfoService.getNearestColor(rgb);
        console.log("색 분류:", nearestColor);

        const hashValue = await analyzImgInfoService.phash(req.file.buffer, 0);
        console.log("phash:", hashValue);

        const img_url = `/virtual/image/${Date.now()}.png`;
        console.log("Generated virtual file path:", img_url);

        const items = await lsh.searchLSH(hashValue);
        let arr = [];

        //완전 탐색으로 유사도가 높은 데이터 탐색

        for (let i = 0; i < items.length; i++) {
            arr.push(`'${items[i].itemId}'`);
        }

        let imageCandidates = await SearchImageMapper.selectItemList(arr);

        if (!Array.isArray(imageCandidates)) {
            // 객체라면 배열로 감싸기
            imageCandidates = [imageCandidates];
        }

        console.log(imageCandidates);

        // 각 이미지를 비동기적으로 병렬 처리
        const sortPromises = imageCandidates.map(async (item) => {

            item.item_price =
                parseFloat(item.item_price)
                    .toFixed(0)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

            const base64Image = await analyzImgInfoService.resizeImage2Base64(item.image_url, 400, 350);
            item.image_url = `data:image/jpeg;base64,${base64Image}`; // Base64 문자열로 설정
            return item; // 수정된 item 객체 반환
        });

        // 모든 이미지를 병렬로 처리
        const processedItems = await Promise.all(sortPromises);

        console.log("검색 시간 : ", new Date() - start);

        res.json({ img_url, hashValue, nearestColor, items: processedItems, time: new Date() - start });


    } catch (error) {
        console.error("Error processing image:", error);
        res.status(500).send("Error processing image");
    }
}

//개선전 phash + 완전 탐색
async function uploadImageBFV1(req, res) {
    let start = new Date();
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    let map = new Map();
    //db에 저장된 p hash 값 리스트를 불러옴

    let items = await ShopMapper.selectHashValueV1();



    try {
        const rgb = JSON.parse(req.body.rgb);
        console.log("받은 색:", rgb);

        const nearestColor = await analyzImgInfoService.getNearestColor(rgb);
        console.log("색 분류:", nearestColor);

        //const hashValue = await analyzImgInfoService.dhash(req.file.buffer);
        //개선 전 phash 값 불러오기
        let hashValue = await analyzImgInfoService.phash_v1(req.file.buffer, 0);



        console.log("phash:", hashValue);

        const img_url = `/virtual/image/${Date.now()}.png`;
        console.log("Generated virtual file path:", img_url);

        //완전 탐색으로 유사도가 높은 데이터 탐색
        const itemPromises = items.map(async (item) => {
            if (!item.image_hash_code) {
                console.warn("해시 코드가 없는 항목:", item);
                return;
            }
            try {

                const value = await analyzImgInfoService.calHowSimilarHash(hashValue, item.image_hash_code);


                item.similarity = value.similarity;
                map.set(item, value);

            } catch (err) {
                console.error("유사도 계산 오류:", item, err);
            }
        });

        await Promise.all(itemPromises);

        const sortedMap = [...map.entries()].sort((a, b) => b[1].similarity - a[1].similarity);

        // 상위 8개의 항목만 가져오기
        let sort_items = sortedMap.slice(0, 10).map(entry => entry[0]); // entry[0]은 item 객체
        //console.log("values 기준으로 정렬된 Map:", sort_items);

        // 각 이미지를 비동기적으로 병렬 처리
        const sortPromises = sort_items.map(async (item) => {

            item.item_price =
                parseFloat(item.item_price)
                    .toFixed(0)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

            const base64Image = await analyzImgInfoService.resizeImage2Base64(item.image_url, 400, 350);
            item.image_url = `data:image/jpeg;base64,${base64Image}`; // Base64 문자열로 설정

            return item; // 수정된 item 객체 반환
        });

        // 모든 이미지를 병렬로 처리
        const processedItems = await Promise.all(sortPromises);


        console.log("검색 시간 : ", new Date() - start);

        res.json({ img_url, hashValue, nearestColor, items: processedItems, time: new Date() - start });


    } catch (error) {
        console.error("Error processing image:", error);
        res.status(500).send("Error processing image");
    }
}

