const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const cors = require("cors");

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

/* -------------------------
   SIMPLE IN-MEMORY QUEUE
--------------------------*/
let videoQueue = [];

/* -------------------------
   UPLOAD ENDPOINT
--------------------------*/
app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const file = req.file;
    const username = req.body.username || "anon";

    const key = `videos/${Date.now()}_${username}.webm`;

    await s3.putObject({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: "video/webm"
    }).promise();

    // store locally (no S3 listing required)
    videoQueue.push(key);

    res.json({ success: true, key });

  } catch (err) {
    console.log(err);
    res.status(500).send("Upload failed");
  }
});

/* -------------------------
   LIST VIDEOS (NO S3 LISTING)
--------------------------*/
app.get("/videos", (req, res) => {
  const files = videoQueue
    .slice()
    .reverse()
    .map(key => {
      return `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    });

  res.json(files);
});

/* -------------------------
   START SERVER
--------------------------*/
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
