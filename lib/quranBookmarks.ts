
import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "halalwise";
const COLLECTION_NAME = "quranBookmarks";

export async function getQuranBookmarksCollection() {
  const client = await clientPromise;
  const db = client.db(DATABASE_NAME);

  return db.collection(COLLECTION_NAME);
}
