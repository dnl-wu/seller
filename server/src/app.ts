import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { healthRouter } from "./routes/health.js";
import { conversationsRouter } from "./routes/conversations.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", healthRouter);
app.use("/api", conversationsRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Malformed request" });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
