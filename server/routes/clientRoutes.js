import express from "express";
import Client, { CLIENT_STATUSES } from "../models/Client.js";
import Message from "../models/Message.js";
import Task from "../models/Task.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

async function ownedClient(id, userId) {
  const c = await Client.findById(id);
  if (!c) {
    const err = new Error("Client not found.");
    err.status = 404;
    throw err;
  }
  if (String(c.user) !== String(userId)) {
    const err = new Error("Not authorized to access this client.");
    err.status = 403;
    throw err;
  }
  return c;
}

function pickFields(body) {
  const out = {};
  for (const key of ["name", "project", "status", "amount", "currency", "deadline", "followUpAt", "notes", "timezone"]) {
    if (body[key] !== undefined) out[key] = body[key] === "" && ["deadline", "followUpAt"].includes(key) ? null : body[key];
  }
  return out;
}

router.get("/", async (req, res, next) => {
  try {
    const clients = await Client.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json({ clients });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = pickFields(req.body);
    if (!data.name?.trim()) return res.status(400).json({ message: "Client name is required." });
    if (data.status && !CLIENT_STATUSES.includes(data.status)) {
      return res.status(400).json({ message: "Invalid status." });
    }
    const client = await Client.create({
      ...data,
      user: req.user._id,
      completedAt: data.status === "completed" ? new Date() : null
    });
    res.status(201).json({ client });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const client = await ownedClient(req.params.id, req.user._id);
    const data = pickFields(req.body);
    if (data.status && !CLIENT_STATUSES.includes(data.status)) {
      return res.status(400).json({ message: "Invalid status." });
    }
    if (data.name !== undefined && !String(data.name).trim()) {
      return res.status(400).json({ message: "Client name is required." });
    }
    const wasCompleted = client.status === "completed";
    Object.assign(client, data);
    if (client.status === "completed" && !wasCompleted) client.completedAt = new Date();
    else if (client.status !== "completed") client.completedAt = null;
    await client.save();
    res.json({ client });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const client = await ownedClient(req.params.id, req.user._id);
    // Keep the saved messages, just unlink them.
    await Message.updateMany({ client: client._id }, { $set: { client: null } });
    await Task.updateMany({ client: client._id }, { $set: { client: null } });
    await client.deleteOne();
    res.json({ message: "Client deleted.", id: req.params.id });
  } catch (err) {
    next(err);
  }
});

export default router;
