import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  image:{
    type:String
  },
  username:{
    type: String,
    unique:true,
    required:true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  designation: {
    type: String,
    enum: [
      "Assistant Professor",
      "Associate Professor",
      "Professor",
      "Lecturer",
      "Visiting Faculty"
    ],
    required: true
  },

    department: {
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

  qualification: {
    type: String, // Example: "PhD in Computer Science"
    required: true
  },

  subjects: [
    {
      subjectName: {
        type: String, // Example: "Computer Graphics"
        required: true
      },
      course: {
        type: String, // Example: "BCA"
        required: true
      },
      semester: {
        type: String, // Example: "5th Semester"
        required: true
      }
    }
  ],

  phone: {
    type: String,
    match: /^[0-9]{10}$/
  },

  address: {
    type: String,
    trim: true
  },

  collegeName: {
    type: String,
    required: true,
    default: "AGRA COLLEGE"
  },

  role: {
    type: String,
    default: "Teacher"
  },

  dateOfJoining: {
    type: Date,
    required: true
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const TeacherDB = mongoose.model("Teachers", teacherSchema, "Teachers");

export default TeacherDB;
