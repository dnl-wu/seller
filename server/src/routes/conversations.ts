import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createConversation,
  getConversation,
  postMessage,
} from "../controllers/conversationsController.js";

export const conversationsRouter = Router();

conversationsRouter.post("/conversations", asyncHandler(createConversation));
conversationsRouter.get("/conversations/:id", asyncHandler(getConversation));
conversationsRouter.post(
  "/conversations/:id/messages",
  asyncHandler(postMessage),
);
