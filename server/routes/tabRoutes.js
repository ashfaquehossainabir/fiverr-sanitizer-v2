import express from "express";
import Tab from "../models/Tab.js";
import Message from "../models/Message.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

async function assertOwnedTab(tabId, userId) {
  const tab = await Tab.findById(tabId);
  if (!tab) {
    const err = new Error("Tab not found.");
    err.status = 404;
    throw err;
  }
  if (String(tab.user) !== String(userId)) {
    const err = new Error("Not authorized to access this tab.");
    err.status = 403;
    throw err;
  }
  return tab;
}

/* GET /api/tabs - list all tabs for the logged-in user */
router.get("/", async (req, res, next) => {
  try {
    const tabs = await Tab.find({ user: req.user._id }).sort({ order: 1, createdAt: 1 });
    res.json({ tabs });
  } catch (err) {
    next(err);
  }
});

/* POST /api/tabs - create a new tab */
router.post("/", async (req, res, next) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Tab name is required." });
    }

    const count = await Tab.countDocuments({ user: req.user._id });
    const tab = await Tab.create({ user: req.user._id, name, order: count });

    res.status(201).json({ tab });
  } catch (err) {
    next(err);
  }
});

/* PUT /api/tabs/:id - rename a tab */
router.put("/:id", async (req, res, next) => {
  try {
    const tab = await assertOwnedTab(req.params.id, req.user._id);

    const name = (req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Tab name is required." });
    }

    tab.name = name;
    await tab.save();

    res.json({ tab });
  } catch (err) {
    next(err);
  }
});

/* DELETE /api/tabs/:id - delete a tab and its saved messages */
router.delete("/:id", async (req, res, next) => {
  try {
    const tab = await assertOwnedTab(req.params.id, req.user._id);

    await Message.deleteMany({ tab: tab._id });
    await tab.deleteOne();

    res.json({ message: "Tab deleted.", id: req.params.id });
  } catch (err) {
    next(err);
  }
});

/* ---------------- Messages nested under a tab ---------------- */

/* GET /api/tabs/:id/messages - list saved sanitized messages for a tab */
router.get("/:id/messages", async (req, res, next) => {
  try {
    await assertOwnedTab(req.params.id, req.user._id);

    const messages = await Message.find({ tab: req.params.id }).sort({ createdAt: -1 });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

/* POST /api/tabs/:id/messages - save a sanitized message to a tab */
router.post("/:id/messages", async (req, res, next) => {
  try {
    await assertOwnedTab(req.params.id, req.user._id);

    const { sanitizedText, originalText } = req.body;
    if (!sanitizedText || !sanitizedText.trim()) {
      return res.status(400).json({ message: "There is no sanitized text to save." });
    }

    const message = await Message.create({
      user: req.user._id,
      tab: req.params.id,
      originalText: originalText || "",
      sanitizedText
    });

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

/* DELETE /api/tabs/:id/messages/:messageId - delete a saved message */
router.delete("/:id/messages/:messageId", async (req, res, next) => {
  try {
    await assertOwnedTab(req.params.id, req.user._id);

    const message = await Message.findOne({ _id: req.params.messageId, tab: req.params.id });
    if (!message) {
      return res.status(404).json({ message: "Saved message not found." });
    }

    await message.deleteOne();
    res.json({ message: "Saved message deleted.", id: req.params.messageId });
  } catch (err) {
    next(err);
  }
});

export default router;
