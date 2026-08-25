// One-off script to create (or promote) an admin account.
// Usage: set ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME in server/.env, then:
//   npm run seed:admin
import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import mongoose from "mongoose";

dotenv.config();

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env before running this script.");
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("ADMIN_PASSWORD must be at least 6 characters.");
    process.exit(1);
  }

  await connectDB();

  let user = await User.findOne({ email }).select("+password");

  if (user) {
    user.role = "admin";
    user.isActive = true;
    user.isApproved = true;
    await user.save();
    console.log(`Existing user ${email} promoted to admin.`);
  } else {
    user = await User.create({ name, email, password, role: "admin", isApproved: true });
    console.log(`Admin account created for ${email}.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Failed to seed admin:", err.message);
  process.exit(1);
});
