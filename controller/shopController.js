const ShopMapper = require('../db/shop/ShopMapper');
const analyzImgInfoService = require('../service/analyzImgInfoService');
const lsh = require('../service/LSH');
require('dotenv').config();

module.exports = { itemList, itemThumnailList, showItem, viewInsertItem, insertItem, deleteItem }

async function itemList(req, res) {
    let page = parseInt(req.query.page) || 1; // 현재 페이지
    const itemNum = 10; // 페이지당 아이템 수

    try {
        // 전체 아이템 수 가져오기
        const totalItems = await ShopMapper.countAllItems();
        const totalPages = Math.ceil(totalItems / itemNum); // 전체 페이지 수

        // 현재 페이지 그룹 계산 (10개 단위 그룹)
        const pageGroup = Math.ceil(page / 10);
        const startPage = (pageGroup - 1) * 10 + 1; // 그룹의 시작 페이지
        const endPage = pageGroup * 10; // 그룹의 끝 페이지

        // 현재 페이지에 해당하는 아이템 가져오기
        const items = await ShopMapper.selectAll(page, itemNum);

        // EJS로 데이터 전달
        res.render('shop/itemList', {
            items,
            page,
            totalPages,
            startPage,
            endPage,
            pageGroup,
        });
    } catch (error) {
        console.error("Error fetching items:", error);
        res.status(500).send("Internal Server Error");
    }
}


async function itemThumnailList(req, res) {

    let page = parseInt(req.query.page) || 1;
    let itemNum = 8;

    // DB에서 전체 아이템 수 가져오기
    let totalItems = await ShopMapper.countAllItems(); // 전체 아이템 수를 반환하는 쿼리 작성 필요
    let totalPages = Math.ceil(totalItems / itemNum); // 전체 페이지 수 계산
    const pageGroup = Math.ceil(page / 10);
    const startPage = (pageGroup - 1) * 10 + 1; // 그룹의 시작 페이지
    const endPage = pageGroup * 10; // 그룹의 끝 페이지

    try {
        let items = await ShopMapper.selectThumnailAll(page, itemNum);

        // 각 이미지를 비동기적으로 병렬 처리
        const itemPromises = items.map(async (item) => {

            item.item_price =
                parseFloat(item.item_price)
                    .toFixed(0)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

            const base64Image = await analyzImgInfoService.resizeImage2Base64(item.image_url, 400, 350);
            item.image_url = `data:image/jpeg;base64,${base64Image}`; // Base64 문자열로 설정
            return item; // 수정된 item 객체 반환
        });

        // 모든 이미지를 병렬로 처리
        const processedItems = await Promise.all(itemPromises);

        res.render('shop/itemMain',
            {
                items: processedItems,
                page,
                itemNum,
                totalPages,
                startPage,
                endPage,
                pageGroup
            }
        );

    } catch (error) {
        console.error('Error fetching image:', error.message);
        res.status(500).send('이미지를 가져오는 데 실패했습니다.');
    }
}

async function showItem(req, res) {
    let item_id = req.params?.id;
    let item = await ShopMapper.showItem(item_id);

    item[0].item_price =
        parseFloat(item[0].item_price)
            .toFixed(0)
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    if (item[0].image_url) {

        const base64Image = await analyzImgInfoService.resizeImage2Base64(item[0].image_url, 400, 300);
        item[0].image_url = `data:image/jpeg;base64,${base64Image}`; // Base64 문자열로 설정

    }
    //console.log(item);
    res.render('shop/showItem', { item: item[0] }); // .ejs 확장자는 생략
}

function viewInsertItem(req, res) {
    res.render('shop/insertItem');
}


async function insertItem(req, res) {
    console.log(req.body); // 폼 데이터 확인
    console.log(req.file); // 업로드된 파일 확인
    console.log("색상 : ", req.body.palette);

    const { item_title, item_content, item_price } = req.body;
    let imageUuid = null;
    let img_id;
    let hashValue = null;

    if (req.file) {
        imageUuid = req.file.key
        console.log(`${process.env.cloudfront}${imageUuid}`);

        hashValue = await analyzImgInfoService.phash(`${process.env.cloudfront}${imageUuid}`, 1)

        let imageData = {
            imageUuid: imageUuid,
            imageOriginalName: req.file.originalname,
            imageUrl: `${process.env.cloudfront}${imageUuid}`,
            imageHashCode: hashValue,
            imageColorGroup: null
        }

        img_id = await ShopMapper.insertImageInfo(imageData);

    }
    const colortag = new Set();
    if (imageUuid != null && req.body.palette) {

        const paletteArray = JSON.parse(req.body.palette); // ['#e4e0da', '#335a1d', '#b5a488', '#8fa450', '#9e3c3f']
        console.log("Parsed palette:", paletteArray);

        // 각 색상을 처리
        for (const color of paletteArray) {
            console.log("Processing color:", color);
            const nearestColor = await analyzImgInfoService.getNearestColor(color);
            colortag.add(nearestColor);
        }

        // colortag의 값을 DB에 저장
        for (const tag of colortag) {
            await ShopMapper.insertColorTag(imageUuid, tag);
        }
    }


    let insertItemData = {
        title: item_title,
        content: item_content,
        price: item_price,
        image: imageUuid,
    };

    lsh.addToLSH(imageUuid, hashValue); //LSH 리스트에 값을 추가
    let item_id = await ShopMapper.insertItem(insertItemData);

    res.redirect(`/shop/items/${item_id}`);
}


async function deleteItem(req, res) {
    let item_id = req.params?.id;


    ShopMapper.deleteItem(item_id);
//    lsh.removeFromLSH(imageUuid, hashValue); //LSH 리스트에서 값을 제거
    res.redirect(`/shop/itemList`);
}

