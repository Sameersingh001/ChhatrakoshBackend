import jwt from "jsonwebtoken";

// 🔹 Generic helper
function verifyToken(req, res, next, tokenName) {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return res.status(401).json({ message: "Unauthorized - No cookie" });
  }

  // Parse cookies
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map(c => c.trim().split("="))
  );
  const token = cookies[tokenName];

  if (!token) {
    return res.status(401).json({ message: `Unauthorized - No ${tokenName}` });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden - Invalid token" });
    }

   // Ensure decoded exists
  const userId = decoded?._id || decoded?.id;
  const role = decoded?.role ? decoded.role.toLowerCase() : "unknown";

  req.user = {
    _id: userId || null,
    role, // "teacher", "admin", "student", or "unknown"
  };
    next();
  });
}

// 🔹 Admin Middleware
export function AdminVerifyToken(req, res, next) {
  verifyToken(req, res, next, "token"); // or "adminToken" if you want separate
}

// 🔹 Teacher Middleware
export function TeacherVerifyToken(req, res, next) {
  verifyToken(req, res, next, "teacherToken");
}

// 🔹 Student Middleware
export function StudentVerifyToken(req, res, next) {
  verifyToken(req, res, next, "studentToken");
}


