import express from "express";
import connectDB from "./config/db_Connect.js";
import dotenv from "dotenv"
import Adminrouter from "./Routes/Admin_routes.js";
import Teacherrouter from "./Routes/Teacher_routes.js";
import studentrouter from "./Routes/Student_routes.js";
import path from "path"
import helmet from "helmet"
import LoginCheck from "./Routes/LoginCheckRoute.js"
import "./scheduler.js"; // activates the cron job



dotenv.config();
const app = express();

app.use(express.json())
app.use(express.urlencoded({extended : true}))
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(helmet())



app.use("/", Adminrouter);
app.use("/", Teacherrouter);
app.use("/", studentrouter)
app.use("/", LoginCheck)



connectDB().then(()=>{
    app.listen(process.env.PORT || 3000, () =>{
        console.log("Server is running At Port", process.env.PORT || 3000)
    })
}).catch((err) =>{
    console.log("Failed to connect to DB", err);
})