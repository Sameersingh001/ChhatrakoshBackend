import StudentDB from "../Models/Student/StudentDB.js";
import LeavesDB from "../Models/Leaves/LeavesDB.js";
import TeacherDB from "../Models/Teacher/TeacherDB.js"
import AdminDB from "../Models/Admin/Admin_RegisterDB.js"
import NoticeDB from "../Models/Notice/NoticeDB.js";
import ComplaintDB from "../Models/Complaint/ComplainDB.js"
import AttendanceQrDB from "../Models/Attendance/AttendanceQR.js";
import HolidayDB from "../Models/Holiday/HolidayDB.js"
import StudentAttendanceDB from "../Models/Attendance/StudentAttendaceQr.js";
import { getDistance } from "../utils/Distance.js"; // we'll add helper
import HomeworkDB from "../Models/Homework/HomeworkDB.js"
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import axios from "axios";
import QuizDB from "../Models/Quiz/QuizDB.js"
import ScheduleDB from "../Models/Schedule/ScheduleDB.js"

// Student Registration Controller

export async function StudentRegistration(req, res) {
  try {
    const {
      name,
      email,
      rollNo,
      className,
      semester,
      phone,
      address,
      dob,
      gender,
      parentName,
      parentPhone,
    } = req.body;

    // ✅ Validate required fields
    if (!name || !email || !rollNo || !className || !semester || !phone) {
      return res.status(400).json({ message: "⚠️ All required fields must be filled" });
    }

    // ✅ Check if student already exists by email or roll number
    const existingStudent = await StudentDB.findOne({
      $or: [{ email }, { rollNo }],
    });

    if (existingStudent) {
      return res.status(409).json({ message: "⚠️ Student with this Email or Roll No already exists" });
    }

    // ✅ Generate a default password
    const firstName = name.split(" ")[0]?.toLowerCase() || "student";
    const rollSuffix = rollNo.slice(-4) || "0000";
    const phoneSuffix = phone.slice(-4) || "0000";
    const rawPassword = `${firstName}${rollSuffix}${phoneSuffix}@`;

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // ✅ Create new student document
    const newStudent = new StudentDB({
      name,
      email,
      rollNo,
      className,
      semester,
      phone,
      address,
      dob,
      gender,
      parentName,
      parentPhone,
      password: hashedPassword,
      isActive: true,
    });

    await newStudent.save();

    res.status(201).json({
      message: "✅ Student registered successfully",
      studentId: newStudent._id,
      defaultPassword: rawPassword, // Optional: Only return if you want to give it to admin
    });
  } catch (error) {
    res.status(500).json({ message: "❌ Internal server error" });
  }
}

const bulkRegisterStudents = async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || students.length === 0) {
      return res.status(400).json({ message: "No student data provided" });
    }

    const requiredFields = [
      "name", "email", "rollNo", "className", "semester",
      "phone", "dob", "gender", "address", "parentName", "parentPhone"
    ];

    // Validate each student
    for (const [index, student] of students.entries()) {
      for (const field of requiredFields) {
        if (!student[field]) {
          return res.status(400).json({
            message: `Row ${index + 1}: Missing required field "${field}"`,
          });
        }
      }
    }

    // Check for duplicates in DB
    const emails = students.map(s => s.email);
    const rollNos = students.map(s => s.rollNo);

    const existing = await StudentDB.find({
      $or: [{ email: { $in: emails } }, { rollNo: { $in: rollNos } }]
    });

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Duplicate email or rollNo found",
        existing: existing.map(e => ({ email: e.email, rollNo: e.rollNo }))
      });
    }

    // Generate passwords and hash them for each student
    const studentsToInsert = await Promise.all(students.map(async (student) => {
      const firstName = student.name.split(" ")[0]?.toLowerCase() || "student";

      // Convert rollNo and phone to string
      const rollStr = String(student.rollNo);
      const phoneStr = String(student.phone);

      const rollSuffix = rollStr.slice(-4) || "0000";
      const phoneSuffix = phoneStr.slice(-4) || "0000";

      const rawPassword = `${firstName}${rollSuffix}${phoneSuffix}@`;

      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      return {
        ...student,
        password: hashedPassword,
        isActive: true,
      };
    }));
    // Insert all students
    const inserted = await StudentDB.insertMany(studentsToInsert);

    res.status(201).json({
      message: `${inserted.length} students uploaded successfully`,
      students: inserted.map(s => ({
        name: s.name,
        email: s.email,
        rollNo: s.rollNo,
      }))
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};





async function StudentLogin(req, res) {
  const { rollNo, email, password } = req.body;

  try {
    if (!rollNo || !email || !password) {
      return res.status(400).json({ message: "❌ All fields are required" });
    }
    const student = await StudentDB.findOne({ email });
    if (!student) {
      return res.status(401).json({ message: "❌ Invalid credentials" });
    }

    const roll = await StudentDB.findOne({ rollNo });
    if (!roll) {
      return res.status(401).json({ message: "❌ Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ message: "❌ Invalid credentials" });
    }

    if (student.status != "active") {
      return res.status(401).json({ message: "❌ Your Acount is Inactive Contact Your Admin" });
    }

    const token = jwt.sign({ id: student._id, role: student.role }, process.env.SECRET_KEY, { expiresIn: "1d" });
    res.cookie("studentToken", token, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.status(200).json({
      message: "Login successful", student: {
        id: student._id,
      }
    });

  } catch (error) {
    res.status(500).json({ message: "❌ Internal server error" });
  }
}




//Change password Controller 



const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const studentId = req.params.id;

    // 1️⃣ Find student
    const student = await StudentDB.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 2️⃣ Compare current password
    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // 3️⃣ Check confirm password
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 4️⃣ Validate password strength (optional but recommended)
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters, include uppercase, lowercase, number, and special character",
      });
    }

    // 5️⃣ Hash and save new password
    const salt = await bcrypt.genSalt(10);
    student.password = await bcrypt.hash(newPassword, salt);
    await student.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};











