import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "homeworks assigned",  // Cloudinary folder
    resource_type: "raw", // ✅ needed for PDFs, DOCX, ZIP, etc.
    allowed_formats: ["pdf", "docx"], // restrict file types
  },
});

const CloudUpload = multer({ storage });

export default CloudUpload;
