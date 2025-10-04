import express from "express"
import Student_Controller from "../Controllers/Student_Controller.js"
import upload from "../Middlewares/UploadMIddle.js"
import { AdminVerifyToken, StudentVerifyToken } from "../Middlewares/VerifyToken.js"
import { TeacherVerifyToken } from "../Middlewares/VerifyToken.js"
import CloudUpload from '../Middlewares/CloudStorage.js'

const studentrouter = express.Router()


studentrouter.get("/api/students/:id", StudentVerifyToken, Student_Controller.GetStudent)
studentrouter.get("/api/student/myComplaints", StudentVerifyToken, Student_Controller.getMyComplaints)
studentrouter.post("/api/student/complaints",StudentVerifyToken, Student_Controller.createComplaint)
studentrouter.post("/api/student/leave/:leaveId",StudentVerifyToken, Student_Controller.DeleteLeaves)
studentrouter.get("/api/student/:id/my-leaves", StudentVerifyToken, Student_Controller.GetStudentLeaves)
studentrouter.get("/api/student/notices", StudentVerifyToken, Student_Controller.GetNotices)
studentrouter.get("/api/students/class/:className/:id", StudentVerifyToken, Student_Controller.MyClassStudents)


//homework routes

studentrouter.get("/api/student/homeworks/:studentId",StudentVerifyToken, Student_Controller.getStudentHomeworks);
studentrouter.post("/api/student/homework/submit",  CloudUpload.single("file"), Student_Controller.submitHomework)


// Quiz routetes


studentrouter.post("/api/student/quiz/submit", StudentVerifyToken, Student_Controller.submitQuiz);
studentrouter.post("/api/student/quiz/increment-attempts", StudentVerifyToken, Student_Controller.incrementAttempts);
studentrouter.get("/api/student/quiz/attempts/:studentId", StudentVerifyToken, Student_Controller.getStudentAttempts);
studentrouter.get("/api/student/quiz/leaderboard/monthly/:className", StudentVerifyToken, Student_Controller.getMonthlyLeaderboard);
studentrouter.get("/api/student/quiz/generate/:className", StudentVerifyToken, Student_Controller.QuizGenerate);




studentrouter.get("/api/student/:studentId/schedule", StudentVerifyToken, Student_Controller.getStudentSchedule);





studentrouter.get("/api/student/my-attendance/:studentId/:className/:semesterNumber", StudentVerifyToken, Student_Controller.MyAttendance)
studentrouter.get("/api/student/attendance/calculate/:studentId/:className/:semester", StudentVerifyToken, Student_Controller.calculateAttendance)

studentrouter.post("/api/student/mark-attendance", StudentVerifyToken, Student_Controller.markAttendance)

studentrouter.post("/api/student/complaints/:id",StudentVerifyToken, Student_Controller.editComplaintByStudent)
studentrouter.delete("/api/student/complaint/:id", StudentVerifyToken, Student_Controller.DeleteComplaints)
//change password route

studentrouter.post("/api/student/:id/changePassword", StudentVerifyToken, Student_Controller.changePassword)

studentrouter.post("/api/student/request-leaves", StudentVerifyToken, Student_Controller.RequestLeave )

studentrouter.post("/api/students/registration",upload.none(),Student_Controller.StudentRegistration )
studentrouter.post("/api/students/bulk-register",upload.none(),Student_Controller.bulkRegisterStudents )


studentrouter.post("/api/student/login",Student_Controller.StudentLogin )
studentrouter.post('/api/student/logout',StudentVerifyToken, Student_Controller.StudentLogout)
studentrouter.post("/api/student/:id", upload.single('photo'), Student_Controller.UpdateStudent)


studentrouter.get("/api/students/admin/:id",AdminVerifyToken, Student_Controller.GetStudent)

studentrouter.get("/api/students/teacher/:id",TeacherVerifyToken, Student_Controller.GetStudent)





export default studentrouter