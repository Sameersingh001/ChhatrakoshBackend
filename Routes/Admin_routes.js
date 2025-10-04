import express from 'express';
import AdminController from "../Controllers/Admin_Controller.js";
import { AdminVerifyToken } from '../Middlewares/VerifyToken.js';
import upload from '../Middlewares/UploadMIddle.js';

const Adminrouter = express.Router();

Adminrouter.post("/api/admin/notice", AdminVerifyToken, AdminController.createNotice);

// Get all notices
Adminrouter.get("/api/admin/notice", AdminVerifyToken, AdminController.getNotices);

// Get a notice by ID
Adminrouter.get("/api/admin/notice/:id", AdminVerifyToken, AdminController.getNoticeById);

// Update a notice
Adminrouter.post("/api/admin/notice/delete/:id", AdminVerifyToken, AdminController.deleteNotice);
Adminrouter.post("/api/admin/notice/update/:id", AdminVerifyToken, AdminController.updateNotice);

// Delete a notice


Adminrouter.get("/api/admin/leaves", AdminVerifyToken, AdminController.GetAdminToStudentLeave)
Adminrouter.get("/api/admin/students", AdminVerifyToken, AdminController.getAllStudentsForAdmin)
Adminrouter.get("/api/admin/allComplaints", AdminVerifyToken, AdminController.GetAllComplaints)
Adminrouter.get("/api/admin/:id",AdminVerifyToken,AdminController.AdminData)

Adminrouter.post("/api/admin/update/complaints/:id", AdminVerifyToken, AdminController.updateComplaint)
Adminrouter.post("/api/admin/leave/:id", AdminVerifyToken, AdminController.UpdateAdminToStudentLeave)
Adminrouter.post("/api/admin/register", upload.single("image"), AdminController.registerAdmin)
Adminrouter.post("/api/admin/login", AdminController.loginAdmin)
Adminrouter.post("/api/admin/logout", AdminController.AdminLogout)

Adminrouter.post("/api/admin/teacher-by-department", AdminVerifyToken, AdminController.fetchTeacherByDepartment)
Adminrouter.post("/api/admin/teachers/:id/AdminUpdateTeacher", AdminController.AdminUpdateTeacher)
Adminrouter.post("/api/admin/teacher/:id/toggle-status", AdminController.ToggleStatus)
Adminrouter.post("/api/admin/student/:id/toggle-status", AdminController.ToggleStudentStatus)
Adminrouter.post("/api/delete/teacher/:id", AdminController.AdminTeacherDelete)
Adminrouter.post("/api/delete/student/:id", AdminController.AdminStudentDelete)
Adminrouter.post("/api/admin/update/:id",upload.single("image"), AdminController.UpdateAdminProfile)


Adminrouter.get("/api/attendance/admin/all", AdminVerifyToken, AdminController.getAllAttendance);








export default Adminrouter