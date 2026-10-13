import express from "express";
import Template from "../models/Template.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

async function ownedTemplate(id, userId) {
  const t = await Template.findById(id);
  if (!t) {
    const err = new Error("Template not found.");
    err.status = 404;
    throw err;
  }
  if (String(t.user) !== String(userId)) {
    const err = new Error("Not authorized to access this template.");
    err.status = 403;
    throw err;
  }
  return t;
}

router.get("/", async (req, res, next) => {
  try {
    const templates = await Template.find({ user: req.user._id }).sort({ usageCount: -1, createdAt: -1 });
    res.json({ templates });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, body, category } = req.body;
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ message: "Title and template text are required." });
    }
    const template = await Template.create({
      user: req.user._id,
      title: title.trim(),
      body,
      category: category?.trim() || "General"
    });
    res.status(201).json({ template });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const t = await ownedTemplate(req.params.id, req.user._id);
    const { title, body, category } = req.body;
    if (title !== undefined) t.title = title.trim();
    if (body !== undefined) t.body = body;
    if (category !== undefined) t.category = category.trim() || "General";
    if (!t.title || !t.body.trim()) {
      return res.status(400).json({ message: "Title and template text are required." });
    }
    await t.save();
    res.json({ template: t });
  } catch (err) {
    next(err);
  }
});

/* POST /api/templates/:id/use - bump usage counter so favourites float to the top */
router.post("/:id/use", async (req, res, next) => {
  try {
    const t = await ownedTemplate(req.params.id, req.user._id);
    t.usageCount += 1;
    await t.save();
    res.json({ template: t });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const t = await ownedTemplate(req.params.id, req.user._id);
    await t.deleteOne();
    res.json({ message: "Template deleted.", id: req.params.id });
  } catch (err) {
    next(err);
  }
});

export default router;
