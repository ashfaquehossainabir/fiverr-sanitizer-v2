import express from "express";
import User from "../models/User.js";
import Tab from "../models/Tab.js";
import Message from "../models/Message.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

/* PUT /api/users/profile - update name/email */
router.put("/profile", async (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ message: "Provide a name or email to update." });
    }

    if (name && name.trim().length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters." });
    }

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        return res.status(400).json({ message: "Please provide a valid email address." });
      }
      if (normalizedEmail !== req.user.email) {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
          return res.status(409).json({ message: "That email is already in use by another account." });
        }
      }
      req.user.email = normalizedEmail;
    }

    if (name) req.user.name = name.trim();

    await req.user.save();

    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
});

/* PUT /api/users/password - change password */
router.put("/password", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const userWithPassword = await User.findById(req.user._id).select("+password");
    const isMatch = await userWithPassword.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    userWithPassword.password = newPassword;
    await userWithPassword.save();

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    next(err);
  }
});

/* DELETE /api/users/account - delete account + all owned data */
router.delete("/account", async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Enter your password to confirm account deletion." });
    }

    const userWithPassword = await User.findById(req.user._id).select("+password");
    const isMatch = await userWithPassword.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Password is incorrect." });
    }

    const tabIds = await Tab.find({ user: req.user._id }).distinct("_id");
    await Message.deleteMany({ tab: { $in: tabIds } });
    await Tab.deleteMany({ user: req.user._id });
    await User.findByIdAndDelete(req.user._id);

    res.json({ message: "Account deleted successfully." });
  } catch (err) {
    next(err);
  }
});

export default router;
