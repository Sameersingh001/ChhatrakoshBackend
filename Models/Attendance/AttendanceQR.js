// models/AttendanceQR.js
import mongoose from "mongoose";

const AttendanceQRSchema = new mongoose.Schema({
  qrToken: { type: String, required: true, unique: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  className: { type: String, required: true },
  semester: { type: Number, required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

const AttendanceQrDB = mongoose.model("AttendanceQR", AttendanceQRSchema);

export default AttendanceQrDB
