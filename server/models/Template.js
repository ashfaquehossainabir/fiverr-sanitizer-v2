import mongoose from "mongoose";

// A reusable quick-reply. Body may contain {{placeholders}} such as
// {{client}}, {{project}}, {{deadline}} that the client fills in before use.
const templateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: [true, "Title is required."], trim: true, maxlength: 80 },
    body: { type: String, required: [true, "Template text is required."], maxlength: 3000 },
    category: { type: String, trim: true, maxlength: 30, default: "General" },
    usageCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("Template", templateSchema);
