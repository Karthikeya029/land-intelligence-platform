import express from "express";
import cors from "cors";
import morgan from "morgan";

import landAdvisorRoutes from "./routes/landAdvisorRoutes.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();

const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "land-advisor-api" });
});

app.use("/api/land-advisor", landAdvisorRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
