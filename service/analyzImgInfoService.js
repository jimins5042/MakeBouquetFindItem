const axios = require('axios');
const sharp = require('sharp');

//색을 분류하는 색상 그룹
var colorTag = [
    { "Black": [0, 0, 0] },
    { "White": [255, 255, 255] },
    { "Gray": [127, 127, 127] },
    { "Red": [255, 0, 0] },
    { "Orange": [255, 127, 0] },
    { "Yellow": [255, 255, 0] },
    { "Lime": [127, 255, 0] },
    { "Green": [0, 255, 0] },
    { "Turquoise": [0, 255, 127] },
    { "Cyan": [0, 255, 255] },
    { "Ocean": [0, 127, 255] },
    { "Blue": [0, 0, 255] },
    { "Violet": [127, 0, 255] },
    { "Magenta": [255, 0, 255] },
    { "Raspberry": [255, 0, 127] }
];

//코사인 유사도 계산시, 어떤 색상 태그를 가져오는지 확인하기 위한 map
var checkColorTage = [
    { "Black": 0 },
    { "White": 1 },
    { "Gray": 2 },
    { "Red": 3 },
    { "Orange": 4 },
    { "Yellow": 5 },
    { "Lime": 6 },
    { "Green": 7 },
    { "Turquoise": 8 },
    { "Cyan": 9 },
    { "Ocean": 10 },
    { "Blue": 11 },
    { "Violet": 12 },
    { "Magenta": 13 },
    { "Raspberry": 14 }
];

var colorArr = [
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0
];

//코사인 유사도 변환공식
function calCosineSimilarity(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        throw new Error("두 배열의 길이가 같아야 합니다.");
    }

    // 내적 계산
    let dotProduct = 0;
    for (let i = 0; i < arr1.length; i++) {
        dotProduct += arr1[i] * arr2[i];
    }

    // 크기 계산
    let magnitude1 = Math.sqrt(arr1.reduce((sum, val) => sum + val ** 2, 0));
    let magnitude2 = Math.sqrt(arr2.reduce((sum, val) => sum + val ** 2, 0));

    // 둘 다 0인 경우
    if (magnitude1 === 0 && magnitude2 === 0) {
        return 0; // 두 벡터가 모두 0이면 유사도를 0으로 반환
    }

    // 크기가 0인 경우 유사도를 0으로 반환
    if (magnitude1 === 0 || magnitude2 === 0) {
        return 0;
    }

    // 코사인 유사도 계산
    return dotProduct / (magnitude1 * magnitude2);
}


async function fetchImageBuffer(url) {
    try {
        console.log("url : ", url)
        const response = await axios.get(url, {
            responseType: 'arraybuffer' // 이미지를 Buffer 형태로 받아오기
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('이미지 다운로드 실패:', error.message);
        throw new Error('이미지를 가져올 수 없습니다.');
    }
}


function hexToBinary(hex) {
    return [...hex].map(char => parseInt(char, 16).toString(2).padStart(4, '0')).join('');
}

function hammingDistance(bin1, bin2) {
    if (bin1.length !== bin2.length) {
        throw new Error('비트 문자열의 길이가 같아야 합니다.');
    }

    let distance = 0;
    for (let i = 0; i < bin1.length; i++) {
        if (bin1[i] !== bin2[i]) {
            distance++;
        }
    }
    return distance;
}


// DCT(이산 코사인 변환) 함수
function dct2d(matrix, width, height) {
    const dct = [];
    for (let u = 0; u < width; u++) {
        dct[u] = [];
        for (let v = 0; v < height; v++) {
            let sum = 0;
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    const basis =
                        Math.cos(((2 * x + 1) * u * Math.PI) / (2 * width)) *
                        Math.cos(((2 * y + 1) * v * Math.PI) / (2 * height));
                    sum += matrix[x * width + y] * basis;
                }
            }
            const c1 = u === 0 ? 1 / Math.sqrt(2) : 1;
            const c2 = v === 0 ? 1 / Math.sqrt(2) : 1;
            dct[u][v] = (1 / Math.sqrt(width * height)) * c1 * c2 * sum;
        }
    }
    return dct.flat();
}