async function GetStudent(req, res) {
  const StudentID = req.params.id;
  try {
    const Student = await StudentDB.findById(StudentID)
    if (!Student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }
    return res.status(200).json({ Student });
  } catch (error) {
    return res.status(500).json({ message: " ❌ Internal server error" });
  }
}






async function UpdateStudent(req, res) {
  const ID = req.params.id;
  const { name, phone, address, parentName, parentPhone } = req.body;

  try {

    let updatedData = { name, phone, parentName, parentPhone, address };

    // Handle file upload
    if (req.file) {
      updatedData.photo = `/uploads/student/${req.file.filename}`;
    }

    // Update teacher
    const UpdateStudent = await StudentDB.findByIdAndUpdate(
      ID,
      { $set: updatedData },
      { new: true } // return the updated document
    );

    if (!UpdateStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json(UpdateStudent);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
}



const RequestLeave = async (req, res) => {
  try {
    const { studentId, reason, startDate, endDate } = req.body;

    // Validate fields
    if (!studentId || !reason || !startDate || !endDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid studentId" });
    }

    // Verify student exists
    const student = await StudentDB.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Create leave
    const leave = new LeavesDB({
      studentId: student._id,
      reason,
      startDate,
      endDate,
    });

    await leave.save();

    res.status(201).json({ message: "Leave request submitted", leave });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


async function GetStudentLeaves(req, res) {
  try {
    const studentId = req.params.id;

    const leaves = await LeavesDB.find({ studentId }).sort({ appliedDate: -1 });

    return res.status(200).json({
      success: true,
      leaves,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching leaves",
    });
  }
}

const DeleteLeaves = async (req, res) => {
  const { leaveId } = req.params;

  try {
    const leave = await LeavesDB.findById(leaveId);
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    // Only allow deletion if leave is still pending
    if (leave.teacherStatus !== "Pending" || leave.adminStatus !== "Pending") {
      return res.status(403).json({ message: "Cannot delete approved/recommended leave" });
    }

    await LeavesDB.findByIdAndDelete(leaveId);
    res.status(200).json({ message: "Leave deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting leave" });
  }
};


async function GetNotices(req, res) {
  try {
    const Notices = await NoticeDB.find().sort({ createdAt: -1 }); // latest first

    if (Notices.length === 0) {
      return res.status(404).json({ message: "No notices found" });
    }

    return res.status(200).json({
      notices: Notices,
      message: "✅ Notices fetched successfully",
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error, please try again" });
  }
}



async function MyClassStudents(req, res) {
  const { id, className } = req.params;
  // Check if id is provided and valid
  if (!id || !className) {
    return res.status(400).json({ message: "Student ID and className are required." });
  }

  try {
    // Ensure id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid student ID." });
    }
    // Fetch classmates except the current student
    const students = await StudentDB.find({
      className: className,
      _id: { $ne: id }
    }).select("-password"); // exclude sensitive fields

    if (!students || students.length === 0) {
      return res.status(404).json({ message: "No other students found in this class." });
    }

    return res.status(200).json({ students, message: "Students fetched successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error." });
  }
}




const createComplaint = async (req, res) => {
  try {
    const { title, description, level } = req.body;
    // Get all teachers or admins based on complaint level
    let assignedUsers = [];

    if (level === "low") {
      assignedUsers = await TeacherDB.find({ role: "Teacher" });
    } else if (level === "high") {
      assignedUsers = await AdminDB.find({ role: "Admin" })
    }

    const complaint = await ComplaintDB({
      student: req.user._id, // student who logged in
      title,
      description,
      level,
      assignedTo: assignedUsers.map((u) => ({
        user: u._id,
        role: u.role,  // "Teacher" or "Admin"
      })),
    });

    await complaint.save()

    res.status(201).json({
      success: true,
      message: "Complaint submitted successfully",
      complaint,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getMyComplaints = async (req, res) => {
  try {
    const complaints = await ComplaintDB.find({ student: req.user._id })
      .populate("assignedTo", "name role email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



const editComplaintByStudent = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const user = req.user; // { id, role } set by auth middleware



    if (!complaintId) {
      return res.status(400).json({ message: "Complaint ID is required" });
    }

    const complaint = await ComplaintDB.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }


    // ✅ Authorization check: only the student who created it
    if (user.role !== "student" || complaint.student.toString() !== user._id) {
      return res.status(403).json({ message: "Not authorized to edit this complaint" });
    }

    // ✅ Allowed fields for student
    if (req.body.title !== undefined) complaint.title = req.body.title;
    if (req.body.description !== undefined) complaint.description = req.body.description;

    const updatedComplaint = await complaint.save();
    return res.json({
      message: "Complaint updated successfully",
      complaint: updatedComplaint,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};




async function DeleteComplaints(req, res) {
  try {
    const id = req.params.id


    const Delete = await ComplaintDB.findByIdAndDelete(id)

    if (!Delete) {
      return res.status(404).json({ message: "Complaint not found !" })
    }

    res.status(200).json({ Delete, message: "Complaint Delete Successfully ✅" })

  }
  catch (err) {
    console.log(err)
    res.status(500).json({ message: "Server issue" })
  }
}



const markAttendance = async (req, res) => {
  try {
    const { studentId, qrToken, location } = req.body;

    if (!studentId || !qrToken) {
      return res.status(400).json({ message: "Missing studentId or qrToken" });
    }

    // 1️⃣ Verify QR token
    const qr = await AttendanceQrDB.findOne({ qrToken });
    if (!qr) return res.status(400).json({ message: "Invalid QR token" });

    // 2️⃣ Check expiry
    if (qr.expiresAt < new Date()) {
      return res.status(400).json({ message: "QR code expired" });
    }

    // 3️⃣ Check distance
    let distance = null;
    if (location?.latitude && location?.longitude && qr.location?.latitude && qr.location?.longitude) {
      distance = getDistance(qr.location, location);

      if (distance > 50) {
        return res.status(400).json({ message: "❌ You are too far from classroom" });
      }
    } else {
      console.log("❌ Missing coordinates", { location, qrLocation: qr.location });
    }

    // 4️⃣ Get student info
    const student = await StudentDB.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // 5️⃣ Normalize date (ignore time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 6️⃣ Check if attendance already exists
    const existing = await StudentAttendanceDB.findOne({
      studentId,
      className: qr.className,
      semester: qr.semester,
      date: today,
    });

    if (existing) {
      return res.status(400).json({ message: "Attendance already marked today" });
    }

    // 7️⃣ Save attendance → mark as present
    const attendance = new StudentAttendanceDB({
      studentId,
      rollNumber: student.rollNo,
      teacherId: qr.teacherId,
      className: qr.className,
      semester: qr.semester,
      qrToken,
      date: today,
      location,
      status: "present", // ✅ new
    });

    await attendance.save();

    return res.status(200).json({
      message: "✅ Attendance marked successfully!",
      student: {
        name: student.name,
        rollNumber: student.rollNo,
        className: student.className,
        semester: student.semester,
      },
    });
  } catch (err) {
    console.error("Attendance Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};





async function MyAttendance(req, res) {
  try {
    const { studentId, className, semesterNumber } = req.params;
    const { startDate, endDate } = req.query;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch attendance records
    const records = await StudentAttendanceDB.find({
      studentId,
      className,
      semester: semesterNumber,
      date: { $gte: start, $lte: end },
    });

    // Fetch holidays for the class, semester, and universal holidays
    const holidays = await HolidayDB.find({
      date: { $gte: start, $lte: end },
      $or: [
        { className, semester: semesterNumber },
        { className: "ALL", semester: "ALL" }
      ]
    });

    // Generate all days in the range
    const daysArray = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      daysArray.push(new Date(d));
    }

    // Build attendance list
    const attendanceList = daysArray.map((day) => {
      const record = records.find(r => r.date.toDateString() === day.toDateString());
      const holiday = holidays.find(h => h.date.toDateString() === day.toDateString());

      // If no record and no holiday, check if Sunday (0 = Sunday)
      const isSunday = day.getDay() === 0;

      return {
        date: new Date(day),
        status: holiday
          ? "holiday"
          : record
            ? record.status
            : isSunday
              ? "holiday"
              : "absent",
        holidayName: holiday?.name || (isSunday ? "Sunday Weekly Holiday" : null),
      };
    });

    res.status(200).json(attendanceList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching attendance" });
  }
}



async function calculateAttendance(req, res) {
  try {
    const { studentId, className, semester } = req.params;
    const { startDate, endDate } = req.query;

    if (!studentId || !className || !semester || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch attendance records
    const records = await StudentAttendanceDB.find({
      studentId,
      className,
      semester: Number(semester),
      date: { $gte: start, $lte: end },
    });

    // Fetch holidays
    const holidays = await HolidayDB.find({
      className: { $in: ["ALL", className] },
      semester: { $in: ["ALL", Number(semester)] },
      date: { $gte: start, $lte: end },
    });

    // Convert holiday dates to strings for quick lookup
    const holidaySet = new Set(
      holidays.map(h => new Date(h.date).toDateString())
    );

    // Generate all days in range
    const totalDaysArray = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      totalDaysArray.push(new Date(d));
    }

    let presentCount = 0;
    let totalWorkingDays = 0;

    totalDaysArray.forEach((day) => {
      const dayStr = day.toDateString();

      // Skip Sundays
      if (day.getDay() === 0) return; // 0 = Sunday

      // Skip holidays
      if (holidaySet.has(dayStr)) return;

      totalWorkingDays++;

      const record = records.find(r => r.date.toDateString() === dayStr);
      if (record && record.status === "present") {
        presentCount++;
      }
    });

    const attendancePercentage =
      totalWorkingDays > 0
        ? Math.round((presentCount / totalWorkingDays) * 100)
        : 0;

    res.status(200).json({ attendancePercentage, totalWorkingDays, presentCount });
  } catch (err) {
    console.error("Error calculating attendance:", err);
    res.status(500).json({ message: "Failed to calculate attendance." });
  }
}


// homework 


const submitHomework = async (req, res) => {
  try {
    const { homeworkId, studentId, remarks } = req.body;
    const fileUrl = req.file ? req.file.path : null; // single PDF file

    if (!fileUrl) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const homework = await HomeworkDB.findById(homeworkId);
    if (!homework) {
      return res.status(404).json({ success: false, message: "Homework not found" });
    }

    // Check if already submitted → update instead
    const existing = homework.submissions.find(sub => sub.studentId.toString() === studentId);
    if (existing) {
      existing.fileUrl = fileUrl;
      existing.remarks = remarks;
      existing.submittedAt = new Date();
    } else {
      homework.submissions.push({
        studentId,
        fileUrl,
        remarks,
        submittedAt: new Date(),
      });
    }

    await homework.save();

    res.json({ success: true, message: "✅ Homework submitted successfully", homework });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getStudentHomeworks = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // 1️⃣ Find the student
    const student = await StudentDB.findById(studentId);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const { className, semester } = student;

    const StudentSemester = parseInt(semester)

    // 2️⃣ Query HomeworkDB for matching className & semester
    const homeworks = await HomeworkDB.find({
      className: className,
      semester: StudentSemester,
    })
      .populate("submissions.studentId", "name email");

    // 3️⃣ Return the matched homeworks
    res.json({ success: true, homeworks });
  } catch (err) {
    console.error("Error fetching student homeworks:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};



function parseQuestions(generatedText) {
  if (!generatedText || typeof generatedText !== 'string') {
    return [];
  }

  const questions = [];
  const questionBlocks = generatedText.split(/(?=Q:\s*)/).filter(block => block.trim().length > 0);

  for (const block of questionBlocks) {
    try {
      const lines = block.split('\n').map(line => line.trim()).filter(line => line.length > 0);

      if (lines.length < 3) continue; // Need at least Q, Options, Answer

      // Extract question (remove Q: prefix)
      let questionText = lines[0].replace(/^Q:\s*/, '').trim();
      if (!questionText) continue;

      // Find options line
      const optionsLine = lines.find(line =>
        line.toLowerCase().startsWith('options:') ||
        /^[A-D]\)/.test(line)
      );

      if (!optionsLine) continue;

      // Find answer line
      const answerLine = lines.find(line =>
        line.toLowerCase().startsWith('answer:') ||
        /^correct:/i.test(line)
      );

      if (!answerLine) continue;

      // Parse options with multiple approaches
      let options = parseOptions(optionsLine);

      // Validate options have meaningful content
      if (!areOptionsValid(options)) {
        console.log('Invalid options detected, attempting to fix:', options);
        options = fixOptions(options, questionText);
      }

      const answerMatch = answerLine.match(/Answer:\s*([A-D])/i) || answerLine.match(/([A-D])/i);
      const answer = answerMatch ? answerMatch[1].toUpperCase() : null

      if (!answer || !options.A || !options.B || !options.C || !options.D) {
        console.log('Skipping question due to missing data:', { questionText, options, answer });
        continue;
      }

      questions.push({
        question: questionText,
        options,
        correctAnswer: answer
      });

    } catch (error) {
      console.log('Error parsing question block:', error);
      continue;
    }
  }

  return questions;
}

function parseOptions(optionsLine) {
  let options = { A: '', B: '', C: '', D: '' };

  // Clean the options line
  let cleanLine = optionsLine.replace(/^Options:\s*/i, '').trim();

  // Multiple parsing strategies
  const strategies = [
    // Strategy 1: Standard A) Text B) Text format
    () => {
      const regex = /([A-D])\)\s*([^A-D]*?)(?=\s*[A-D]\)|$)/gi;
      const matches = [...cleanLine.matchAll(regex)];
      matches.forEach(match => {
        const letter = match[1].toUpperCase();
        const text = match[2].trim();
        if (text && text.length > 1) {
          options[letter] = text;
        }
      });
      return Object.values(options).every(opt => opt.length > 0);
    },

    // Strategy 2: Split by spaces before A) B) C) D)
    () => {
      const parts = cleanLine.split(/\s+(?=[A-D]\))/);
      parts.forEach(part => {
        const match = part.match(/^([A-D])\)\s*(.+)$/);
        if (match) {
          const letter = match[1].toUpperCase();
          const text = match[2].trim();
          if (text && text.length > 1) {
            options[letter] = text;
          }
        }
      });
      return Object.values(options).every(opt => opt.length > 0);
    },

    // Strategy 3: Manual parsing for difficult cases
    () => {
      const letters = ['A', 'B', 'C', 'D'];
      let currentText = cleanLine;

      for (let i = 0; i < letters.length; i++) {
        const currentLetter = letters[i];
        const nextLetter = letters[i + 1];
        const pattern = nextLetter
          ? new RegExp(`^${currentLetter}\\)\\s*(.*?)(?=\\s*${nextLetter}\\))`, 'i')
          : new RegExp(`^${currentLetter}\\)\\s*(.*)`, 'i');

        const match = currentText.match(pattern);
        if (match) {
          options[currentLetter] = match[1].trim();
          currentText = currentText.slice(match[0].length);
        }
      }
      return Object.values(options).every(opt => opt.length > 0);
    }
  ];

  // Try each strategy until one works
  for (const strategy of strategies) {
    options = { A: '', B: '', C: '', D: '' }; // Reset
    if (strategy()) {
      break;
    }
  }

  return options;
}

function areOptionsValid(options) {
  return Object.values(options).every(opt =>
    opt &&
    opt.length > 2 &&
    !opt.match(/^option\s*[A-D]$/i) &&
    !opt.match(/^[A-D]\s*$/) &&
    !opt.match(/^\s*$/)
  );
}

function fixOptions(options, questionText) {
  const fixedOptions = { ...options };
  const subjectKeywords = questionText.toLowerCase().split(/\s+/).slice(0, 5);

  ['A', 'B', 'C', 'D'].forEach(letter => {
    if (!fixedOptions[letter] || fixedOptions[letter].length <= 2) {
      // Generate meaningful option based on question context
      const contexts = [
        `Correct concept for ${subjectKeywords[0] || 'this topic'}`,
        `Common misconception about ${subjectKeywords[1] || 'the subject'}`,
        `Alternative approach to ${subjectKeywords[2] || 'the problem'}`,
        `Advanced technique in ${subjectKeywords[3] || 'this field'}`
      ];
      fixedOptions[letter] = contexts[['A', 'B', 'C', 'D'].indexOf(letter) % contexts.length];
    }
  });

  return fixedOptions;
}




async function QuizGenerate(req, res) {
  try {
    const className = req.params.className;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return res.status(400).json({ error: "Gemini API key missing" });
    }

    if (!className) {
      return res.status(400).json({ error: "Class name is required" });
    }

    const prompt = `
CRITICAL INSTRUCTION: You MUST generate exactly 10 multiple choice questions for ${className} class. 
FAILURE TO FOLLOW THIS FORMAT WILL RESULT IN INVALID OUTPUT.

**FORMATTING RULES - DO NOT DEVIATE:**


For EACH question, use EXACTLY this format:

Q: [Complete question text ending with ?]
Options: A) [Complete meaningful option] B) [Complete meaningful option] C) [Complete meaningful option] D) [Complete meaningful option]
Answer: [Single letter A, B, C, or D] it can be any option not every time A is correct
**IMPORTANT:** Each question and its options must be clear, unambiguous, and directly related to ${className} curriculum.


**REQUIREMENTS:**
1. Generate EXACTLY 10 questions - no more, no less
2. Each option MUST be a complete, meaningful sentence or phrase
3. DO NOT use placeholder text like "Option A", "Text for A", or single words
4. Each option should be 3-10 words minimum
5. Options should be plausible but only one correct
6. Cover different topics from ${className} curriculum
7. Questions should be educational and accurate
8. Answer must be one of A, B, C, or D ONLY Not Every time A is correct it can be any option
9. mix up the correct answers among A, B, C, and D
10. Do NOT include any additional text, explanations, or formatting outside the specified structure
11. Ensure no two questions are identical or too similar
12. Avoid overly complex or trick questions - keep it straightforward and fair
13. Do NOT reference the question number in the text
14. Make sure every day Question is different from previous days
15. Daily questions and answers should not be repeated
16. Ensure the content is appropriate for students and free of bias
17. Do NOT include any images, diagrams, or external references
18. every day add one programming question if class ${className} == BCA || Tech curriculum curriculum


**EXAMPLES OF CORRECT FORMAT:**

GOOD:
Q: What is the primary function of a database management system?
Options: A) To manage and organize large amounts of data efficiently B) To create graphical user interfaces for applications C) To compile source code into executable programs D) To provide network security and firewall protection
Answer: A

GOOD:
Q: Which data structure follows the LIFO principle?
Options: A) Queue processes elements in FIFO order B) Stack adds and removes elements from the same end C) Array allows random access to elements D) Linked list uses pointers to connect nodes
Answer: B

**BAD (NEVER DO THIS):**
Q: Question here?
Options: A) A B) B C) C D) D
Answer: C

Q: Question here?
Options: A) Option A B) Option B C) Option C D) Option D  
Answer: B


Now generate 10 questions for ${className} class following ALL rules above perfectly. :

`;

    // 1. Check if quiz already exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let existingQuiz = await QuizDB.findOne({
      className,
      date: today,
    });

    if (existingQuiz) {
      return res.json({ success: true, quiz: existingQuiz });
    }

    // 2. Generate new quiz from Gemini with stricter parameters
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent formatting
          maxOutputTokens: 5000,
          topP: 0.8,
          topK: 40
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000 // Increased timeout
      }
    );

    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('No content received from Gemini API');
    }

    const generatedText = response.data.candidates[0].content.parts[0].text;

    const questions = parseQuestions(generatedText);

    // Final validation and cleanup
    const validatedQuestions = questions.map((q, index) => {
      // Ensure all options have meaningful content
      ['A', 'B', 'C', 'D'].forEach(letter => {
        if (!q.options[letter] || q.options[letter].length < 3) {
          q.options[letter] = `Meaningful ${className} concept ${letter}`;
        }
      });

      return q;
    }).filter(q => q.question && q.correctAnswer);

    if (validatedQuestions.length === 0) {
      return res.status(500).json({
        error: "No valid questions could be parsed from the API response",
        debug: generatedText.substring(0, 1000)
      });
    }

    // Take exactly 10 questions
    const finalQuestions = validatedQuestions.slice(0, 10);

    // 3. Save quiz in DB
    const newQuiz = new QuizDB({
      className,
      date: today,
      questions: finalQuestions,
    });

    await newQuiz.save();


    res.json({
      success: true,
      quiz: newQuiz,
      message: `Generated ${finalQuestions.length} valid questions`
    });

  } catch (err) {
    console.error("Quiz generation error:", err);

    if (err.response?.data) {
      console.error("API response error:", JSON.stringify(err.response.data, null, 2));
    }

    res.status(500).json({
      error: "Failed to generate quiz",
      details: err.message
    });
  }
}


const submitQuiz = async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      className,
      answers,
      correctAnswersCount,
      totalQuestions,
      score,
      violations = 0,
      timeSpent = 0,
      autoSubmitted = false,
      autoSubmitReason = '',
      failedDueToViolation = false
    } = req.body;

    if (!studentId || !studentName || !className || !answers || !totalQuestions) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const studentObjectId = mongoose.Types.ObjectId.isValid(studentId)
      ? new mongoose.Types.ObjectId(studentId)
      : studentId;

    // Today date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Find today's quiz for the class
    let quiz = await QuizDB.findOne({
      className,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    if (!quiz) {
      return res.status(404).json({ error: "No quiz found for today" });
    }

    // Find student's attempts
    let studentAttempt = quiz.studentAttempts.find(
      a => a.studentId.toString() === studentObjectId.toString()
    );

    const currentAttempts = studentAttempt ? studentAttempt.attemptsUsed : 0;

    if (currentAttempts >= 3) {
      return res.status(400).json({ error: "Maximum attempts reached for today" });
    }

    // Prepare new submission
    const newSubmission = {
      studentId: studentObjectId,
      studentName,
      answers: answers.map((opt, idx) => ({ questionIndex: idx, selectedOption: opt || "" })),
      score: Math.round(score),
      correctAnswers: correctAnswersCount,
      totalQuestions,
      timeSpent,
      violations,
      autoSubmitted,
      autoSubmitReason,
      failedDueToViolation,
      attemptNumber: currentAttempts + 1
    };

    // Add the new submission without overwriting previous ones
    quiz.submissions.push(newSubmission);

    // Update studentAttempts
    if (studentAttempt) {
      studentAttempt.attemptsUsed += 1;
      studentAttempt.lastAttemptAt = new Date();
    } else {
      quiz.studentAttempts.push({
        studentId: studentObjectId,
        attemptsUsed: 1,
        lastAttemptAt: new Date()
      });
    }

    await quiz.save();

    res.json({
      success: true,
      score: Math.round(score),
      correctAnswers: correctAnswersCount,
      totalQuestions,
      attemptNumber: currentAttempts + 1,
      attemptsRemaining: 3 - (currentAttempts + 1),
      message: "Quiz submitted successfully"
    });

  } catch (error) {
    console.error("Submit Quiz Error:", error);
    res.status(500).json({ error: "Failed to submit quiz", details: error.message });
  }
};


// Increment attempts controller
const incrementAttempts = async (req, res) => {
  try {
    const { studentId, date } = req.body;

    if (!studentId || !date) {
      return res.status(400).json({
        error: "Student ID and date are required"
      });
    }

    const studentObjectId = mongoose.Types.ObjectId.isValid(studentId)
      ? new mongoose.Types.ObjectId(studentId)
      : studentId;

    const attemptDate = new Date(date);
    attemptDate.setHours(0, 0, 0, 0);

    // Find quiz for the class on that date (assuming class name is needed)
    // You might need to pass className in the request body
    const { className } = req.body;

    if (!className) {
      return res.status(400).json({
        error: "Class name is required"
      });
    }

    const quiz = await QuizDB.findOne({
      className,
      date: attemptDate
    });

    if (!quiz) {
      return res.status(404).json({
        error: "No quiz found for the specified date and class"
      });
    }

    const studentAttempt = quiz.studentAttempts.find(attempt =>
      attempt.studentId.toString() === studentObjectId.toString()
    );

    if (!studentAttempt) {
      // Create new attempt record if doesn't exist
      quiz.studentAttempts.push({
        studentId: studentObjectId,
        attemptsUsed: 1,
        lastAttemptAt: new Date()
      });
    } else {
      if (studentAttempt.attemptsUsed >= 3) {
        return res.status(400).json({
          error: "Maximum attempts already reached"
        });
      }
      studentAttempt.attemptsUsed += 1;
      studentAttempt.lastAttemptAt = new Date();
    }

    await quiz.save();

    const updatedAttempts = studentAttempt ? studentAttempt.attemptsUsed : 1;

    res.json({
      success: true,
      attemptsUsed: updatedAttempts,
      attemptsRemaining: 3 - updatedAttempts,
      message: "Attempts incremented successfully"
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to increment attempts",
      details: error.message
    });
  }
};

// Get student attempts controller
const getStudentAttempts = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        error: "Student ID is required"
      });
    }

    const studentObjectId = mongoose.Types.ObjectId.isValid(studentId)
      ? new mongoose.Types.ObjectId(studentId)
      : studentId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's quiz that has this student's attempts
    // We need to search across all classes for this student
    const quiz = await QuizDB.findOne({
      date: today,
      "studentAttempts.studentId": studentObjectId
    });

    let attemptsUsed = 0;

    if (quiz) {
      const studentAttempt = quiz.studentAttempts.find(attempt =>
        attempt.studentId.toString() === studentObjectId.toString()
      );
      attemptsUsed = studentAttempt ? studentAttempt.attemptsUsed : 0;
    }

    res.json({
      attemptsUsed,
      attemptsRemaining: 3 - attemptsUsed,
      maxAttempts: 3,
      hasAttemptsRemaining: attemptsUsed < 3
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to get student attempts",
      details: error.message
    });
  }
};

// Get monthly leaderboard controller
const getMonthlyLeaderboard = async (req, res) => {
  try {
    const { className } = req.params;

    if (!className) {
      return res.status(400).json({
        error: "Class name is required"
      });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0); // Last day of current month
    endOfMonth.setHours(23, 59, 59, 999);

    // Get all quizzes for this class in current month
    const monthlyQuizzes = await QuizDB.find({
      className,
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    }).populate('submissions.studentId', 'name'); // Populate student data if needed

    // Calculate student scores for the month
    const studentScores = {};

    monthlyQuizzes.forEach(quiz => {
      quiz.submissions.forEach(submission => {
        const studentId = submission.studentId.toString();

        if (!studentScores[studentId]) {
          studentScores[studentId] = {
            studentId: submission.studentId,
            studentName: submission.studentName,
            totalScore: 0,
            totalQuizzes: 0,
            className: className,
            submissions: []
          };
        }

        studentScores[studentId].totalScore += submission.score;
        studentScores[studentId].totalQuizzes += 1;
        studentScores[studentId].submissions.push({
          score: submission.score,
          date: quiz.date,
          attemptNumber: submission.attemptNumber
        });
      });
    });

    // Calculate average scores and prepare leaderboard
    const leaderboard = Object.values(studentScores)
      .map(student => {
        const averageScore = student.totalQuizzes > 0
          ? Math.round(student.totalScore / student.totalQuizzes)
          : 0;

        return {
          studentId: student.studentId,
          name: student.studentName,
          className: student.className,
          score: averageScore,
          quizzesTaken: student.totalQuizzes,
          totalScore: student.totalScore,
          submissions: student.submissions
        };
      })
      .filter(student => student.quizzesTaken > 0) // Only include students who took quizzes
      .sort((a, b) => b.score - a.score || b.quizzesTaken - a.quizzesTaken)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        isCurrentUser: req.user && req.user._id === entry.studentId.toString() // Add if you have user context
      }));

    res.json({
      success: true,
      leaderboard,
      month: startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
      totalStudents: leaderboard.length,
      dateRange: {
        start: startOfMonth.toISOString().split('T')[0],
        end: endOfMonth.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch leaderboard",
      details: error.message
    });
  }
};





