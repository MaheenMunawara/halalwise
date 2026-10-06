export type LearnCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  order: number;
  published: boolean;
};

export type LearnLesson = {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  order: number;
  estimatedMinutes: number;
  sourceIds: string[];
  relatedLessonIds: string[];
  published: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};