// routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";

const LoginCheck = express.Router();

LoginCheck.get("/api/auth/check", (req, res) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return res.status(401).json({ user: null });

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map(c => c.trim().split("="))
  );

  const token =
    cookies["token"] || cookies["teacherToken"] || cookies["studentToken"];
  if (!token) return res.status(401).json({ user: null });

  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ user: null });

    return res.json({
      user: {
        _id: decoded._id || decoded.id,
        role: decoded?.role.toLowerCase(),
      },
    });
  });
});

export default LoginCheck;
