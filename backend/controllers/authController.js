const jwt = require("jsonwebtoken");
const User = require("../models/User");

const ADMIN_EMAILS = [
  "pranavpolawar123@gmail.com",
  ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()) : []),
];

const isAdminEmail = (email) => {
  return ADMIN_EMAILS.includes((email || "").trim().toLowerCase());
};

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ $or: [{ email: cleanEmail }, { username }] });
    if (existing) {
      return res.status(400).json({ message: "User already exists with this email or username" });
    }

    // Auto-grant admin role to designated admin emails
    const role = isAdminEmail(cleanEmail) ? "admin" : "user";

    const user = await User.create({
      username,
      email: cleanEmail,
      password,
      role,
    });

    res.status(201).json({
      token: generateToken(user),
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Ensure designated admin email maintains admin role
    if (isAdminEmail(cleanEmail) && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    res.json({
      token: generateToken(user),
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Ensure designated admin email maintains admin role
    if (isAdminEmail(user.email) && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
