import express from "express";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import Settings from "../models/Settings.js";
import generateToken from "../utils/generateToken.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

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

/* POST /api/auth/google
   Sign in (or register, on first use) with a Google account. The client
   sends the ID token credential produced by Google Identity Services; we
   verify it with Google, then find-or-create the matching user.

   - If a local account already exists with the same, verified email, the
     Google account is linked to it (so the person can use either method).
   - Brand-new sign-ups go through the same admin-approval setting as a
     normal registration (Settings.pendingApprovalEnabled).
*/
router.post("/google", async (req, res, next) => {
  try {
    if (!googleClient) {
      return res.status(500).json({ message: "Google sign-in isn't configured on the server yet." });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Missing Google credential." });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: "Could not verify your Google sign-in. Please try again." });
    }

    if (!payload?.email) {
      return res.status(400).json({ message: "Your Google account has no email on file." });
    }

    if (!payload.email_verified) {
      return res.status(400).json({ message: "Your Google account's email address isn't verified." });
    }

    const email = payload.email.toLowerCase().trim();

    let user = await User.findOne({ googleId: payload.sub }).select("+password");
    let justCreated = false;

    if (!user) {
      // No Google-linked account yet — if a local account already uses
      // this (verified) email, link Google to it instead of duplicating.
      user = await User.findOne({ email }).select("+password");
      if (user && !user.googleId) {
        user.googleId = payload.sub;
        await user.save();
      }
    }

    if (!user) {
      const settings = await Settings.getSettings();
      const pendingApprovalEnabled = settings.pendingApprovalEnabled;

      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        googleId: payload.sub,
        authProvider: "google",
        isApproved: !pendingApprovalEnabled
      });
      justCreated = true;
    }

    if (!user.isApproved) {
      if (justCreated) {
        return res.status(201).json({
          message: "Your account has been created and is pending admin approval. You'll be able to log in once it's approved.",
          user: user.toSafeObject()
        });
      }
      return res.status(403).json({
        message: "Your account is still pending admin approval. You'll be able to log in once an admin approves it."
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "This account has been deactivated. Contact an administrator." });
    }

    const token = generateToken(user._id);
    res.status(justCreated ? 201 : 200).json({
      message: justCreated ? "Your account has been created." : undefined,
      token,
      user: user.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
});

/* GET /api/auth/me */
router.get("/me", protect, (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

export default router;
