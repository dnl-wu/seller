import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  approveListing,
  createConversation,
  getConversation,
  postMessage,
  updateListing,
} from "../controllers/conversationsController.js";

export const conversationsRouter = Router();

conversationsRouter.post("/conversations", asyncHandler(createConversation));
conversationsRouter.get("/conversations/:id", asyncHandler(getConversation));
conversationsRouter.patch("/conversations/:id/listing", asyncHandler(updateListing));
conversationsRouter.post(
  "/conversations/:id/listing/approve",
  asyncHandler(approveListing),
);
conversationsRouter.post(
  "/conversations/:id/messages",
  asyncHandler(postMessage),
);
