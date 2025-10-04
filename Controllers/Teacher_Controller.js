import TeacherDB from "../Models/Teacher/TeacherDB.js";
import StudentDB from "../Models/Student/StudentDB.js";
import LeavesDB from "../Models/Leaves/LeavesDB.js"
import NoticeDB from "../Models/Notice/NoticeDB.js"
import ComplaintDB from "../Models/Complaint/ComplainDB.js"
import AttendanceQR from "../Models/Attendance/AttendanceQR.js"
import StudentAttendanceDB from "../Models/Attendance/StudentAttendaceQr.js"
import crypto from "crypto"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import HolidayDB from "../Models/Holiday/HolidayDB.js";
import HomeworkDB from "../Models/Homework/HomeworkDB.js";
import QuizDB from "../Models/Quiz/QuizDB.js"
import ScheduleDB from "../Models/Schedule/ScheduleDB.js";


async function RegisterTeacher(req, res) {
  const { name, email, username, designation, department, qualification, phone, address, collegeName, dateOfJoining, subjects } = req.body;

  // Validate the input
  if (!name || !email || !username || !designation || !department || !qualification || !phone || !address || !collegeName || !dateOfJoining || !subjects) {
    return res.status(400).json({ message: "All fields are required" });
  }


  try {

    const password = name.split(" ")[0].toLowerCase() + phone.slice(-6) + "@";

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if the teacher already exists
    const existingTeacher = await TeacherDB.findOne({ email });
    const existingUsername = await TeacherDB.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ message: "Username already taken" });
    }

    if (existingTeacher) {
      return res.status(409).json({ message: "Teacher already exists" });
    }

    // Create a new teacher
    const newTeacher = new TeacherDB({
      name,
      email,
      username,
      password: hashedPassword,
      designation,
      department,
      qualification,
      subjects,
      phone,
      address,
      collegeName,
      dateOfJoining,
      isActive: true

    });
    await newTeacher.save();
    res.status(201).json({ message: "Teacher registered successfully" });
  }
  catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }

}


const BulkRegisterTeachers = async (req, res) => {
  try {
    const { teachers } = req.body;

    if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ message: "No teacher data provided" });
    }

    // Collect emails & usernames from upload
    const emails = teachers.map((t) => t.email);
    const usernames = teachers.map((t) => t.username);

    // Check already existing teachers
    const existingTeachers = await TeacherDB.find({
      $or: [{ email: { $in: emails } }, { username: { $in: usernames } }],
    }).select("email username");

    const existingEmails = new Set(existingTeachers.map((t) => t.email));
    const existingUsernames = new Set(existingTeachers.map((t) => t.username));

    // Filter out duplicates
    const newTeachers = teachers.filter(
      (t) => !existingEmails.has(t.email) && !existingUsernames.has(t.username)
    );

    if (newTeachers.length === 0) {
      return res
        .status(409)
        .json({ message: "All provided teachers already exist ❌" });
    }

    // Format + hash passwords
    const formatted = await Promise.all(
      newTeachers.map(async (t) => {
        const phoneStr = t.phone ? String(t.phone) : "";

        const password =
          t.name?.split(" ")[0].toLowerCase() +
          (phoneStr.length >= 6 ? phoneStr.slice(-6) : "000000") +
          "@";

        const hashedPassword = await bcrypt.hash(password, 10);

        // 🔑 Fix subjects
        // 🔑 Fix subjects
        // 🔑 Fix subjects with required fields
        let subjects = [];

        if (Array.isArray(t.subjects)) {
          subjects = t.subjects.map((s) => {
            if (typeof s === "string") {
              return {
                subjectName: s,
                course: "Unknown",   // ✅ default instead of ""
                semester: "N/A",     // ✅ default instead of ""
              };
            }
            return {
              subjectName: s.subjectName || "Unnamed",
              course: s.course || "Unknown",
              semester: s.semester || "N/A",
            };
          });
        } else if (typeof t.subjects === "string" && t.subjects.trim() !== "") {
          try {
            const parsed = JSON.parse(t.subjects);

            if (Array.isArray(parsed)) {
              subjects = parsed.map((s) => ({
                subjectName: s.subjectName || (typeof s === "string" ? s : "Unnamed"),
                course: s.course || "Unknown",
                semester: s.semester || "N/A",
              }));
            } else if (typeof parsed === "object") {
              subjects = [
                {
                  subjectName: parsed.subjectName || "Unnamed",
                  course: parsed.course || "Unknown",
                  semester: parsed.semester || "N/A",
                },
              ];
            } else {
              subjects = [
                { subjectName: String(parsed), course: "Unknown", semester: "N/A" },
              ];
            }
          } catch {
            subjects = [{ subjectName: t.subjects, course: "Unknown", semester: "N/A" }];
          }
        } else if (typeof t.subjects === "object" && t.subjects !== null) {
          subjects = [
            {
              subjectName: t.subjects.subjectName || "Unnamed",
              course: t.subjects.course || "Unknown",
              semester: t.subjects.semester || "N/A",
            },
          ];
        }



        return {
          ...t,
          phone: phoneStr,
          password: hashedPassword,
          dateOfJoining: t.dateOfJoining ? new Date(t.dateOfJoining) : null,
          subjects,
          isActive: true,
        };
      })
    );




    await TeacherDB.insertMany(formatted);

    res.status(201).json({
      message: `Bulk teacher upload successful ✅ (${formatted.length} inserted, ${teachers.length - formatted.length} skipped as duplicates)`,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Error uploading teachers" });
  }
};


