// Get schedule for a student by ID
const getStudentSchedule = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ error: "studentId is required" });
    }

    // Fetch student info
    const student = await StudentDB.findById(studentId).lean();
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const { className, semester } = student;
    const semesterNumber = parseInt(semester);
    // Fetch schedule for student's class & semester
    const schedule = await ScheduleDB.find({ className, semester: semesterNumber })
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    if (!schedule || schedule.length === 0) {
      return res.json({ data: [] });
    }
    
    res.json({ data: schedule, student: { name: student.name, className, semester } });
  } catch (err) {
    console.error("Error fetching schedule:", err);
    res.status(500).json({ error: "Failed to fetch student schedule" });
  }
};












async function StudentLogout(req, res) {
  res.clearCookie("studentToken");
  return res.status(200).json({ message: "✅ Logout successful" });
}




export default {
  StudentRegistration,
  StudentLogin,
  GetStudent,
  StudentLogout,
  UpdateStudent,
  RequestLeave,
  GetStudentLeaves,
  bulkRegisterStudents,
  GetNotices,
  MyClassStudents,
  changePassword,
  DeleteLeaves,
  createComplaint,
  getMyComplaints,
  DeleteComplaints,
  editComplaintByStudent,
  markAttendance,
  MyAttendance,
  calculateAttendance,
  submitHomework,
  getStudentHomeworks,
  QuizGenerate,
  submitQuiz,
  incrementAttempts,
  getStudentAttempts,
  getMonthlyLeaderboard,
  getStudentSchedule
}