import AdminRegister from "../Models/Admin/Admin_RegisterDB.js"
import TeacherDB from "../Models/Teacher/TeacherDB.js"
import StudentDB from "../Models/Student/StudentDB.js"
import LeavesDB from "../Models/Leaves/LeavesDB.js"
import ComplaintDB from "../Models/Complaint/ComplainDB.js"
import NoticeDB from "../Models/Notice/NoticeDB.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import StudentAttendanceDB from "../Models/Attendance/StudentAttendaceQr.js"


async function registerAdmin(req, res) {
  const { image, name, role, email, username, password, secretKey } = req.body;

  if (secretKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: " ❌ Invalid secret key" });
  }

  const existingAdmin = await AdminRegister.findOne({ username });
  const existingwithemail = await AdminRegister.findOne({ email });

  if (existingAdmin) {
    return res.status(400).json({ message: "❌ Admin already existed" });
  }
  if (existingwithemail) {
    return res.status(400).json({ message: "❌ Admin already existed" });
  }



  try {
    let newImage = null
    if (req.file) {
      newImage = `/uploads/admin/${req.file.filename}`;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new AdminRegister({
      image: newImage, name, role, email, username, password: hashedPassword
    });
    await newAdmin.save();
    return res.status(201).json({ message: "Admin registered successfully" });
  }
  catch (error) {
    return res.status(500).json({ message: " ❌ Internal server error" });
  }
}


