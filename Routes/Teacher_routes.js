import express from "express"
import TeacherController from "../Controllers/Teacher_Controller.js"
import { AdminVerifyToken } from "../Middlewares/VerifyToken.js"
import { TeacherVerifyToken } from "../Middlewares/VerifyToken.js"
import upload from '../Middlewares/UploadMIddle.js'
import CloudUpload from "../Middlewares/CloudStorage.js"
 
const Teacherrouter = express.Router()




//Post Requests

Teacherrouter.post("/api/teacher/notices", TeacherVerifyToken, TeacherController.createNotice)
Teacherrouter.post("/api/teacher/notice/update/:id", TeacherVerifyToken, TeacherController.updateTeacherNotice)
Teacherrouter.post("/api/teacher/notice/delete/:id", TeacherVerifyToken, TeacherController.deleteTeacherNotice)
Teacherrouter.get("/api/teacher/notices", TeacherVerifyToken, TeacherController.getNotices)
Teacherrouter.get("/api/teacher/students",TeacherVerifyToken, TeacherController.getStudentsForTeacher)
Teacherrouter.get("/api/teacher/complaints", TeacherVerifyToken, TeacherController.GetAllComplaints)

Teacherrouter.get("/api/teacher/classes",TeacherVerifyToken, TeacherController.filterClasses)
Teacherrouter.get("/api/teacher/attendance/summary", TeacherVerifyToken, TeacherController.getAttendanceSummary)
Teacherrouter.get("/api/teacher/attendance", TeacherVerifyToken, TeacherController.getAllAttendance)
Teacherrouter.get("/api/teacher/students", TeacherVerifyToken, TeacherController.allStudent)


// Schedule routes
Teacherrouter.post("/api/teacher/schedule", TeacherVerifyToken, TeacherController.createSchedule)
Teacherrouter.get("/api/teacher/schedules", TeacherVerifyToken, TeacherController.getSchedules)
Teacherrouter.get("/api/teacher/schedule/:id", TeacherVerifyToken, TeacherController.getScheduleById)
Teacherrouter.post("/api/teacher/schedule/update/:id", TeacherVerifyToken, TeacherController.updateSchedule)
Teacherrouter.post("/api/teacher/schedule/delete/:id", TeacherVerifyToken, TeacherController.deleteSchedule)


// Leaderboard routes
Teacherrouter.get("/api/teacher/leaderboard", TeacherVerifyToken, TeacherController.getLeaderboard)


// Homework CLoud based Storage

Teacherrouter.post("/api/teacher/homework/delete/:id", TeacherVerifyToken, TeacherController.deleteHomework)
Teacherrouter.post("/api/teacher/homework-assigned", CloudUpload.array("attachments", 5), TeacherController.HomeworkAssign)
Teacherrouter.get("/api/teacher/homework/:teacherId", TeacherController.AllAssignedHomeworks)



//Attendace QR
Teacherrouter.get("/api/teacher/:teacherId/classes-attendance", TeacherVerifyToken, TeacherController.getClassAttendancePercentage)

Teacherrouter.post("/api/teacher/mark-holiday", TeacherVerifyToken, TeacherController.markHoliday)
Teacherrouter.post("/api/teacher/generate", TeacherVerifyToken, TeacherController.generateAttendanceQr)

Teacherrouter.post("/api/complaints/:id", TeacherVerifyToken, TeacherController.UpdateComplaintByTeacher)



//change password route 
Teacherrouter.post("/api/teacher/:id/changePassword", TeacherVerifyToken, TeacherController.changePassword)


Teacherrouter.post("/api/teachers/register", AdminVerifyToken, TeacherController.RegisterTeacher)
Teacherrouter.post("/api/teachers/bulk-register", AdminVerifyToken, TeacherController.BulkRegisterTeachers)
Teacherrouter.post('/api/teacher/logout',TeacherVerifyToken, TeacherController.TeacherLogout)
Teacherrouter.get("/api/teacher/leaves",TeacherVerifyToken, TeacherController.getLeavesForTeacher);

Teacherrouter.post("/api/teacher/leaves/:id", TeacherController.UpdateStudentLeaveStatus)
//Get Requests


Teacherrouter.get("/api/teachers",AdminVerifyToken, TeacherController.GetAllTeachers)
Teacherrouter.get("/api/teacher/:id",TeacherVerifyToken, TeacherController.GetTeacher)

//admin veri token routes

Teacherrouter.get("/api/admin/teacher/:id", AdminVerifyToken, TeacherController.GetTeacher); 
Teacherrouter.post('/api/teachers/:id', upload.single('image'), TeacherController.UpdateTeacher)
Teacherrouter.post("/api/teacher/login", TeacherController.Teacherlogin)

    
export default Teacherrouter