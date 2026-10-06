import type { LearnCategory } from "./types";

export const learnCategories: LearnCategory[] = [
  {
    id: "quran",
    name: "Qur'an",
    slug: "quran",
    description:
      "Learn about the Qur'an, its importance, and how Muslims approach it.",
    icon: "📖",
    order: 1,
    published: true,
  },
  {
    id: "hadith",
    name: "Hadith",
    slug: "hadith",
    description:
      "Learn about Hadith, Sunnah, and their role in Islam.",
    icon: "📚",
    order: 2,
    published: true,
  },
  {
    id: "aqeedah",
    name: "Aqeedah",
    slug: "aqeedah",
    description:
      "Learn the foundational beliefs of Islam.",
    icon: "☪️",
    order: 3,
    published: true,
  },
  {
    id: "salah",
    name: "Salah",
    slug: "salah",
    description:
      "Learn about prayer and its importance in the life of a Muslim.",
    icon: "🕌",
    order: 4,
    published: true,
  },
  {
    id: "fasting",
    name: "Fasting",
    slug: "fasting",
    description:
      "Learn about fasting, Ramadan, and related Islamic guidance.",
    icon: "🌙",
    order: 5,
    published: true,
  },
  {
    id: "zakat",
    name: "Zakat",
    slug: "zakat",
    description:
      "Learn the basics of Zakat and its role in Islamic finance and worship.",
    icon: "💰",
    order: 6,
    published: true,
  },
  {
    id: "hajj-umrah",
    name: "Hajj & Umrah",
    slug: "hajj-umrah",
    description:
      "Learn about Hajj, Umrah, and their important practices.",
    icon: "🕋",
    order: 7,
    published: true,
  },
  {
    id: "halal-haram",
    name: "Halal & Haram",
    slug: "halal-haram",
    description:
      "Learn how Islam approaches permissible and prohibited matters.",
    icon: "⚖️",
    order: 8,
    published: true,
  },
  {
    id: "islamic-finance",
    name: "Islamic Finance",
    slug: "islamic-finance",
    description:
      "Learn about Riba, Gharar, Zakat, halal investing, and Islamic finance.",
    icon: "📈",
    order: 9,
    published: true,
  },
  {
    id: "manners",
    name: "Islamic Manners",
    slug: "manners",
    description:
      "Learn about character, manners, kindness, and conduct in Islam.",
    icon: "🤝",
    order: 10,
    published: true,
  },
];