module.exports = {

    async dHash(url) {

        const imageBuffer = await fetchImageBuffer(url);

        const { data } = await sharp(imageBuffer)
            .resize(9, 8) // 이미지를 9x8로 축소
            .raw() // 원시 픽셀 데이터를 반환
            .toBuffer({ resolveWithObject: true });

        let hash = 0;

        /*
            RGB를 Grayscale로 변환하는 공식
            Y = 0.299R + 0.587G + 0.114B
        */
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const pixelCurrent = data[(y * 9 + x) * 3];
                const pixelNext = data[(y * 9 + (x + 1)) * 3];

                const brightnessCurrent = 0.299 * pixelCurrent +
                    0.587 * data[(y * 9 + x) * 3 + 1] +
                    0.114 * data[(y * 9 + x) * 3 + 2];
                const brightnessNext = 0.299 * pixelNext +
                    0.587 * data[(y * 9 + (x + 1)) * 3 + 1] +
                    0.114 * data[(y * 9 + (x + 1)) * 3 + 2];

                hash = (hash << 1) | (brightnessCurrent > brightnessNext ? 1 : 0);
            }
        }
        return (hash >>> 0).toString(16);
    },


    async getNearestColor(inputColor) {
        let findColor = null;
        let minDist = Number.MAX_VALUE; // 최소 거리 초기화
        let curDist = minDist;

        const mean = (inputColor[0] + inputColor[1] + inputColor[2]) / 3;
        const variance = (
            Math.pow(inputColor[0] - mean, 2) +
            Math.pow(inputColor[1] - mean, 2) +
            Math.pow(inputColor[2] - mean, 2)
        ) / 3;
        const sStdDev = Math.sqrt(variance);


        console.log("rgb 표준편차", sStdDev);


        if (sStdDev < 10) {

            if (mean < 20) {
                return Object.keys(colorTag[0]);
            }

            if (mean > 235) {
                return Object.keys(colorTag[1]);
            }

            return Object.keys(colorTag[2]);
        }

        for (const colorData of colorTag) {
            // colorData는 예: { "Red": new Color(255, 0, 0) }
            // 여기서 colorData.Value는 RGB 배열 [r, g, b]
            const colorValue = Object.values(colorData)[0]; // 색상 값 얻기 (예: [255, 0, 0])

            // 거리 계산: Euclidean distance
            curDist = Math.sqrt(
                Math.pow(inputColor[0] - colorValue[0], 2) + // Red 차이
                Math.pow(inputColor[1] - colorValue[1], 2) + // Green 차이
                Math.pow(inputColor[2] - colorValue[2], 2)   // Blue 차이
            );

            if (minDist > curDist) {
                minDist = curDist;
                findColor = Object.keys(colorData)[0]; // 색상 이름 반환 (예: "Red")
            }
        }
        console.log("색상 타입", findColor);

        return findColor;
    },

    async resizeImage2Base64(url, width, height) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer', // 이미지를 Buffer 형태로 받아오기
            });

            // 이미지를 지정된 크기로 축소한 후 webp 형식으로 변환
            const data = await sharp(response.data)
                .resize(width, height) // 이미지를 원하는 크기로 축소
                .webp({ quality: 80 }) // webp 형식으로 변환
                .toBuffer(); // 버퍼로 반환

            // Base64로 인코딩
            return data.toString('base64');

        } catch (error) {
            console.error('이미지 다운로드 실패:', error.message);
            throw new Error('이미지를 가져올 수 없습니다.');
        }
    },

    async phash_v1(imgUrl, isAWS) {

        const hashsize = 8;
        const hfreq_fact = 4;
        /*
            RGB를 Grayscale로 변환하는 공식
            Y = 0.299R + 0.587G + 0.114B
        */
        const LUMASCALE = [0.2989, 0.5870, 0.1140]; // RGB -> 그레이스케일 변환 계수
        const OCTLEN = 8; // 8비트 단위로 해시 생성
        const imgsize = hashsize * hfreq_fact; // 처리할 이미지 크기
        const midpoint = Math.floor((hashsize * hashsize) / 2); // 중간값 인덱스
        const noctets = Math.floor((hashsize * hashsize) / OCTLEN); // 해시의 총 옥텟 수

        if (isAWS == 1) {
            imgUrl = await fetchImageBuffer(imgUrl);
        }

        try {
            // 이미지를 리사이즈하고 픽셀 데이터를 추출
            const { data, info } = await sharp(imgUrl)
                .resize(imgsize, imgsize) // 이미지 크기 조정
                .raw() // 원시 픽셀 데이터 추출
                .toBuffer({ resolveWithObject: true });

            const pixels = [];
            for (let i = 0; i < data.length; i += 3) {
                // RGB 데이터를 그레이스케일 값으로 변환
                const grayscale =
                    data[i] * LUMASCALE[0] +
                    data[i + 1] * LUMASCALE[1] +
                    data[i + 2] * LUMASCALE[2];
                pixels.push(grayscale);
            }

            // DCT 수행
            const coef = dct2d(pixels, imgsize, imgsize);

            // 저주파 계수 선택 (상위 해시 크기 부분)
            const lofreqcoef = coef.filter(
                (v, idx) =>
                    Math.floor(idx / imgsize) < hashsize && (idx % imgsize) < hashsize
            );

            // 계수의 중간값 계산
            const median = lofreqcoef.slice().sort((a, b) => a - b)[midpoint];

            // 해시 생성
            const bits = new Uint8Array(noctets);
            for (let i = 0; i < noctets; i++) {
                bits[i] = lofreqcoef
                    .slice(i * OCTLEN, (i + 1) * OCTLEN) // 옥텟 단위로 처리
                    .reduce(
                        (acc, val, idx) =>
                            (acc |= (val > median ? 0x01 : 0x00) << (OCTLEN - idx - 1)),
                        0x00
                    );
            }

            // 최종 해시 문자열 반환
            return bits.reduce(
                (acc, val) => (acc += val.toString(16).padStart(2, "0")),
                ""
            );
        } catch (err) {
            throw new Error(`이미지 처리 중 오류 발생: ${err.message}`);
        }
    },

    // pHash 생성 함수
    async phash(imgUrl, isAWS) {

        console.log("imgUrl : ", imgUrl)

        if (isAWS == 1) {
            imgUrl = await fetchImageBuffer(imgUrl);
        }

        const hashSize = 16; // 해시 크기 (16x16)
        const imgSize = 64; // 이미지 크기 (64x64) - DCT를 위한 크기

        // RGB -> Grayscale 변환 계수
        const LUMASCALE = [0.2989, 0.5870, 0.1140];

        // 이미지 리사이즈 및 Grayscale 변환
        const { data, info } = await sharp(imgUrl)
            .resize(imgSize, imgSize)
            .raw() // 픽셀 데이터 추출
            .toBuffer({ resolveWithObject: true });

        // Grayscale 값 계산
        const grayscale = [];
        for (let i = 0; i < data.length; i += 3) {
            const gray =
                data[i] * LUMASCALE[0] +
                data[i + 1] * LUMASCALE[1] +
                data[i + 2] * LUMASCALE[2];
            grayscale.push(gray);
        }

        // 2D DCT 수행
        const dctCoefficients = dct2d(grayscale, imgSize, imgSize);

        // 상위 좌측 (저주파 영역) 추출
        const topCoefficients = [];
        for (let x = 0; x < hashSize; x++) {
            for (let y = 0; y < hashSize; y++) {
                topCoefficients.push(dctCoefficients[x * imgSize + y]);
            }
        }

        // 중간값 계산
        const median = topCoefficients
            .slice()
            .sort((a, b) => a - b)[Math.floor(topCoefficients.length / 2)];

        // 비트화 (중간값을 기준으로 0/1 결정)
        const hashBits = topCoefficients.map(coef => (coef > median ? 1 : 0));

        // 16진수 문자열로 변환
        const hash = [];
        for (let i = 0; i < hashBits.length; i += 8) {
            const byte = hashBits
                .slice(i, i + 8)
                .reduce((acc, bit, idx) => acc | (bit << (7 - idx)), 0);
            hash.push(byte.toString(16).padStart(2, '0'));
        }

        return hash.join('');
    },

    async calHowSimilarHash(hash1, hash2) {
        // 16진수 해시값을 2진수로 변환
        const bin1 = hexToBinary(hash1);
        const bin2 = hexToBinary(hash2);

        // Hamming Distance 계산
        const distance = hammingDistance(bin1, bin2);

        // 유사도 비율 계산 (1 - distance / total_bits)
        const similarity = 1 - distance / bin1.length;

        //console.log(`Hamming Distance: ${distance}`);
        //console.log(`Similarity Ratio: ${(similarity * 100).toFixed(2)}%`);

        return {
            //hammingDistance: distance,
            similarity
        };
    }



}
