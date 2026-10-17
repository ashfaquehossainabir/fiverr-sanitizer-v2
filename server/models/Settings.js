import mongoose from "mongoose";

// Singleton document (identified by the fixed `key`) that stores global,
// admin-controlled app toggles. Right now this only holds the "pending
// approval" switch, but it's built so more app-wide settings can be added
// here later without another migration.
const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "app_settings",
      unique: true
    },
    // When true (default): new sign-ups are created unapproved and must be
    // approved by an admin from the Admin Dashboard before they can log in
    // (the existing behavior).
    // When false: new sign-ups are auto-approved and logged in immediately,
    // skipping the approval queue entirely.
    pendingApprovalEnabled: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

settingsSchema.statics.getSettings = function getSettings() {
  return this.findOneAndUpdate(
    { key: "app_settings" },
    { $setOnInsert: { key: "app_settings" } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

export default mongoose.model("Settings", settingsSchema);