async function GetAllTeachers(req, res) {
  try {
    const teachers = await TeacherDB.find();
    res.status(200).json(teachers || { message: "issue in found teachers" });
  }
  catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}


async function Teacherlogin(req, res) {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: "❌ All fields are required" });
    }
    const teacher = await TeacherDB.findOne({ email });
    if (!teacher) {
      return res.status(401).json({ message: "❌ Invalid credentials" });
    }

    if (!teacher.isActive) {
      return res.status(403).json({ message: "❌ Account is deactivated. Please contact admin." });
    }

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(401).json({ message: "❌ Invalid credentials" });
    }

    const token = jwt.sign({ id: teacher._id, role: teacher.role }, process.env.SECRET_KEY, { expiresIn: "1d" });
    res.cookie("teacherToken", token, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.status(200).json({
      message: "Login successful", teacher: {
        id: teacher._id,
        role: teacher.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: "❌ Internal server error" });
  }
}


const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const teacherId = req.params.id;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password do not match" });
    }

    // find teacher
    const teacher = await TeacherDB.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // check current password
    const isMatch = await bcrypt.compare(currentPassword, teacher.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // validate password rules (optional but good practice)
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPassword.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 chars long and include uppercase, lowercase, number, and special character",
      });
    }

    // hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    teacher.password = hashedPassword;
    await teacher.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error in changePassword:", err);
    return res.status(500).json({ message: "Server error" });
  }
};





async function GetTeacher(req, res) {
  const TeacherID = req.params.id;
  try {
    const Teacher = await TeacherDB.findById(TeacherID)
    if (!Teacher) {
      return res.status(404).json({ message: "❌ Teacher not found" });
    }
    return res.status(200).json({ Teacher });
  } catch (error) {
    return res.status(500).json({ message: " ❌ Internal server error" });
  }
}

