const path = require("path");
const Video = require("../models/Video");
const { processVideo } = require("../services/processingService");
const { streamVideo } = require("../services/streamingService");

// POST /api/videos/upload
const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No video file provided" });
    }

    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const video = await Video.create({
      title,
      description: description || "",
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.id,
      tenantId: req.user.tenantId,
    });

    // Process video in background (don't await)
    processVideo(video._id, req.file.path);

    res.status(201).json({
      message: "Video uploaded successfully, processing started",
      video,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/videos
const getVideos = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = { tenantId: req.user.tenantId };
    if (status) filter.status = status;

    // Admins see all videos in tenant, others see only their own
    if (req.user.role !== "admin") {
      filter.uploadedBy = req.user.id;
    }

    const videos = await Video.find(filter)
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/videos/:id
const getVideoById = async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    }).populate("uploadedBy", "name email");

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.json(video);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/videos/:id/stream
const streamVideoById = async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    if (video.status !== "safe") {
      return res.status(403).json({ message: "Video is not available for streaming" });
    }

    streamVideo(req, res, video.filename);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/videos/:id
const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const fs = require("fs");
    const filePath = path.join(__dirname, "../../uploads", video.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await video.deleteOne();

    res.json({ message: "Video deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  uploadVideo,
  getVideos,
  getVideoById,
  streamVideoById,
  deleteVideo,
};