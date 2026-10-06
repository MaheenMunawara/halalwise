import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "halalwise";
const COLLECTION_NAME = "hadithBookmarks";

export async function getHadithBookmarksCollection() {
  const client = await clientPromise;
  const db = client.db(DATABASE_NAME);

  return db.collection(COLLECTION_NAME);
}