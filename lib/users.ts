import clientPromise from "@/lib/mongodb";

export async function getUsersCollection() {
  const client = await clientPromise;
  const db = client.db("halalwise");

  return db.collection("users");
}