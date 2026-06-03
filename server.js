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
   UPLOAD VIDEO
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

    res.json({ success: true, key });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

/* -------------------------
   SIGNED URL HELPER
--------------------------*/
function getSignedUrl(key) {
  return s3.getSignedUrl("getObject", {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Expires: 60 * 60 // 1 hour valid link
  });
}

/* -------------------------
   LIST VIDEOS (FIXED)
   RETURNS PLAYABLE URLS
--------------------------*/
app.get("/videos", async (req, res) => {
  try {
    const data = await s3.listObjectsV2({
      Bucket: process.env.S3_BUCKET,
      Prefix: "videos/"
    }).promise();

    const files = (data.Contents || [])
      .sort((a, b) => new Date(a.LastModified) - new Date(b.LastModified))
      .map(item => {
        return getSignedUrl(item.Key);
      });

    res.json(files);

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to list videos" });
  }
});

/* -------------------------
   START SERVER
--------------------------*/
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
