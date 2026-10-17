// Must be the first import: ES module imports are evaluated before the rest of this file,
// so a later dotenv.config() call ran too late for modules that read process.env on load.
import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import tabRoutes from "./routes/tabRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import insightsRoutes from "./routes/insightsRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET in environment variables.");
  process.exit(1);
}

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tabs", tabRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/tasks", taskRoutes);
// insights, export and search live at /api/insights, /api/export, /api/search
app.use("/api", insightsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
