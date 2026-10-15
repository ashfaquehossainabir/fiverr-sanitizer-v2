import mongoose from "mongoose";

export const CLIENT_STATUSES = ["lead", "active", "delivered", "revision", "completed", "archived"];

// One row per buyer/order. Powers the lightweight client tracker and the
// follow-up reminders on the dashboard.
const clientSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: [true, "Client name is required."], trim: true, maxlength: 60 },
    project: { type: String, trim: true, maxlength: 100, default: "" },
    status: { type: String, enum: CLIENT_STATUSES, default: "lead" },
    amount: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, maxlength: 4, default: "USD" },
    deadline: { type: Date, default: null },
    followUpAt: { type: Date, default: null },
    notes: { type: String, maxlength: 2000, default: "" },
    // IANA zone like "Europe/London"; lets the UI show the buyer's local time.
    timezone: { type: String, trim: true, maxlength: 64, default: "" },
    // Set automatically the moment an order moves to "completed"; powers the
    // "earned this month" figure and the monthly goal on the Overview.
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("Client", clientSchema);
