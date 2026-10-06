import crypto from "crypto";
import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "halalwise";
const COLLECTION_NAME = "passwordResetTokens";

export async function getPasswordResetCollection() {
  const client = await clientPromise;
  const db = client.db(DATABASE_NAME);

  return db.collection(COLLECTION_NAME);
}

export function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export function getResetTokenExpiry() {
  return new Date(Date.now() + 15 * 60 * 1000);
}