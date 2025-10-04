import mongoose from "mongoose";

const StudentAttendanceSchema = new mongoose.Schema(
  {
    studentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Student", 
      required: true 
    },
    rollNumber: { type: String, required: true },
    teacherId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Teachers", 
      required: true 
    },
    className: { type: String, required: true },
    semester: { type: Number, required: true, min: 1 },
    qrToken: { type: String, required: true },
    date: { type: Date, required: true },
    markedAt: { type: Date, default: Date.now },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    status: {
      type: String,
      enum: ["present", "absent", "holiday"],
      default: "absent",
      lowercase: true, // ensures consistency
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically
  }
);

// Unique index to prevent duplicate attendance for same student/class/semester/date
StudentAttendanceSchema.index(
  { studentId: 1, className: 1, semester: 1, date: 1 },
  { unique: true }
);

const StudentAttendanceDB =
  mongoose.models.StudentAttendance ||
  mongoose.model("StudentAttendance", StudentAttendanceSchema);

export default StudentAttendanceDB;
