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

settingsSchema.statics.getSettings = async function getSettings() {
  let settings = await this.findOne({ key: "app_settings" });
  if (!settings) {
    settings = await this.create({ key: "app_settings" });
  }
  return settings;
};

export default mongoose.model("Settings", settingsSchema);
