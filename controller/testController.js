const path = require('path');
const ShopMapper = require('../db/shop/ShopMapper');
const sharp = require('sharp');
const analyzImgInfoService = require('../service/analyzImgInfoService');

async function dHash(imageBuffer) {
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
}


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


async function getNearestColor(inputColor) {
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
    console.log("표준편차 타입", typeof (sStdDev));

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

    return findColor;
}


function dct2d(mat, m, n) {
  const isqrt2 = 1 / Math.sqrt(2);
  const px = Math.PI / m;
  const py = Math.PI / n;
  const r = [];
  for (let ry = 0; ry < n; ry++) {
    for (let rx = 0; rx < m; rx++) {
      const c = Math.pow(isqrt2, (rx === 0) + (ry === 0));
      let t = 0;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < m; x++) {
          const v = mat[y * m + x];
          t += v * Math.cos(px * (x + 0.5) * rx) * Math.cos(py * (y + 0.5) * ry);
        }
      }
      r.push((c * t) / 4);
    }
  }
  return r;
}


async function phashQ(imgUrl, hashsize = 8, hfreq_fact = 4) {
  const LUMASCALE = [0.2989, 0.5870, 0.1140]; // ITU-R 601-2 luma RGB -> greyscale transform
  const OCTLEN = 8;
  const imgsize = hashsize * hfreq_fact;
  const midpoint = Math.floor((hashsize * hashsize) / 2);
  const noctets = Math.floor((hashsize * hashsize) / OCTLEN);

  try {
    // Resize image and get raw pixel data
    const { data, info } = await sharp(imgUrl)
      .resize(imgsize, imgsize)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = [];
    for (let i = 0; i < data.length; i += 3) {
      // Convert RGB to grayscale
      const grayscale =
        data[i] * LUMASCALE[0] +
        data[i + 1] * LUMASCALE[1] +
        data[i + 2] * LUMASCALE[2];
      pixels.push(grayscale);
    }

    // Perform DCT
    const coef = dct2d(pixels, imgsize, imgsize);

    // Select low-frequency coefficients
    const lofreqcoef = coef.filter(
      (v, idx) =>
        Math.floor(idx / imgsize) < hashsize && (idx % imgsize) < hashsize
    );

    // Compute median of the coefficients
    const median = lofreqcoef.slice().sort((a, b) => a - b)[midpoint];

    // Generate hash
    const bits = new Uint8Array(noctets);
    for (let i = 0; i < noctets; i++) {
      bits[i] = lofreqcoef
        .slice(i * OCTLEN, (i + 1) * OCTLEN)
        .reduce(
          (acc, val, idx) =>
            (acc |= (val > median ? 0x01 : 0x00) << (OCTLEN - idx - 1)),
          0x00
        );
    }

    return bits.reduce(
      (acc, val) => (acc += val.toString(16).padStart(2, "0")),
      ""
    );
  } catch (err) {
    throw new Error(`Error processing image: ${err.message}`);
  }
}




module.exports = {

    async upload(req, res) {

        if (!req.file) {
            return res.status(400).send('No file uploaded');
        }
 
        try {
            // 받은 색 정보 처리
            const rgb = JSON.parse(req.body.rgb);
            console.log("받은 색:", rgb);

            const nearestColor = await getNearestColor(rgb);
            console.log("색 분류:", nearestColor);

            // dHash 생성
            //const hashValue = await dHash(req.file.buffer);
            const hashValue = await phashQ(req.file.buffer);
            console.log("dHash:", hashValue);

            // 가상의 URL 생성 (실제 저장 없이)
            const img_url = `/virtual/image/${Date.now()}.png`;
            console.log("Generated virtual file path:", img_url);

            res.json({ img_url, hashValue, nearestColor });

        } catch (error) {
            console.error("Error processing image:", error);
            res.status(500).send("Error processing image");
        }


    },

    async updatePhash(req, res){
        let items = await ShopMapper.selectHashValue();

        const itemPromises = items.map(async (item) => {
            if (!item.image_hash_code) {
                console.warn("해시 코드가 없는 항목:", item);
                return;
            }
            try {
                const value = await analyzImgInfoService.phash(item.image_url, 1);
                
                ShopMapper.updatePhash(value, item.image_url);
                //map.set(item.image_hash_code, value);
            } catch (err) {
                console.error("유사도 계산 오류:", item, err);
            }
        });

        await Promise.all(itemPromises);
        console.log("업댓 끝")
    }
}