async function loginAdmin(req, res) {
  const { username, password } = req.body
  try {
    const admin = await AdminRegister.findOne({ username })

    if (!admin) {
      return res.status(400).json({ message: "❌ Invalid username or password" });
    }
    const isPassMatch = await bcrypt.compare(password, admin.password)
    if (!isPassMatch) {
      return res.status(400).json({ message: "❌ Invalid username or password" });
    }

    //generate token 
    const token = jwt.sign({ username: admin.username, role: admin.role }, process.env.SECRET_KEY, { expiresIn: "1d" })
    res.cookie("token", token, {
      httpOnly: true, // JS can't access cookie
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // ✅ Send response
    return res.status(200).json({
      message: "✅ Login successful", token,
      admin: {
        id: admin._id,
        role: admin.role
      },
    });

  } catch (error) {
    return res.status(500).json({ message: " ❌ Internal server error" });
  }
}



async function AdminData(req, res) {
  const adminId = req.params.id;
  try {
    const admin = await AdminRegister.findById(adminId)
    if (!admin) {
      return res.status(404).json({ message: "❌ Admin not found" });
    }
    return res.status(200).json({ admin });
  } catch (error) {
    return res.status(500).json({ message: " ❌ Internal server error" });
  }
}


async function AdminUpdateTeacher(req, res) {
  const { id } = req.params;
  const { designation, department, subjects } = req.body;

  try {
    const teacher = await TeacherDB.findByIdAndUpdate(
      id,
      {
        designation,
        department,
        subjects,
      },
      { new: true } // return updated teacher
    );

    if (!teacher) {
      return res.status(404).json({ message: "❌ Teacher not found" });
    }
    res.status(200).json({
      message: "✅ Teacher updated successfully",
      teacher,
    });
  } catch (error) {
    console.error("❌ Error updating teacher:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


async function ToggleStatus(req, res) {
  const { id } = req.params;

  try {
    const teacher = await TeacherDB.findById(id);
    if (!teacher) {
      return res.status(404).json({ message: "❌ Teacher not found" });
    }

    teacher.isActive = !teacher.isActive;
    await teacher.save();

    res.status(200).json({
      message: `✅ Teacher ${teacher.isActive ? "activated" : "deactivated"} successfully`,
      teacher,
    });
  } catch (error) {
    console.error("❌ Error toggling teacher status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}


async function ToggleStudentStatus(req, res) {
  const { id } = req.params;

  try {
    const student = await StudentDB.findById(id);
    if (!student) {
      return res.status(404).json({ message: "❌ Student not found" });
    }

    // Toggle status
    student.status = student.status === "active" ? "inactive" : "active";
    await student.save();

    res.status(200).json({
      message: `✅ Student ${student.status} successfully`,
      status: student.status,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
    console.log(error)
  }
}



async function AdminTeacherDelete(req, res) {
  const { id } = req.params
  await TeacherDB.findByIdAndDelete(id)
}
async function AdminStudentDelete(req, res) {
  const { id } = req.params
  await StudentDB.findByIdAndDelete(id)
}




async function getAllStudentsForAdmin(req, res) {
  try {
    const students = await StudentDB.find();
    res.status(200).json(students);
  } catch (err) {
    console.error("❌ getAllStudentsForAdmin error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}


async function GetAdminToStudentLeave(req, res) {
  try {
    const leaves = await LeavesDB.find()
      .populate("studentId") // include student details
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


async function UpdateAdminToStudentLeave(req, res) {
  try {
    const { status } = req.body;
    const leave = await LeavesDB.findByIdAndUpdate(
      req.params.id,
      { adminStatus: status },
      { new: true }
    ).populate("studentId");

    if (!leave) return res.status(404).json({ message: "Leave not found" });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}






// ✅ Fetch teachers by department
async function fetchTeacherByDepartment(req, res) {
  try {
    const { department } = req.body;

    if (!department) {
      return res.status(400).json({ error: "Department is required" });
    }

    // ✅ Fetch teachers of that department
    const teachers = await TeacherDB.find({ department });

    // ✅ Fetch students where className = department
    const students = await StudentDB.find({ className: department });

    if ((!teachers || teachers.length === 0) && (!students || students.length === 0)) {
      return res.status(404).json({ message: "No teachers or students found for this department" });
    }

    res.status(200).json({
      department,
      teachers,
      students,
    });
  } catch (error) {
    console.error("Error fetching teachers & students by department:", error);
    res.status(500).json({ error: "Server error" });
  }
}




// Create a new notice
const createNotice = async (req, res) => {
  try {
    const { title, description, date, link, role } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required." });
    }

    const newNotice = new NoticeDB({
      title,
      description,
      date: date || Date.now(),
      link: link || "",
      role: role || "admin", // default role
    });

    await newNotice.save();
    res.status(201).json({ message: "Notice created successfully!", notice: newNotice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while creating notice." });
  }
};

// Get all notices (optionally filter by role)
const getNotices = async (req, res) => {
  try {
    const notices = await NoticeDB.find().sort({ date: -1 }); // latest first
    res.status(200).json(notices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while fetching notices." });
  }
};

// Get a single notice by ID
const getNoticeById = async (req, res) => {
  try {
    const notice = await NoticeDB.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: "Notice not found." });
    res.status(200).json(notice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while fetching the notice." });
  }
};

// Update a notice by ID
const updateNotice = async (req, res) => {
  try {
    const { title, description, date, link, role } = req.body;
    const updatedNotice = await NoticeDB.findByIdAndUpdate(
      req.params.id,
      { title, description, date, link, role },
      { new: true }
    );
    if (!updatedNotice) return res.status(404).json({ message: "Notice not found." });
    res.status(200).json({ message: "Notice updated successfully!", notice: updatedNotice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while updating notice." });
  }
};

// Delete a notice by ID
const deleteNotice = async (req, res) => {
  try {
    const Id = req.params.id
    const deletedNotice = await NoticeDB.findByIdAndDelete(Id);
    if (!deletedNotice) return res.status(404).json({ message: "Notice not found." });
    res.status(200).json({ message: "Notice deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while deleting notice." });
  }
};


async function UpdateAdminProfile(req, res) {
  try {
    const { id } = req.params;
    // Prepare update object
    const updateFields = {};
    if (req.body?.username) updateFields.username = req.body.username;
    if (req.file) updateFields.image = `/uploads/admin/${req.file.filename}`;

    // Find and update admin in one step
    const updatedAdmin = await AdminRegister.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true } // return updated document
    );

    if (!updatedAdmin) {
      return res.status(404).json({ message: "❌ Admin not found" });
    }

    res.status(200).json({
      message: "✅ Profile updated successfully",
      admin: updatedAdmin,
    });

  } catch (error) {
    console.error("UpdateAdminProfile error:", error);
    res.status(500).json({ message: "❌ Error updating profile" });
  }
}


// controllers/adminController.js

export async function GetAllComplaints(req, res) {
  try {
    const user = req.user; // { id, role } set by auth middleware

    // Allow only admin role
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: only admins can view complaints" });
    }

    // Fetch complaints
    const complaints = await ComplaintDB.find()
      .populate("student", "name rollNo semester className email phone") // student info
      .populate("assignedTo", "name email role department") // assigned teachers/admins
      .lean() // convert to plain JS objects for easier manipulation
      .sort({ createdAt: -1 });

    // Populate solvedBy names manually if stored as { user: ObjectId, role: String }
    for (let complaint of complaints) {
      if (complaint.solvedBy?.user) {
        const solvedUser = await TeacherDB.findById(complaint.solvedBy.user).select("name email role department");
        complaint.solvedBy = {
          ...complaint.solvedBy,
          name: solvedUser?.name || "",
          email: solvedUser?.email || "",
          department: solvedUser?.department || "",
        };
      }
    }

    return res.status(200).json({ complaints });
  } catch (err) {
    console.error("GetAllComplaints error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}




async function updateComplaint(req, res) {
  try {
    const adminId = req.headers.id
    const user = req.user
    const complaintId = req.params.id;
    const { feedback, status } = req.body;


    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: only admins can update complaints" });
    }

    const complaint = await ComplaintDB.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    complaint.feedback = feedback || complaint.feedback;
    complaint.status = status || complaint.status;
    complaint.solvedBy = {
      user : adminId,
      role : "Admin"
      // mark admin as solver
    }
    await complaint.save();

    return res.status(200).json({ message: "Complaint updated successfully", complaint });
  } catch (err) {
    console.error("updateComplaint error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}



const getAllAttendance = async (req, res) => {
  try {
    let { status, className, semester, date, search, page, limit } = req.query;

    // Default pagination
    if (!page) page = 1;
    if (!limit) limit = 10;
    const skip = (page - 1) * limit;

    // Parse date range
    let start, end;
    if (date) {
      start = new Date(date);
      start.setHours(0, 0, 0, 0);
      end = new Date(date);
      end.setHours(23, 59, 59, 999);
    } else {
      // Default to today
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    const filter = {};
    if (status && status !== "absent") filter.status = status.toLowerCase(); // Only apply if not absent
    if (className) filter.className = className;
    if (semester) filter.semester = Number(semester);

    filter.date = { $gte: start, $lte: end };

    let query = StudentAttendanceDB.find(filter)
      .populate("studentId", "name email rollNumber className semester")
      .populate("teacherId", "name email")
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Text search
    if (search) {
      const regex = new RegExp(search, "i");
      query = query.find({
        $or: [
          { "studentId.name": regex },
          { rollNumber: regex },
          { className: regex },
        ],
      });
    }

    let records = await query.exec();
    let total = await StudentAttendanceDB.countDocuments(filter);

    // If status is absent, find students not marked present
    if (!status || status === "absent") {
      // Find all students in the same class/semester
      const studentFilter = {};
      if (className) studentFilter.className = className;
      if (semester) studentFilter.semester = Number(semester);

      const allStudents = await StudentDB.find(studentFilter);

      const presentIds = records
        .filter((r) => r.status === "present")
        .map((r) => r.studentId._id.toString());

      const absentStudents = allStudents.filter(
        (s) => !presentIds.includes(s._id.toString())
      );

      const absentRecords = absentStudents.map((s) => ({
        _id: s._id,
        studentId: s,
        rollNumber: s.rollNumber,
        teacherId: null,
        className: s.className,
        semester: s.semester,
        date: start,
        status: "absent",
        location: null,
      }));

      records = [...records, ...absentRecords];

      // Only count absent + present if status filter is empty
      total = records.length;
    }

    res.status(200).json({
      success: true,
      data: records,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};






function AdminLogout(req, res) {
  res.clearCookie("token");
  return res.status(200).json({ message: "✅ Logout successful" });
}






export default {
  registerAdmin,
  loginAdmin,
  AdminLogout,
  AdminData,
  AdminUpdateTeacher,
  ToggleStatus,
  AdminTeacherDelete,
  ToggleStudentStatus,
  AdminStudentDelete,
  getAllStudentsForAdmin,
  GetAdminToStudentLeave,
  UpdateAdminToStudentLeave,
  fetchTeacherByDepartment,
  createNotice,
  deleteNotice,
  updateNotice,
  getNoticeById,
  getNotices,
  UpdateAdminProfile,
  GetAllComplaints,
  updateComplaint,
  getAllAttendance
};
