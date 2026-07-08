import mongoose from "mongoose";
import { env } from "./env.js";

const READY_STATE_LABELS: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});
mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

export async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function getMongoConnectionState(): string {
  return READY_STATE_LABELS[mongoose.connection.readyState] ?? "unknown";
}
