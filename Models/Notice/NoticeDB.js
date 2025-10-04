import mongoose from "mongoose";

const NoticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  link: {
    type: String, // Optional link
    trim: true,
  },
  role: {
    type: String,
    enum: ["admin", "teacher"], // Allowed roles
  },
}, { timestamps: true });

const NoticeDB = mongoose.model("Notice", NoticeSchema);
export default NoticeDB
