const multer = require('multer');

const multer_s3 = require('multer-s3');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require('uuid'); // uuid의 v4를 직접 가져와 사용

require('dotenv').config();


const uuid = () => {
    const tokens = uuidv4().split('-')
    return tokens[2] + tokens[1] + tokens[0] + tokens[3] + tokens[4];
}

const s3Client = new S3Client({
    region: process.env.aws_s3_region,
    credentials: {
        accessKeyId: process.env.aws_s3_accessKey,
        secretAccessKey: process.env.aws_s3_secretKey
    }
});

const storage = multer_s3({
    s3: s3Client,
    bucket: process.env.aws_s3_bucket,
    contentType: multer_s3.AUTO_CONTENT_TYPE,


    key: function (req, file, cb) {
        cb(null, `contents/${uuid()}`); // UUID 사용
    }
});


module.exports =
{
    upload() {
        return storage;
    }
}

