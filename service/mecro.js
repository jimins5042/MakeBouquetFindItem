const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const ColorThief = require("colorthief");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid"); // uuid의 v4를 직접 가져와 사용
const ShopMapper = require('../db/shop/ShopMapper');
const analyzImgInfoService = require('../service/analyzImgInfoService');
const SearchImageMapper = require("../db/shop/SearchImageMapper");

require("dotenv").config();


const uuid = () => {
    const tokens = uuidv4().split("-");
    return tokens[2] + tokens[1] + tokens[0] + tokens[3] + tokens[4];
};

const s3 = new S3Client({
    region: process.env.aws_s3_region,
    credentials: {
        accessKeyId: process.env.aws_s3_accessKey,
        secretAccessKey: process.env.aws_s3_secretKey,
    },
});

// 절대 경로를 바로 사용
const localImageDir = "";

const serverEndpoint = "http://127.0.0.1:8000/shop/addItem"; // Express 서버의 insertItem 엔드포인트

// S3 업로드 함수
async function uploadToS3(filePath) {
    const fileContent = fs.readFileSync(filePath);
    const fileName = `contents/${uuid()}`; // UUID로 고유한 파일 이름 생성

    const params = {
        Bucket: process.env.aws_s3_bucket, // S3 버킷 이름
        Key: fileName, // S3에 저장될 파일 경로
        Body: fileContent, // 파일 내용
        ContentType: "image/jpeg", // MIME 타입
    };

    const command = new PutObjectCommand(params);
    const uploadResult = await s3.send(command);
    console.log(`Uploaded to S3: https://${process.env.aws_s3_bucket}.s3.${process.env.aws_s3_region}.amazonaws.com/${fileName}`);
    return fileName; // 업로드된 S3 URL 반환
}

// 매크로 처리 함수
async function processImages() {
    const files = fs.readdirSync(localImageDir).filter((file) => file.match(/\.(jpg|jpeg|png)$/i));

    for (const file of files) {
        const filePath = path.join(localImageDir, file);
        console.log(`Processing file: ${filePath}`);

        // S3에 이미지 업로드
        const imageUuid = await uploadToS3(filePath);
        console.log(`Uploaded to S3: ${imageUuid}`);

        // pHash 생성
        const phash = await analyzImgInfoService.phash(`${process.env.cloudfront}${imageUuid}`, 1);
        console.log(`Generated pHash: ${phash}`);

        // 색상 데이터 추출
        const paletteArray = await ColorThief.getPalette(filePath, 5); // 로컬 이미지 파일에서 상위 5개 색상 추출
        console.log(`Extracted color palette: ${paletteArray}`);

        // 이미지 데이터 DB에 저장
        const imageData = {
            imageUuid: imageUuid,
            imageOriginalName: file,
            imageUrl: `${process.env.cloudfront}${imageUuid}`,
            imageHashCode: phash,
            imageColorGroup: null,
        };

        const img_id = await ShopMapper.insertImageInfo(imageData);
        console.log(`Image data inserted with ID: ${img_id}`);

        // 색상 태그 처리
        const colortag = new Set();
        for (const color of paletteArray) {
            const nearestColor = await analyzImgInfoService.getNearestColor(color);
            colortag.add(nearestColor);
        }

        // 색상 태그 DB에 저장
        for (const tag of colortag) {
            await ShopMapper.insertColorTag(imageUuid, tag);
            console.log(`Inserted color tag: ${tag}`);
        }

        // 아이템 데이터 DB에 저장
        const insertItemData = {
            title: `Sample Item - ${file}`,
            content: `Description for ${file}`,
            price: img_id * 1000, // Example: Calculate price based on image ID
            image: imageUuid,
        };

        const item_id = await ShopMapper.insertItem(insertItemData);
        console.log(`Item data inserted with ID: ${item_id}`);
    }
}

async function processAndUpdateHashesParallel() {
    try {
        // 1. 모든 이미지 해시 데이터를 가져옵니다.
        const list = await SearchImageMapper.selectAllImageHash();

        // 2. 병렬로 pHash 생성 및 업데이트 수행
        const promises = list.map(async (item) => {
            const hash = await analyzImgInfoService.phash_v1(`${process.env.cloudfront}${item.image_uuid}`, 1)
            await ShopMapper.updatePhash(hash, item.image_uuid);
        });

        // 3. 모든 작업이 완료될 때까지 대기
        await Promise.all(promises);

        console.log("모든 pHash 업데이트 완료!");

    } catch (error) {
        console.error("병렬 처리 중 오류 발생:", error);
    }
}

// 병렬 처리 함수 실행
//processAndUpdateHashesParallel();



// 매크로 실행
/*
processImages()
    .then(() => console.log("All images processed successfully."))
    .catch((err) => console.error("Error processing images:", err));
*/
