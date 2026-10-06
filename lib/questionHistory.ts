import clientPromise from "@/lib/mongodb";

export type QuestionHistoryDocument = {
  userId: string;
  question: string;
  answer: string;
  createdAt: Date;
};

export async function getQuestionHistoryCollection() {
  const client = await clientPromise;

  const db = client.db("halalwise");

  return db.collection<QuestionHistoryDocument>(
    "questionHistory"
  );
}