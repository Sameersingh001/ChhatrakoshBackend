import mongoose from "mongoose";

const AdminRegisterSchema = new mongoose.Schema({
    image: {type:String, default:null},
    name: {type:String, required:true},
    role: {type:String, default: "Admin"},
    email: {type:String, required:true, unique:true},
    username: {type:String, required: true, unique:true},
    password: {type:String, required:true}
})

const AdminRegister = mongoose.model("Admin", AdminRegisterSchema, "Admin")

export default AdminRegister