import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getPreferences,
  updatePreferences,
} from "../controllers/sellerPreferencesController.js";

export const sellersRouter = Router();

sellersRouter.get("/sellers/:sellerId/preferences", asyncHandler(getPreferences));
sellersRouter.patch("/sellers/:sellerId/preferences", asyncHandler(updatePreferences));
