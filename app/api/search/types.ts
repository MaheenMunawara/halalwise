export type SearchResultType =
  | "quran"
  | "hadith"
  | "lesson"
  | "finance"
  | "stock";

export type SearchResult = {
  type: SearchResultType;
  title: string;
  description: string;
  reference?: string;
  category?: string;
  verified?: boolean;
  verificationStatus?: string;
  sourceName?: string;
  sourceUrl?: string;
  slug?: string;
  url?: string;
};

export type SearchResponse = {
  success: boolean;
  query: string;
  count: number;
  results: SearchResult[];
  error?: string;
};