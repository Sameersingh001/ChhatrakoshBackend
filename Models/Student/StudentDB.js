// models/Student.js
import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Student name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    rollNo: {
      type: String,
      required: [true, "Roll number is required"],
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      default: "Student"
    },
    className: {
      type: String,
      required: true,
      enum: [
        // UG Courses
        "B.Tech",
        "BCA",
        "BBA",
        "B.Com",
        "BA",
        "B.Sc",
        "LLB",

        // PG Courses
        "M.Tech",
        "MCA",
        "MBA",
        "M.Com",
        "MA",
        "M.Sc",
        "LLM"
      ],
    },

      semester: {
        type: String,
        required: [true, "Semester is required"],
        trim: true,
      },
      phone: {
        type: String,
        match: [/^[0-9]{10}$/, { messege: "Please enter a valid 10-digit phone number" }],
      },
      dob: {
        type: Date,
        required: true
      },
      gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
      },
      address: {
        type: String,
        trim: true,
      },
      parentName: {
        type: String,
        trim: true,
      },
      parentPhone: {
        type: String,
        match: [/^[0-9]{10}$/, { messege: "Please enter a valid 10-digit parent phone number" }],
      },
      password: {
        type: String,
        unique: true
      },
      photo: {
        type: String, // store file path or URL
      },
      status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
      },
    },
  { timestamps: true } // createdAt & updatedAt
);

const StudentDB = mongoose.model("Student", studentSchema);

export default StudentDB
