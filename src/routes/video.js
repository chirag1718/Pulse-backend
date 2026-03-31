const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");
const upload = require("../middleware/upload");
const {
  uploadVideo,
  getVideos,
  getVideoById,
  streamVideoById,
  deleteVideo,
} = require("../controllers/videoController");

// All routes require authentication
router.use(protect);

// Upload - editors and admins only
router.post("/upload", authorize("editor", "admin"), upload.single("video"), uploadVideo);

// Get all videos
router.get("/", getVideos);

// Get single video
router.get("/:id", getVideoById);

// Stream video
router.get("/:id/stream", streamVideoById);

// Delete video - editors and admins only
router.delete("/:id", authorize("editor", "admin"), deleteVideo);

module.exports = router;