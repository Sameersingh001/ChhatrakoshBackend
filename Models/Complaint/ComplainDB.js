import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student", // Student who submitted the complaint
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      enum: ["low", "high"], // low = teacher, high = admin
      required: true,
    },
    assignedTo: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, required: true },
        role: { type: String, enum: ["Teacher", "Admin"], required: true },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "rejected"],
      default: "pending",
    },
    feedback: {
      type: String, // Teacher/Admin reply
    },
    solvedBy: {
      user: { type: mongoose.Schema.Types.ObjectId },
      role: { type: String, enum: ["Teacher", "Admin"] },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Complaint", complaintSchema);
