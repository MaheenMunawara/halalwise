
import clientPromise from "@/lib/mongodb";

export type LearningProgressDocument = {
  userId: string;
  lessonId: string;
  lessonTitle: string;
  completedAt: Date;
};

export async function getLearningProgressCollection() {
  const client = await clientPromise;

  const db = client.db("halalwise");

  return db.collection<LearningProgressDocument>(
    "learningProgress"
  );
}
