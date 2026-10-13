import express from "express";
import Message from "../models/Message.js";
import Tab from "../models/Tab.js";
import Template from "../models/Template.js";
import Client from "../models/Client.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

const DAY = 24 * 60 * 60 * 1000;

/* GET /api/insights - numbers for the dashboard overview */
router.get("/insights", async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY);
    const fourteenAgo = new Date(now.getTime() - 14 * DAY);

    const [totalMessages, thisWeek, lastWeek, pinned, tabs, templates, clients] = await Promise.all([
      Message.countDocuments({ user: userId }),
      Message.countDocuments({ user: userId, createdAt: { $gte: weekAgo } }),
      Message.countDocuments({ user: userId, createdAt: { $gte: fourteenAgo, $lt: weekAgo } }),
      Message.countDocuments({ user: userId, pinned: true }),
      Tab.find({ user: userId }).select("name"),
      Template.find({ user: userId }).sort({ usageCount: -1 }).limit(3).select("title usageCount"),
      Client.find({ user: userId })
    ]);

    // Messages per day for the last 14 days (zero-filled).
    const recent = await Message.find({ user: userId, createdAt: { $gte: fourteenAgo } }).select("createdAt");
    const perDay = {};
    for (let i = 13; i >= 0; i--) {
      perDay[new Date(now.getTime() - i * DAY).toISOString().slice(0, 10)] = 0;
    }
    recent.forEach((m) => {
      const key = m.createdAt.toISOString().slice(0, 10);
      if (key in perDay) perDay[key] += 1;
    });

    const open = clients.filter((c) => ["lead", "active", "delivered", "revision"].includes(c.status));
    const completed = clients.filter((c) => c.status === "completed");
    const pipelineValue = open.reduce((sum, c) => sum + (c.amount || 0), 0);
    const earned = completed.reduce((sum, c) => sum + (c.amount || 0), 0);

    const byStatus = {};
    clients.forEach((c) => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    });

    const dueFollowUps = clients
      .filter((c) => c.followUpAt && c.followUpAt <= new Date(now.getTime() + DAY) && !["completed", "archived"].includes(c.status))
      .sort((a, b) => a.followUpAt - b.followUpAt)
      .slice(0, 8);

    const upcomingDeadlines = clients
      .filter((c) => c.deadline && c.deadline >= new Date(now.getTime() - DAY) && !["completed", "archived"].includes(c.status))
      .sort((a, b) => a.deadline - b.deadline)
      .slice(0, 5);

    res.json({
      totals: { messages: totalMessages, pinned, tabs: tabs.length, clients: clients.length },
      week: { thisWeek, lastWeek },
      perDay: Object.entries(perDay).map(([date, count]) => ({ date, count })),
      topTemplates: templates,
      pipeline: { openCount: open.length, pipelineValue, earned, byStatus },
      dueFollowUps,
      upcomingDeadlines
    });
  } catch (err) {
    next(err);
  }
});

/* GET /api/search?q=word - find a saved message across every tab */
router.get("/search", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim().slice(0, 80);
    if (q.length < 2) return res.json({ results: [] });

    // Escape user input so it is matched literally, never as a regex.
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");

    const results = await Message.find({
      user: req.user._id,
      $or: [{ sanitizedText: rx }, { originalText: rx }]
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("tab", "name")
      .populate("client", "name project");

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

/* GET /api/export - full JSON backup of the user's own workspace */
router.get("/export", async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [tabs, messages, templates, clients] = await Promise.all([
      Tab.find({ user: userId }).lean(),
      Message.find({ user: userId }).lean(),
      Template.find({ user: userId }).lean(),
      Client.find({ user: userId }).lean()
    ]);
    res.setHeader("Content-Disposition", 'attachment; filename="sanitizer-backup.json"');
    res.json({ exportedAt: new Date().toISOString(), tabs, messages, templates, clients });
  } catch (err) {
    next(err);
  }
});

export default router;
