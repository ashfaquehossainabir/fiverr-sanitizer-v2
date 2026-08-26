import express from "express";
import User from "../models/User.js";
import Settings from "../models/Settings.js";
import generateToken from "../utils/generateToken.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

/* POST /api/auth/register */
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are all required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: "An account with that email already exists." });
    }

    // Whether the "pending approval" flow is even in effect is controlled
    // by the admin from the Admin Dashboard (Settings toggle).
    const settings = await Settings.getSettings();
    const pendingApprovalEnabled = settings.pendingApprovalEnabled;

    // When the toggle is ON (default): accounts are created unapproved and
    // are NOT logged in automatically. A notification is raised for admins
    // (surfaced on the Admin Dashboard) and the account stays locked out
    // of login until an admin approves it there.
    //
    // When the toggle is OFF: the approval queue is skipped entirely — the
    // account is created already approved, and we log them in immediately
    // (same as a normal login) so the client can redirect straight to the
    // dashboard.
    const user = await User.create({
      name: name.trim(),
      email,
      password,
      isApproved: !pendingApprovalEnabled
    });

    if (!pendingApprovalEnabled) {
      const token = generateToken(user._id);
      return res.status(201).json({
        message: "Your account has been created.",
        token,
        user: user.toSafeObject()
      });
    }

    res.status(201).json({
      message: "Your account has been created and is pending admin approval. You'll be able to log in once it's approved.",
      user: user.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
});

/* POST /api/auth/login */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        message: "Your account is still pending admin approval. You'll be able to log in once an admin approves it."
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "This account has been deactivated. Contact an administrator." });
    }

    const token = generateToken(user._id);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
});

/* GET /api/auth/me */
router.get("/me", protect, (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

export default router;
