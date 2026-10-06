import { getDb } from "@/lib/db";

export async function getQuestionsCollection() {
  const db = await getDb();
  return db.collection("questions");
}