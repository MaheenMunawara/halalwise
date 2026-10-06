import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "halalwise";
const COLLECTION_NAME = "bookmarks";

export async function getBookmarksCollection() {
  const client = await clientPromise;

  const db = client.db(DATABASE_NAME);

  return db.collection(COLLECTION_NAME);
}