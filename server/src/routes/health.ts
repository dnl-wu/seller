import { Router } from "express";
import { getMongoConnectionState } from "../config/db.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    mongo: getMongoConnectionState(),
  });
});
