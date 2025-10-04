import mongoose from "mongoose";

// ✅ Define submission schema separately
const submissionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  fileUrl: {
    type: String, // Cloudinary / any storage file link
  },
  remarks: {
    type: String,
  },
  grade: {
    type: String,
  },
});

// ✅ Homework schema
const homeworkSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: true,
  },
  className: {
    type: String, // e.g., "BCA", "BBA", "10th Grade"
    required: true,
  },
  semester: {
    type: Number, // e.g., 1, 2, 3, 4...
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  attachments: [
    {
      type: String, // file URLs uploaded by teacher (PDFs, docs, etc.)
    },
  ],
  deadline: {
    type: Date,
    required: true,
  },
  assignedDate: {
    type: Date,
    default: Date.now,
  },
  submissions: [submissionSchema], // array of student submissions
});

// ✅ Model export
const HomeworkDB = mongoose.model("Homework", homeworkSchema);
export default HomeworkDB;
