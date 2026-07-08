import type { Request, Response } from "express";
import { z } from "zod";
import { UpdateSellerPreferencesRequestSchema } from "@seller/shared";
import {
  getSellerPreferences,
  updateSellerPreferences,
} from "../services/sellerPreferenceService.js";

const SellerIdParamSchema = z.string().trim().min(1);

function parseSellerId(req: Request, res: Response): string | null {
  const parsed = SellerIdParamSchema.safeParse(req.params.sellerId);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid seller id" });
    return null;
  }
  return parsed.data;
}

export async function getPreferences(req: Request, res: Response): Promise<void> {
  const sellerId = parseSellerId(req, res);
  if (!sellerId) return;

  // Authentication is intentionally deferred; sellerId is currently the
  // trusted temporary browser identity created by the frontend.
  res.json(await getSellerPreferences(sellerId));
}

export async function updatePreferences(req: Request, res: Response): Promise<void> {
  const sellerId = parseSellerId(req, res);
  if (!sellerId) return;

  const parsed = UpdateSellerPreferencesRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  res.json(await updateSellerPreferences(sellerId, parsed.data));
}
