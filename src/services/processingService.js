const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");
const Video = require("../models/Video");
const { getIO } = require("../socket/socketHandler");

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

const getVideoDuration = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration || 0);
        });
    });
};

const analyzeSensitivity = (duration) => {
    // Sensitivity simulation logic:
    // Videos over 5 mins have 40% chance of being flagged
    // Videos under 5 mins have 10% chance of being flagged
    const threshold = duration > 300 ? 0.4 : 0.1;
    const score = Math.random();
    return {
        score: parseFloat(score.toFixed(2)),
        isFlagged: score < threshold,
    };
};

const emitProgress = (videoId, progress) => {
    try {
        const io = getIO();
        io.emit(`progress:${videoId}`, { progress });
    } catch (err) {
        console.error("Socket emit error:", err.message);
    }
};

const processVideo = async (videoId, filePath) => {
    try {
        // Step 1: Start
        emitProgress(videoId, 10);
        await Video.findByIdAndUpdate(videoId, {
            status: "processing",
            processingProgress: 10,
        });

        // Step 2: Get duration
        emitProgress(videoId, 30);
        const duration = await getVideoDuration(filePath);
        await Video.findByIdAndUpdate(videoId, {
            duration,
            processingProgress: 30,
        });

        // Step 3: Analyze sensitivity
        emitProgress(videoId, 60);
        await Video.findByIdAndUpdate(videoId, { processingProgress: 60 });

        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const { score, isFlagged } = analyzeSensitivity(duration);

        // Step 4: Finalize
        emitProgress(videoId, 90);
        await Video.findByIdAndUpdate(videoId, { processingProgress: 90 });

        await new Promise((resolve) => setTimeout(resolve, 500));

        // Step 5: Done
        const finalStatus = isFlagged ? "flagged" : "safe";
        await Video.findByIdAndUpdate(videoId, {
            status: finalStatus,
            sensitivityScore: score,
            processingProgress: 100,
        });

        emitProgress(videoId, 100);
        console.log(
            `Video ${videoId} processed: ${finalStatus} (score: ${score})`,
        );
    } catch (err) {
        console.error("Processing error:", err.message);
        await Video.findByIdAndUpdate(videoId, {
            status: "flagged",
            processingProgress: 0,
        });
    }
};

module.exports = { processVideo };
