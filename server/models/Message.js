import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    tab: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tab",
      required: true,
      index: true
    },
    originalText: {
      type: String,
      default: ""
    },
    sanitizedText: {
      type: String,
      required: [true, "Sanitized text is required."]
    }
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
