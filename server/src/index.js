import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import notebookRoutes from "./routes/notebooks.js";
import documentRoutes from "./routes/documents.js";
import shareRoutes from "./routes/share.js";
import { registerSocketServer } from "./socket.js";

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: clientOrigin,
    credentials: true
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "Lumina Notes API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/notebooks", notebookRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/share", shareRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong."
  });
});

registerSocketServer(server, clientOrigin);

connectDatabase(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lumina-notes")
  .then(() => {
    server.listen(port, () => {
      console.log(`Lumina Notes API listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
