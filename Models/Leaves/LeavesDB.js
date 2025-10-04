import mongoose from "mongoose";

const LeaveSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  appliedDate: {
    type: String,
    default: () => new Date().toISOString().split("T")[0],
  },
  startDate: {
    type: String,
    required: true,
  },
  endDate: {
    type: String,
    required: true,
  },
  teacherStatus: {
    type: String,
    enum: ["Pending", "Recommended", "Not Recommended"],
    default: "Pending",
  },

adminStatus: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
});

const LeaveDB = mongoose.model("Leave", LeaveSchema);

export default LeaveDB
