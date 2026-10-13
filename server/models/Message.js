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
    },
    // Pinned messages float to the top of their tab.
    pinned: {
      type: Boolean,
      default: false
    },
    // Optional link to a client/order so a conversation can be found later.
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
