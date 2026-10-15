import mongoose from "mongoose";

export const TASK_PRIORITIES = ["low", "normal", "high"];

// A to-do item for the Planner. Optionally tied to a client/order and a due day.
const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: [true, "Task text is required."], trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
    doneAt: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: TASK_PRIORITIES, default: "normal" },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },
    // Completed focus sessions (25 min) spent on this task.
    focusSessions: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("Task", taskSchema);