async function getStudentsForTeacher(req, res) {
  try {
    const teacher = await TeacherDB.findById(req.user._id);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Build all possible classNames from teacher's subjects
    const classNames = teacher.subjects.map(
      (subj) => `${subj.course.trim()}`
    );

    // Find students whose className matches any of those
    const students = await StudentDB.find({
      className: { $in: classNames }
    });

    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}






async function UpdateTeacher(req, res) {
  const ID = req.params.id;
  const { name, username, qualification, phone, address } = req.body;

  try {
    let updatedData = { name, username, qualification, phone, address };

    // Handle file upload
    if (req.file) {
      updatedData.image = `/uploads/teacher/${req.file.filename}`;
    }

    // Update teacher
    const updateTeacherData = await TeacherDB.findByIdAndUpdate(
      ID,
      { $set: updatedData },
      { new: true } // return the updated document
    );

    if (!updateTeacherData) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.status(200).json(updateTeacherData);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
}




async function getLeavesForTeacher(req, res) {
  try {
    // 1️⃣ Get teacher's department
    const teacherID = req.user?._id; // set by TeacherVerifyToken
    // 2️⃣ Find students in teacher's department
    const teacher = await TeacherDB.findById(teacherID)
    const students = await StudentDB.find({ className: teacher.department });
    const studentIds = students.map(s => s._id);

    // 3️⃣ Get leaves for those students
    const leaves = await LeavesDB.find({ studentId: { $in: studentIds } })
      .populate("studentId", "name rollNo className")
      .sort({ appliedDate: -1 });
    res.status(200).json(leaves);
  } catch (err) {

    res.status(500).json({ message: "Server error", error: err.message });
  }
}

async function UpdateStudentLeaveStatus(req, res) {
  try {
    const { status } = req.body;
    const leave = await LeavesDB.findByIdAndUpdate(
      req.params.id,
      { teacherStatus: status },
      { new: true }
    ).populate("studentId");

    if (!leave) return res.status(404).json({ message: "Leave not found" });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}




const getNotices = async (req, res) => {
  try {
    const notices = await NoticeDB.find().sort({ createdAt: -1 });
    res.status(200).json(notices);
  } catch (err) {
    res.status(500).json({ error: "Server error while fetching notices" });
  }
};

// Create a new notice
const createNotice = async (req, res) => {
  try {
    const { title, description, link } = req.body;

    if (!req.user || (req.user.role !== "teacher" && req.user.role !== "admin")) {
      return res.status(403).json({ error: "Only teachers or admins can create notices" });
    }

    const newNotice = new NoticeDB({
      title,
      description,
      link,
      role: req.user.role,
    });

    await newNotice.save();
    res.status(201).json(newNotice);
  } catch (err) {
    res.status(500).json({ error: "Server error while creating notice" });
  }
};


const updateTeacherNotice = async (req, res) => {
  try {
    const { id } = req.params;

    // find only if notice is teacher's
    const notice = await NoticeDB.findOne({ _id: id, role: "teacher" });
    if (!notice) {
      return res.status(403).json({ error: "❌ You can only update your own notices" });
    }

    const updatedNotice = await NoticeDB.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json({ message: "✅ Notice updated", notice: updatedNotice });
  } catch (err) {
    console.error("❌ Error updating notice:", err);
    res.status(500).json({ error: "Server error" });
  }
};



const deleteTeacherNotice = async (req, res) => {
  try {
    const { id } = req.params;

    // only teacher-created notices can be deleted
    const notice = await NoticeDB.findOne({ _id: id, role: "teacher" });
    if (!notice) {
      return res.status(403).json({ error: "❌ You can only delete your own notices" });
    }

    await NoticeDB.findByIdAndDelete(id);
    res.status(200).json({ message: "✅ Notice deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting notice:", err);
    res.status(500).json({ error: "Server error" });
  }
};


async function GetAllComplaints(req, res) {
  try {
    const user = req.user; // { id, role } set by auth middleware

    // Allow only teacher role
    if (user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied: only teachers can view complaints" });
    }

    // Find complaints assigned to this teacher
    const complaints = await ComplaintDB.find({ "assignedTo.user": user._id })
      .populate("student", "name rollNo semester className") // fetch student details
      .sort({ createdAt: -1 });

    return res.status(200).json({ complaints });
  } catch (err) {
    console.error("GetAllComplaints error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}



async function UpdateComplaintByTeacher(req, res) {
  try {
    const user = req.user// should be "Teacher"
    const { id } = req.params;        // complaint id from URL
    const { feedback, status } = req.body;

    if (user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can update complaints" });
    }

    const complaint = await ComplaintDB.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // update fields
    if (feedback) complaint.feedback = feedback;
    if (status) complaint.status = status;

    // track who solved/updated
    complaint.solvedBy = { user: user._id, role: "Teacher" };

    await complaint.save();

    res.status(200).json({
      message: "Complaint updated successfully",
      complaint,
    });
  } catch (err) {
    console.error("Error updating complaint:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}


//Attendance Controllers



async function generateAttendanceQr(req, res) {
  const { teacherId, className, semester, location } = req.body;

  if (!teacherId || !className || !semester || !location?.latitude) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // --- Check if a QR already exists for this class & semester today ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingQR = await AttendanceQR.findOne({
      className,
      semester,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    if (existingQR) {
      return res.status(400).json({
        message: "A QR code has already been generated for this class and semester today.",
        qrToken: existingQR.qrToken,
        expiresAt: existingQR.expiresAt,
        teacherId: existingQR.teacherId,
      });
    }

    // --- Generate new QR ---
    const qrToken = crypto.randomBytes(16).toString("hex"); // unique token
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // valid 10 mins

    const qr = new AttendanceQR({
      teacherId,
      className,
      semester,
      location,
      qrToken,
      expiresAt,
    });

    await qr.save();

    res.json({ qrToken, expiresAt });
  } catch (err) {
    console.error("QR generation error:", err);
    res.status(500).json({ message: "Failed to generate QR" });
  }
}



async function markHoliday(req, res) {
  try {
    let { teacherId, className, semester, date, name } = req.body;

    // If no date is provided, use today
    const holidayDate = date ? new Date(date) : new Date();
    holidayDate.setHours(0, 0, 0, 0);

    // Default values for universal/system holidays
    if (!className) className = "ALL";
    if (!semester) semester = "ALL";
    if (!name) name = "System Generated Holiday";

    // Check if holiday already exists for the same date, class, and semester
    const existing = await HolidayDB.findOne({
      date: holidayDate,
      className,
      semester,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Holiday already exists for ${holidayDate.toDateString()} (${className}, ${semester})`,
      });
    }

    // Create new holiday
    const newHoliday = new HolidayDB({
      date: holidayDate,
      name,
      className,
      semester,
      markedBy: teacherId || null, // null for system-generated
    });

    await newHoliday.save();

    res.status(200).json({
      success: true,
      message: `Holiday "${name}" marked successfully for ${holidayDate.toDateString()} (${className}, ${semester})`,
    });
  } catch (err) {
    console.error("Mark holiday error:", err);
    res.status(500).json({ success: false, message: "Error marking holiday." });
  }
}



const getAllAttendance = async (req, res) => {
  try {
    let { className, semester, teacherId, month, year } = req.query;

    if (!className || !semester || !teacherId || !month || !year) {
      return res.status(400).json({ message: "Missing required filters" });
    }

    const semesterNum = Number(semester);
    const monthNum = Number(month);
    const yearNum = Number(year);

    const startDate = new Date(yearNum, monthNum - 1, 1, 0, 0, 0);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();


    // Fetch students
    const students = await StudentDB.find({
      className: { $regex: `^${className.trim()}$`, $options: "i" },
      semester: semester + "th" // converts 5 → "5th"
    });

    if (!students.length) return res.json({ attendance: [] });

    // Fetch holidays
    const holidays = await HolidayDB.find({
      className: { $in: ["ALL", className.trim()] },
      semester: { $in: ["ALL", semesterNum.toString()] },
      date: { $gte: startDate, $lte: endDate },
    }).select("date");

    const holidaySet = new Set(holidays.map((h) => new Date(h.date).toDateString()));

    // Fetch attendance records
    const records = await StudentAttendanceDB.find({
      className: className.trim(),
      semester: semesterNum,
      teacherId,
      date: { $gte: startDate, $lte: endDate },
    }).populate("studentId", "name rollNo");

    const attendanceData = students.map((student) => {
      const studentAttendance = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(yearNum, monthNum - 1, day);
        const dateStr = date.toDateString();

        if (date.getDay() === 0 || holidaySet.has(dateStr)) {
          studentAttendance.push("Holiday");
          continue;
        }

        const record = records.find(
          (r) => r.studentId._id.toString() === student._id.toString() && r.date.toDateString() === dateStr
        );

        studentAttendance.push(record ? (record.status === "present" ? "Present" : "Absent") : "Absent");
      }

      return {
        studentId: student._id,
        name: student.name,
        rollNo: student.rollNo,
        attendance: studentAttendance,
      };
    });

    res.json({ attendance: attendanceData });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
};




async function filterClasses(req, res) {
  try {
    let classNames = await StudentAttendanceDB.distinct("className");
    classNames = classNames.filter(Boolean).sort();
    const formatted = classNames.map((c) => ({ name: c }));
    res.status(200).json(formatted);

  } catch (err) {
    console.error("❌ Error fetching classes:", err);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
}



const getAttendanceSummary = async (req, res) => {
  try {
    const { className, semester, teacherId, month, year } = req.query;

    if (!className || !semester || !teacherId || !month || !year)
      return res.status(400).json({ message: "Missing required filters" });

    const semesterNum = Number(semester);
    const monthNum = Number(month);
    const yearNum = Number(year);

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

    const students = await StudentDB.find({
      className: { $regex: `^${className.trim()}$`, $options: "i" },
      semester: semester + "th" // converts 5 → "5th"
    });
    const holidays = await HolidayDB.find({
      className: { $in: ["ALL", className.trim()] },
      semester: { $in: ["ALL", semesterNum.toString()] },
      date: { $gte: startDate, $lte: endDate },
    }).select("date");

    const holidaySet = new Set(holidays.map((h) => h.date.toDateString()));

    const records = await StudentAttendanceDB.find({
      className: className.trim(),
      semester: semesterNum,
      teacherId,
      date: { $gte: startDate, $lte: endDate },
    }).populate("studentId", "name rollNo");

    const summaryData = students.map((student) => {
      let present = 0,
        holiday = 0,
        totalWorkingDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(yearNum, monthNum - 1, day);
        const dateStr = date.toDateString();

        if (date.getDay() === 0 || holidaySet.has(dateStr)) {
          holiday++;
          continue;
        }

        totalWorkingDays++;

        const record = records.find(
          (r) => r.studentId._id.toString() === student._id.toString() && r.date.toDateString() === dateStr
        );

        if (record && record.status === "present") present++;
      }

      const absent = totalWorkingDays - present;
      const percentage = totalWorkingDays > 0 ? ((present / totalWorkingDays) * 100).toFixed(2) : 0;

      return {
        studentId: student._id,
        name: student.name,
        rollNo: student.rollNo,
        totalWorkingDays,
        present,
        absent,
        holiday,
        percentage,
      };
    });

    res.json({ summary: summaryData });
  } catch (err) {
    console.error("❌ Summary fetch error:", err);
    res.status(500).json({ message: "Failed to fetch summary" });
  }
};



const getClassAttendancePercentage = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { month, year } = req.query;

    if (!teacherId) return res.status(400).json({ message: "Teacher ID required." });
    if (!month || !year) return res.status(400).json({ message: "Month and year required." });

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: "Invalid month or year." });
    }

    const formatDate = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const teacher = await TeacherDB.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found." });

    const classes = [...new Set(teacher.subjects.map((s) => s.course.toUpperCase()))];

    // Calculate all working days in month (excluding Sundays)
    const totalDays = new Date(yearNum, monthNum, 0).getDate();
    const allWorkingDays = [];
    for (let d = 1; d <= totalDays; d++) {
      const day = new Date(yearNum, monthNum - 1, d);
      if (day.getDay() !== 0) allWorkingDays.push(day);
    }

    const result = [];

    for (const className of classes) {
      const students = await StudentDB.find({ className: { $regex: new RegExp(`^${className}$`, "i") } });
      const studentIds = students.map((s) => s._id);

      if (studentIds.length === 0) {
        result.push({
          className,
          attendancePercentage: 0,
          totalWorkingDays: 0,
          presentCount: 0,
          totalStudents: 0,
        });
        continue;
      }

      // Fetch holidays for this month for this class or ALL classes
      const holidays = await HolidayDB.find({
        date: {
          $gte: new Date(yearNum, monthNum - 1, 1),
          $lte: new Date(yearNum, monthNum, 0, 23, 59, 59, 999),
        },
        $or: [
          { className: { $regex: new RegExp(`^${className}$`, "i") } },
          { className: { $exists: false } }, // global holiday if className not set
        ],
      });

      const holidaySet = new Set(holidays.map((h) => formatDate(new Date(h.date))));

      // Filter working days subtracting holidays
      const workingDays = allWorkingDays.filter((d) => !holidaySet.has(formatDate(d)));
      const workingDaysSet = new Set(workingDays.map(formatDate));
      const totalWorkingDays = workingDays.length;

      // Fetch attendance records (only present)
      const records = await StudentAttendanceDB.find({
        studentId: { $in: studentIds },
        date: {
          $gte: new Date(yearNum, monthNum - 1, 1),
          $lte: new Date(yearNum, monthNum, 0, 23, 59, 59, 999),
        },
        status: "present",
      });

      // Count present records that fall on valid working days
      let presentCount = 0;
      for (const record of records) {
        const recordDateStr = formatDate(new Date(record.date));
        if (workingDaysSet.has(recordDateStr)) {
          presentCount++;
        }
      }

      const attendancePercentage =
        totalWorkingDays > 0
          ? Number(((presentCount / (totalWorkingDays * students.length)) * 100).toFixed(1))
          : 0;

      result.push({
        className,
        attendancePercentage,
        totalWorkingDays,
        presentCount,
        totalStudents: students.length,
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error calculating attendance." });
  }
};












async function allStudent(req, res) {
  try {
    const { className, semester } = req.query;

    if (!className || !semester)
      return res.status(400).json({ message: "className and semester are required" });

    // Force correct types
    const semesterNum = Number(semester);

    console.log("Fetching students with:", { className: className.trim(), semester: semesterNum });

    const students = await StudentDB.find({ className: className.trim(), semester: semesterNum }).select(
      "name rollNo className semester"
    );

    console.log("Students fetched:", students.length, students.map((s) => s.name));

    res.json({ students });
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
}







//homework cloud storage 


async function HomeworkAssign(req, res) {
  try {
    const { teacherId, className, semester, subject, title, description, deadline } = req.body;

    // ✅ Collect uploaded file URLs (from Cloudinary middleware)
    const fileUrls = req.files?.map(file => file.path || file.secure_url) || [];

    const homework = new HomeworkDB({
      teacherId,
      className,
      semester,
      subject,
      title,
      description,
      attachments: fileUrls,
      deadline,
    });

    await homework.save();

    res.status(201).json({
      success: true,
      message: "✅ Homework assigned successfully",
      homework,
    });
  } catch (error) {
    console.error("Homework Assign Error:", error);
    res.status(500).json({
      success: false,
      message: "❌ Failed to assign homework",
      error: error.message,
    });
  }
}


async function AllAssignedHomeworks(req, res) {
  const { teacherId } = req.params;

  try {
    // Fetch all homeworks with populated student data
    const homeworks = await HomeworkDB.find({ teacherId })
      .populate({
        path: "submissions.studentId",
        select: "name email rollNumber className semester", // Fixed field names
      })
      .sort({ assignedDate: -1 }); // latest first

    // Fetch all students for statistics
    const students = await StudentDB.find({}, 'name email rollNumber className semester');

    // Calculate submission statistics for each homework
    const homeworksWithStats = homeworks.map(homework => {
      const classStudents = students.filter(student => {
        const semester = parseInt(student.semester.replace(/[^0-9]/g, ''), 10); // Extract numeric part
        return student.className === homework.className && semester === homework.semester;
      });

      const totalStudents = classStudents.length;
      const submittedCount = homework.submissions?.length || 0;
      const pendingCount = Math.max(0, totalStudents - submittedCount);
      const submissionRate = totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0;

      return {
        ...homework.toObject(),
        statistics: {
          totalStudents,
          submitted: submittedCount,
          pending: pendingCount,
          submissionRate: Math.round(submissionRate * 100) / 100 // Round to 2 decimal places
        }
      };
    });

    res.status(200).json({
      success: true,
      homeworks: homeworksWithStats,
      totalHomeworks: homeworks.length,
      message: "Homeworks fetched successfully"
    });
  } catch (error) {
    console.error("Error fetching homeworks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch homeworks",
      error: error.message,
    });
  }
}


async function deleteHomework(req, res) {
  try {
    const { id } = req.params
    await HomeworkDB.findByIdAndDelete(id)
    res.status(200).json({ message: "Homework deleted successfully" })
  } catch (error) {
    console.error("Error deleting homework:", error)
    res.status(500).json({ message: "Failed to delete homework" })
  }
}



const getLeaderboard = async (req, res) => {
  try {
    const { className, page = 1, limit = 20, date } = req.query;

    if (!className) {
      return res.status(400).json({ error: "className is required" });
    }

    const filterDate = date ? new Date(date) : new Date();
    const orderedDate = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());

    const startOfDay = new Date(orderedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(orderedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Find quiz for that class & date
    const quiz = await QuizDB.findOne({
      className,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    if (!quiz) {
      return res.json({ data: [], meta: { page, limit, total: 0 } });
    }

    let submissions = quiz.submissions || [];

    // ✅ Keep only the highest attempt per student
    const bestSubmissionsMap = {};
    submissions.forEach((sub) => {
      const id = sub.studentId.toString();
      if (!bestSubmissionsMap[id] || sub.score > bestSubmissionsMap[id].score) {
        bestSubmissionsMap[id] = sub;
      }
    });

    // Convert map back to array
    submissions = Object.values(bestSubmissionsMap);

    // Fetch student details
    const studentIds = submissions.map((s) => s.studentId);
    const students = await StudentDB.find({ _id: { $in: studentIds } })
      .select("name rollNo email semester")
      .lean();

    const studentMap = {};
    students.forEach((s) => {
      studentMap[s._id.toString()] = s;
    });

    // Attach student details
    submissions = submissions.map((sub) => ({
      ...sub,
      student: studentMap[sub.studentId.toString()] || {}
    }));

    // Sort by score desc
    submissions.sort((a, b) => b.score - a.score);

    // Assign rank (handling ties)
    let rank = 1;
    let prevScore = null;
    submissions = submissions.map((s, idx) => {
      if (prevScore !== null && s.score < prevScore) {
        rank = idx + 1;
      }
      prevScore = s.score;
      return { ...s, rank };
    });

    // Pagination
    const total = submissions.length;
    const paginated = submissions.slice((page - 1) * limit, page * limit);

    res.json({
      data: paginated,
      meta: { page: Number(page), limit: Number(limit), total },
      date: filterDate.toISOString().split("T")[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
};





// ✅ Create new schedule
const createSchedule = async (req, res) => {
  try {
    const schedule = new ScheduleDB(req.body);
    await schedule.save();
    res.status(201).json(schedule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Get all schedules (with filters: className, semester, dayOfWeek)
const getSchedules = async (req, res) => {
  try {
    const { className, semester, dayOfWeek } = req.query;
    const filter = {};
    if (className) filter.className = className;
    if (semester) filter.semester = semester;
    if (dayOfWeek) filter.dayOfWeek = dayOfWeek;

    const schedules = await ScheduleDB.find(filter).sort({ dayOfWeek: 1, startTime: 1 });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get single schedule by ID
const getScheduleById = async (req, res) => {
  try {
    const schedule = await ScheduleDB.findById(req.params.id);
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Update schedule
const updateSchedule = async (req, res) => {
  try {
    const updated = await ScheduleDB.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Schedule not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Delete schedule
const deleteSchedule = async (req, res) => {
  try {
    const deleted = await ScheduleDB.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Schedule not found" });
    res.json({ message: "Schedule deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};










async function TeacherLogout(req, res) {
  res.clearCookie("teacherToken");
  return res.status(200).json({ message: "✅ Logout successful" });
}





export default {
  RegisterTeacher,
  GetAllTeachers,
  Teacherlogin,
  GetTeacher,
  UpdateTeacher,
  TeacherLogout,
  getStudentsForTeacher,
  getLeavesForTeacher,
  UpdateStudentLeaveStatus,
  BulkRegisterTeachers,
  createNotice,
  getNotices,
  deleteTeacherNotice,
  updateTeacherNotice,
  changePassword,
  GetAllComplaints,
  UpdateComplaintByTeacher,
  generateAttendanceQr,
  markHoliday,
  getAllAttendance,
  filterClasses,
  getAttendanceSummary,
  allStudent,
  getClassAttendancePercentage,
  HomeworkAssign,
  AllAssignedHomeworks,
  deleteHomework,
  getLeaderboard,
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule
}