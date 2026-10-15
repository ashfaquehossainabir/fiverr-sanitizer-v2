import express from "express";
import Task, { TASK_PRIORITIES } from "../models/Task.js";
import Client from "../models/Client.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

async function ownedTask(id, userId) {
  const t = await Task.findById(id);
  if (!t) {
    const err = new Error("Task not found.");
    err.status = 404;
    throw err;
  }
  if (String(t.user) !== String(userId)) {
    const err = new Error("Not authorized to access this task.");
    err.status = 403;
    throw err;
  }
  return t;
}

// Only link a task to a client the user actually owns.
async function resolveClient(clientId, userId) {
  if (!clientId) return null;
  const c = await Client.findOne({ _id: clientId, user: userId }).select("_id");
  return c ? c._id : null;
}

function pickFields(body) {
  const out = {};
  for (const key of ["text", "done", "dueDate", "priority", "client"]) {
    if (body[key] === undefined) continue;
    out[key] = body[key] === "" && ["dueDate", "client"].includes(key) ? null : body[key];
  }
  return out;
}

router.get("/", async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ done: 1, createdAt: -1 }).limit(500);
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = pickFields(req.body);
    if (!data.text || !String(data.text).trim()) return res.status(400).json({ message: "Task text is required." });
    if (data.priority && !TASK_PRIORITIES.includes(data.priority)) return res.status(400).json({ message: "Invalid priority." });
    const task = await Task.create({
      text: data.text,
      priority: data.priority || "normal",
      dueDate: data.dueDate || null,
      client: await resolveClient(data.client, req.user._id),
      user: req.user._id
    });
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
});

// Must be registered before "/:id" so "completed" is not read as an id.
router.delete("/completed/all", async (req, res, next) => {
  try {
    const result = await Task.deleteMany({ user: req.user._id, done: true });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const task = await ownedTask(req.params.id, req.user._id);
    const data = pickFields(req.body);
    if (data.text !== undefined && !String(data.text).trim()) return res.status(400).json({ message: "Task text is required." });
    if (data.priority && !TASK_PRIORITIES.includes(data.priority)) return res.status(400).json({ message: "Invalid priority." });
    if (data.client !== undefined) data.client = await resolveClient(data.client, req.user._id);
    if (data.done !== undefined) {
      data.done = Boolean(data.done);
      if (data.done && !task.done) task.doneAt = new Date();
      if (!data.done) task.doneAt = null;
    }
    Object.assign(task, data);
    if (req.body.addFocusSession) task.focusSessions += 1;
    await task.save();
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const task = await ownedTask(req.params.id, req.user._id);
    await task.deleteOne();
    res.json({ message: "Task deleted.", id: req.params.id });
  } catch (err) {
    next(err);
  }
});

export default router;
