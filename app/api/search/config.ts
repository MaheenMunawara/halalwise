export const SEARCH_SOURCES = {
  quran: {
    collection: "quran_verses",
    type: "quran",
    enabled: true,
  },

  hadith: {
    collection: "sources",
    type: "hadith",
    enabled: true,
  },

  lessons: {
    collection: "learn_lessons",
    type: "lesson",
    enabled: true,
  },

  categories: {
    collection: "learn_categories",
    type: "lesson",
    enabled: true,
  },

  finance: {
    collection: "finance_knowledge",
    type: "finance",
    enabled: false,
  },

  stocks: {
    collection: "stocks",
    type: "stock",
    enabled: false,
  },
} as const;