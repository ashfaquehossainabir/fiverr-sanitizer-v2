import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: 2,
      maxlength: 60
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address."]
    },
    password: {
      type: String,
      required: [
        function isPasswordRequired() {
          return this.authProvider !== "google";
        },
        "Password is required."
      ],
      minlength: 6,
      select: false
    },
    // How this account authenticates. "google" accounts don't have a
    // password until an admin sets one (or the user adds one later).
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },
    // Google's stable per-account identifier ("sub" claim). Only set for
    // accounts created via, or linked to, Google Sign-In.
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // New registrations start unapproved. An admin must approve the
    // account from the Admin Dashboard before the user can log in.
    isApproved: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    isApproved: this.isApproved,
    authProvider: this.authProvider,
    hasPassword: Boolean(this.password),
    createdAt: this.createdAt
  };
};

export default mongoose.model("User", userSchema);
