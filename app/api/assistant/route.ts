import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { pipeline } from "@xenova/transformers";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

const client = new MongoClient(uri);

let embeddingPipeline: any = null;

type KnowledgeCategory =
  | "quran"
  | "hadith"
  | "tafsir"
  | "fiqh"
  | "islamic-finance"
  | "scholarly"
  | "general";

type CategoryMatch =
  | "match"
  | "supporting-primary"
  | "supporting-scholarly"
  | "neutral"
  | "different";

type SensitiveQuestionType =
  | "personal-ruling"
  | "family-law"
  | "personal-sin"
  | "takfir"
  | "self-harm"
  | "general-sensitive"
  | null;

async function getEmbedding(text: string): Promise<number[]> {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }

  const output = await embeddingPipeline(text, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
}

function normalizeCategory(value: any): KnowledgeCategory {
  const category = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  if (
    category === "quran" ||
    category === "qur'an" ||
    category === "quran-translation" ||
    category === "qur-an"
  ) {
    return "quran";
  }

  if (
    category === "hadith" ||
    category === "hadeeth" ||
    category === "hadith-collection"
  ) {
    return "hadith";
  }

  if (category === "tafsir" || category === "tafsīr") {
    return "tafsir";
  }

  if (category === "fiqh" || category === "figh") {
    return "fiqh";
  }

  if (
    category === "finance" ||
    category === "islamic-finance" ||
    category === "islamicfinance"
  ) {
    return "islamic-finance";
  }

  if (
    category === "scholarly" ||
    category === "scholar" ||
    category === "scholarly-source" ||
    category === "scholarly-sources"
  ) {
    return "scholarly";
  }

  return "general";
}

function detectScholarlyOpinionRequest(question: string): boolean {
  const q = question
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const patterns = [
    /\bwhat do scholars say\b/,
    /\bwhat do the scholars say\b/,
    /\bwhat does scholar say\b/,
    /\bwhat do scholars think\b/,
    /\bwhat do scholars believe\b/,
    /\bwhat is the scholarly opinion\b/,
    /\bwhat are the scholarly opinions\b/,
    /\bwhat are scholars opinions\b/,
    /\bscholarly opinion\b/,
    /\bscholarly opinions\b/,
    /\baccording to scholars\b/,
    /\baccording to the scholars\b/,
    /\baccording to ulema\b/,
    /\baccording to the ulama\b/,
    /\bwhat do ulema say\b/,
    /\bwhat do the ulema say\b/,
    /\bwhat do ulama say\b/,
    /\bwhat do the ulama say\b/,
    /\bdo scholars differ\b/,
    /\bdo the scholars differ\b/,
    /\bscholars differ\b/,
    /\bdifference of opinion among scholars\b/,
    /\bdifferences among scholars\b/,
    /\bscholarly differences\b/,
    /\bscholarly disagreement\b/,
    /\bscholarly disagreements\b/,
    /\bwhat is the scholarly view\b/,
    /\bwhat are the scholarly views\b/,
    /\bwhat do jurists say\b/,
    /\bwhat do the jurists say\b/,
    /\bjuristic opinion\b/,
    /\bjuristic opinions\b/,
    /\bwhat do fuqaha say\b/,
    /\bwhat do the fuqaha say\b/,
  ];

  return patterns.some((pattern) => pattern.test(q));
}

function detectRequestedMadhhab(question: string): string | null {
  const q = question
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (/\bhanafi\b/.test(q) || /\bhanafī\b/.test(q)) {
    return "hanafi";
  }

  if (
    /\bshafi'i\b/.test(q) ||
    /\bshafii\b/.test(q) ||
    /\bshafi\b/.test(q) ||
    /\bshāfi'i\b/.test(q)
  ) {
    return "shafi'i";
  }

  if (/\bmaliki\b/.test(q) || /\bmālikī\b/.test(q)) {
    return "maliki";
  }

  if (/\bhanbali\b/.test(q) || /\bḥanbali\b/.test(q)) {
    return "hanbali";
  }

  return null;
}

function detectKnowledgeCategory(question: string): KnowledgeCategory {
  const q = question.toLowerCase();

  if (detectScholarlyOpinionRequest(question)) {
    return "scholarly";
  }

  if (
    /\bhanafi\b/.test(q) ||
    /\bshafi'i\b/.test(q) ||
    /\bshafii\b/.test(q) ||
    /\bmaliki\b/.test(q) ||
    /\bhanbali\b/.test(q) ||
    /\bmadhhab\b/.test(q) ||
    /\bmadhab\b/.test(q)
  ) {
    return "scholarly";
  }

  if (
    /\binvesting in\b/.test(q) ||
    /\binvest in\b/.test(q) ||
    /\binvestment\b/.test(q) ||
    /\binvestments\b/.test(q) ||
    /\bcompany\b.*\bhalal\b/.test(q) ||
    /\bcompany\b.*\bshariah\b/.test(q) ||
    /\bstock\b.*\bhalal\b/.test(q) ||
    /\bstock\b.*\bshariah\b/.test(q) ||
    /\bshare\b.*\bhalal\b/.test(q) ||
    /\bshares\b.*\bhalal\b/.test(q) ||
    /\bmutual fund\b/.test(q) ||
    /\bmutual funds\b/.test(q) ||
    /\bshariah compliant stock\b/.test(q) ||
    /\bshariah compliant shares\b/.test(q)
  ) {
    return "islamic-finance";
  }

  if (
    /\btafsir\b/.test(q) ||
    /\btafsīr\b/.test(q) ||
    /\binterpretation of the verse\b/.test(q) ||
    /\binterpretation of this verse\b/.test(q) ||
    /\bexplanation of the verse\b/.test(q) ||
    /\bexplanation of this verse\b/.test(q) ||
    /\bmeaning of this ayah\b/.test(q) ||
    /\bexplain this verse\b/.test(q) ||
    /\bexplain this ayah\b/.test(q)
  ) {
    return "tafsir";
  }

  if (
    /\bhadith\b/.test(q) ||
    /\bhadeeth\b/.test(q) ||
    /\bsahih\s+(al[- ]?)?bukhari\b/.test(q) ||
    /\bsahih\s+(al[- ]?)?muslim\b/.test(q) ||
    /\bnarrator\b/.test(q) ||
    /\bsunnah\b/.test(q)
  ) {
    return "hadith";
  }

  if (
    /\bquran\b/.test(q) ||
    /\bqur'an\b/.test(q) ||
    /\bayah\b/.test(q) ||
    /\bverse\b/.test(q) ||
    /\bsurah\b/.test(q) ||
    /\bwhat does the quran say\b/.test(q)
  ) {
    return "quran";
  }

  if (
    /\briba\b/.test(q) ||
    /\bribā\b/.test(q) ||
    /\binterest\b/.test(q) ||
    /\busury\b/.test(q) ||
    /\bgharar\b/.test(q) ||
    /\bmaysir\b/.test(q) ||
    /\bislamic finance\b/.test(q) ||
    /\bhalal investment\b/.test(q) ||
    /\bhalal investing\b/.test(q) ||
    /\bshariah investment\b/.test(q) ||
    /\bshariah compliant\b/.test(q) ||
    /\bhalal stock\b/.test(q) ||
    /\bhalal stocks\b/.test(q) ||
    /\bhalal mutual fund\b/.test(q) ||
    /\bhalal mutual funds\b/.test(q) ||
    /\bzakat on wealth\b/.test(q) ||
    /\bzakat on money\b/.test(q)
  ) {
    return "islamic-finance";
  }

  if (
    /\bfiqh\b/.test(q) ||
    /\bhalal or haram\b/.test(q) ||
    /\bis this halal\b/.test(q) ||
    /\bis this haram\b/.test(q) ||
    /\bruling\b/.test(q) ||
    /\bmadhhab\b/.test(q) ||
    /\bmadhab\b/.test(q) ||
    /\bablution\b/.test(q) ||
    /\bwudu\b/.test(q) ||
    /\bwudhu\b/.test(q) ||
    /\bsalah\b/.test(q) ||
    /\bprayer ruling\b/.test(q) ||
    /\bfasting ruling\b/.test(q) ||
    /\bmarriage ruling\b/.test(q) ||
    /\bdivorce ruling\b/.test(q)
  ) {
    return "fiqh";
  }

  if (
    /\bscholar\b/.test(q) ||
    /\bscholars\b/.test(q) ||
    /\bulema\b/.test(q) ||
    /\bfatwa\b/.test(q) ||
    /\bscholarly opinion\b/.test(q) ||
    /\bscholarly opinions\b/.test(q) ||
    /\baccording to scholars\b/.test(q)
  ) {
    return "scholarly";
  }

  return "general";
}

function isStrictCategoryRequest(
  question: string,
  detectedCategory: KnowledgeCategory
): boolean {
  const q = question.toLowerCase();

  if (detectedCategory === "tafsir") {
    return (
      /\btafsir\b/.test(q) ||
      /\btafsīr\b/.test(q) ||
      /\binterpretation of the verse\b/.test(q) ||
      /\binterpretation of this verse\b/.test(q) ||
      /\bexplanation of the verse\b/.test(q) ||
      /\bexplanation of this verse\b/.test(q) ||
      /\bmeaning of this ayah\b/.test(q) ||
      /\bexplain this verse\b/.test(q) ||
      /\bexplain this ayah\b/.test(q)
    );
  }

  return false;
}

function isSpecificInvestmentQuestion(
  question: string,
  detectedCategory: KnowledgeCategory
): boolean {
  if (detectedCategory !== "islamic-finance") {
    return false;
  }

  const q = question.toLowerCase();

  return (
    /\binvesting in\b/.test(q) ||
    /\binvest in\b/.test(q) ||
    /\bthis specific company\b/.test(q) ||
    /\bspecific company\b/.test(q) ||
    /\bthis company\b/.test(q) ||
    /\bthe company\b/.test(q) ||
    /\bcompany\b.*\bhalal\b/.test(q) ||
    /\bcompany\b.*\bshariah\b/.test(q) ||
    /\bstock\b.*\bhalal\b/.test(q) ||
    /\bstock\b.*\bshariah\b/.test(q) ||
    /\bshare\b.*\bhalal\b/.test(q) ||
    /\bshares\b.*\bhalal\b/.test(q) ||
    /\bmutual fund\b/.test(q) ||
    /\bmutual funds\b/.test(q) ||
    /\bshariah compliant stock\b/.test(q) ||
    /\bshariah compliant shares\b/.test(q)
  );
}

function detectFatwaRequest(question: string): boolean {
  const q = question
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const patterns = [
    /\bfatwa\b/,
    /\bcan you give me a fatwa\b/,
    /\bgive me a fatwa\b/,
    /\bprovide a fatwa\b/,
    /\bissue a fatwa\b/,
    /\bwhat is the fatwa\b/,
    /\bwhat's the fatwa\b/,
    /\bneed a fatwa\b/,
    /\bi need a fatwa\b/,
    /\bdo i need a fatwa\b/,
    /\bcan you issue a ruling\b/,
    /\bcan you give me a ruling\b/,
    /\bgive me a ruling\b/,
    /\bwhat is the islamic ruling\b/,
    /\bwhat's the islamic ruling\b/,
    /\bwhat is the ruling\b/,
    /\bwhat's the ruling\b/,
    /\bis .* permissible\b/,
    /\bis .* haram\b/,
    /\bis .* halal\b/,
    /\bwhat should i do islamically\b/,
    /\bwhat should i do according to islam\b/,
  ];

  return patterns.some((pattern) => pattern.test(q));
}

function getSpecificTopic(question: string): string | null {
  const q = question.toLowerCase();

  const topics: Array<{
    topic: string;
    patterns: RegExp[];
  }> = [
    {
      topic: "gharar",
      patterns: [/\bgharar\b/],
    },
    {
      topic: "riba",
      patterns: [
        /\briba\b/,
        /\bribā\b/,
        /\busury\b/,
        /\binterest\b/,
      ],
    },
    {
      topic: "maysir",
      patterns: [/\bmaysir\b/, /\bgambling\b/],
    },
    {
      topic: "zakat",
      patterns: [/\bzakat\b/, /\bzakah\b/],
    },
    {
      topic: "halal-investing",
      patterns: [
        /\bhalal investing\b/,
        /\bhalal investment\b/,
        /\bshariah investment\b/,
        /\bshariah compliant investment\b/,
      ],
    },
  ];

  for (const item of topics) {
    if (item.patterns.some((pattern) => pattern.test(q))) {
      return item.topic;
    }
  }

  return null;
}

function getSpecificTopicMatch(
  item: any,
  specificTopic: string | null
): boolean {
  if (!specificTopic) {
    return true;
  }

  const text = [
    item.title,
    item.topic,
    item.content,
    item.reference,
    item.concept,
    item.product,
    item.financialContext,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (specificTopic === "riba") {
    return /\briba\b|\bribā\b|\busury\b|\binterest\b/.test(text);
  }

  if (specificTopic === "gharar") {
    return /\bgharar\b/.test(text);
  }

  if (specificTopic === "maysir") {
    return /\bmaysir\b|\bgambling\b/.test(text);
  }

  if (specificTopic === "zakat") {
    return /\bzakat\b|\bzakah\b/.test(text);
  }

  if (specificTopic === "halal-investing") {
    return (
      /\bhalal investing\b/.test(text) ||
      /\bhalal investment\b/.test(text) ||
      /\bshariah investment\b/.test(text) ||
      /\bshariah compliant investment\b/.test(text)
    );
  }

  return true;
}

function getSpecificInvestmentMatch(item: any): boolean {
  const text = [
    item.title,
    item.topic,
    item.content,
    item.reference,
    item.concept,
    item.product,
    item.financialContext,
    item.companyName,
    item.company,
    item.stockSymbol,
    item.ticker,
    item.securityName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasCompanyInformation = Boolean(
    item.companyName ||
      item.company ||
      item.stockSymbol ||
      item.ticker ||
      item.securityName
  );

  if (hasCompanyInformation) {
    return true;
  }

  return Boolean(
    item.product &&
      (
        /\bstock\b/.test(text) ||
        /\bshare\b/.test(text) ||
        /\bshares\b/.test(text) ||
        /\bmutual fund\b/.test(text) ||
        /\bfund\b/.test(text) ||
        /\bsecurity\b/.test(text)
      )
  );
}

function getGeneralQuestionTerms(question: string): string[] {
  const stopWords = new Set([
    "what",
    "does",
    "do",
    "is",
    "are",
    "the",
    "a",
    "an",
    "about",
    "say",
    "says",
    "according",
    "to",
    "islam",
    "islamic",
    "muslim",
    "religion",
    "religious",
    "me",
    "my",
    "this",
    "that",
    "these",
    "those",
    "in",
    "on",
    "of",
    "for",
    "and",
    "or",
    "with",
    "from",
    "how",
    "why",
    "when",
    "where",
    "who",
    "can",
    "could",
    "would",
    "should",
    "will",
    "tell",
    "explain",
    "please",
    "give",
    "practice",
    "practices",
    "thing",
    "things",
    "called",
    "call",
    "unknown",
    "worship",
    "worships",
    "worshipping",
    "worshiped",
    "concept",
    "concepts",
    "topic",
    "topics",
    "term",
    "terms",
    "name",
    "named",
    "kind",
    "type",
    "types",
    "meaning",
    "means",
    "matter",
    "matters",
    "question",
    "questions",
    "view",
    "views",
    "information",
    "specific",
    "related",
    "known",
    "haram",
    "halal",
    "sinful",
    "sin",
    "forbidden",
    "allowed",
    "permitted",
    "scholar",
    "scholars",
    "scholarly",
    "opinion",
    "opinions",
    "ulema",
    "ulama",
    "jurists",
    "jurist",
    "hanafi",
    "shafi",
    "shafii",
    "maliki",
    "hanbali",
    "madhhab",
    "madhab",
  ]);

  return Array.from(
    new Set(
      question
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, " ")
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(
          (word) =>
            word.length >= 4 && !stopWords.has(word)
        )
    )
  );
}

function hasGeneralQuestionRelevance(
  item: any,
  question: string
): boolean {
  const questionTerms = getGeneralQuestionTerms(question);

  if (questionTerms.length === 0) {
    return false;
  }

  const searchableText = [
    item.title,
    item.topic,
    item.content,
    item.reference,
    item.concept,
    item.product,
    item.financialContext,
    item.collection,
    item.hadithNumber,
    item.tafsirName,
    item.scholar,
    item.ruling,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ");

  const searchableWords = new Set(
    searchableText.split(/\s+/)
  );

  return questionTerms.some((term) =>
    searchableWords.has(term)
  );
}

function getCategoryBoost(
  item: any,
  detectedCategory: KnowledgeCategory
): number {
  if (detectedCategory === "general") {
    return 0;
  }

  const itemCategory = normalizeCategory(item.category);

  if (itemCategory === detectedCategory) {
    return 0.25;
  }

  if (
    (detectedCategory === "islamic-finance" ||
      detectedCategory === "fiqh" ||
      detectedCategory === "scholarly") &&
    (itemCategory === "quran" ||
      itemCategory === "hadith")
  ) {
    return 0.1;
  }

  if (
    detectedCategory === "quran" &&
    itemCategory === "tafsir"
  ) {
    return 0.05;
  }

  if (
    (detectedCategory === "fiqh" ||
      detectedCategory === "islamic-finance") &&
    itemCategory === "scholarly"
  ) {
    return 0.05;
  }

  if (itemCategory === "general") {
    return 0;
  }

  return -0.1;
}

function getCategoryMatch(
  item: any,
  detectedCategory: KnowledgeCategory
): CategoryMatch {
  const itemCategory = normalizeCategory(item.category);

  if (detectedCategory === "general") {
    return "neutral";
  }

  if (itemCategory === detectedCategory) {
    return "match";
  }

  if (
    (detectedCategory === "islamic-finance" ||
      detectedCategory === "fiqh") &&
    (itemCategory === "quran" ||
      itemCategory === "hadith")
  ) {
    return "supporting-primary";
  }

  if (
    detectedCategory === "scholarly" &&
    (itemCategory === "quran" ||
      itemCategory === "hadith")
  ) {
    return "supporting-primary";
  }

  if (
    detectedCategory === "quran" &&
    itemCategory === "tafsir"
  ) {
    return "supporting-scholarly";
  }

  if (
    (detectedCategory === "fiqh" ||
      detectedCategory === "islamic-finance") &&
    itemCategory === "scholarly"
  ) {
    return "supporting-scholarly";
  }

  if (itemCategory === "general") {
    return "neutral";
  }

  return "different";
}

function getCategoryPriority(
  item: any,
  detectedCategory: KnowledgeCategory
): number {
  const itemCategory = normalizeCategory(item.category);

  if (detectedCategory === "general") {
    return 0;
  }

  if (itemCategory === detectedCategory) {
    return 2;
  }

  if (
    (detectedCategory === "islamic-finance" ||
      detectedCategory === "fiqh") &&
    (itemCategory === "quran" ||
      itemCategory === "hadith")
  ) {
    return 1;
  }

  if (
    detectedCategory === "scholarly" &&
    (itemCategory === "quran" ||
      itemCategory === "hadith")
  ) {
    return 0;
  }

  if (
    detectedCategory === "quran" &&
    itemCategory === "tafsir"
  ) {
    return 1;
  }

  if (
    (detectedCategory === "fiqh" ||
      detectedCategory === "islamic-finance") &&
    itemCategory === "scholarly"
  ) {
    return 1;
  }

  if (itemCategory === "general") {
    return 1;
  }

  return 0;
}

function getAuthorityPriority(item: any): number {
  const category = normalizeCategory(item.category);

  switch (category) {
    case "quran":
      return 7;
    case "hadith":
      return 6;
    case "tafsir":
      return 5;
    case "fiqh":
      return 4;
    case "scholarly":
      return 3;
    case "islamic-finance":
      return 2;
    default:
      return 1;
  }
}

function getAuthorityClass(item: any): string {
  const category = normalizeCategory(item.category);

  switch (category) {
    case "quran":
    case "hadith":
      return "Primary Evidence";

    case "tafsir":
      return "Scholarly Explanation";

    case "fiqh":
      return "Juristic / Scholarly Source";

    case "scholarly":
      return "Scholarly Source";

    case "islamic-finance":
      return "Specialized Islamic Finance Source";

    default:
      return "General Educational Source";
  }
}

function normalizeSourceId(
  value: any
): ObjectId | string | null {
  if (!value) {
    return null;
  }

  if (value instanceof ObjectId) {
    return value;
  }

  if (typeof value === "string") {
    return ObjectId.isValid(value)
      ? new ObjectId(value)
      : value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "$oid" in value
  ) {
    const oid = String(value.$oid);

    if (ObjectId.isValid(oid)) {
      return new ObjectId(oid);
    }
  }

  return null;
}

function cleanSourceUrl(
  value: any
): string | undefined {
  if (!value) {
    return undefined;
  }

  const raw = String(value).trim();

  const markdownMatch = raw.match(
    /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/i
  );

  if (markdownMatch) {
    return markdownMatch[2];
  }

  const angleBracketMatch = raw.match(
    /^<\s*(https?:\/\/[^>]+)\s*>$/i
  );

  if (angleBracketMatch) {
    return angleBracketMatch[1];
  }

  const embeddedUrlMatch = raw.match(
    /https?:\/\/[^\s<>)\]]+/i
  );

  if (embeddedUrlMatch) {
    return embeddedUrlMatch[0];
  }

  return undefined;
}

async function getVerifiedSource(
  db: any,
  sourceId: any
): Promise<any | null> {
  if (!sourceId) {
    return null;
  }

  const normalizedSourceId =
    normalizeSourceId(sourceId);

  let source = null;

  if (normalizedSourceId instanceof ObjectId) {
    source = await db
      .collection("sources")
      .findOne({
        _id: normalizedSourceId,
        verified: true,
      });
  }

  if (!source && typeof sourceId === "string") {
    source = await db
      .collection("sources")
      .findOne({
        _id: sourceId,
        verified: true,
      });
  }

  if (!source) {
    source = await db
      .collection("sources")
      .findOne({
        sourceId: String(sourceId),
        verified: true,
      });
  }

  return source;
}

function detectPersonalRulingRequest(
  question: string
): boolean {
  const q = question
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const patterns = [
    /\bis this halal for me\b/,
    /\bis this haram for me\b/,
    /\bis that halal for me\b/,
    /\bis that haram for me\b/,
    /\bis it halal for me\b/,
    /\bis it haram for me\b/,
    /\bis this allowed for me\b/,
    /\bis this permitted for me\b/,
    /\bis this halal to me\b/,
    /\bis this haram to me\b/,

    /\bam i allowed to\b/,
    /\bam i permitted to\b/,
    /\bam i allowed\b/,
    /\bam i permitted\b/,

    /\bcan i do this\b/,
    /\bcan i do that\b/,
    /\bcan i marry\b/,
    /\bcan i divorce\b/,
    /\bcan i take\b/,
    /\bcan i keep\b/,
    /\bcan i use\b/,
    /\bcan i eat\b/,
    /\bcan i invest\b/,
    /\bcan i work\b/,
    /\bcan i earn\b/,
    /\bcan i accept\b/,
    /\bcan i refuse\b/,

    /\bshould i marry\b/,
    /\bshould i divorce\b/,
    /\bshould i take\b/,
    /\bshould i keep\b/,
    /\bshould i use\b/,
    /\bshould i invest\b/,
    /\bshould i work\b/,
    /\bshould i accept\b/,

    /\bmy .* halal\b/,
    /\bmy .* haram\b/,
    /\bmy .* allowed\b/,
    /\bmy .* permissible\b/,
    /\bfor me\b.*\bhalal\b/,
    /\bfor me\b.*\bharam\b/,

    /\bam i sinful\b/,
    /\bam i sinning\b/,
    /\bwill i be sinful\b/,
    /\bwill i be sinning\b/,
    /\bdid i sin\b/,
    /\bdid i commit a sin\b/,
    /\bis what i did halal\b/,
    /\bis what i did haram\b/,
    /\bis what i did allowed\b/,

    /\bin my case\b/,
    /\bmy situation\b/,
    /\bmy circumstances\b/,
    /\bmy situation halal\b/,
    /\bmy situation haram\b/,
    /\bmy circumstances halal\b/,
    /\bmy circumstances haram\b/,

    /\bwhat is the ruling for me\b/,
    /\bwhat is the ruling in my case\b/,
    /\bwhat is the ruling on my case\b/,
    /\bwhat is the ruling for my situation\b/,
    /\bwhat is the islamic ruling for me\b/,
    /\bwhat is the islamic ruling in my case\b/,
    /\bwhat is the islamic ruling on my situation\b/,

    /\bwhat should i do\b/,
    /\bwhat am i supposed to do\b/,
    /\bwhat should i do islamically\b/,
    /\bwhat should i do according to islam\b/,
    /\bwhat should i do according to shariah\b/,
    /\bwhat should i do according to sharia\b/,

    /\bi took .* loan\b/,
    /\bi have .* loan\b/,
    /\bi borrowed\b/,
    /\bi invested\b/,
    /\bi bought\b/,
    /\bi signed .* contract\b/,
    /\bi accepted\b/,
    /\bi received\b/,
    /\bi earned\b/,
    /\bi paid\b/,
  ];

  return patterns.some((pattern) => pattern.test(q));
}

function detectSensitiveQuestion(
  question: string
): boolean {
  const q = question
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const sensitiveTerms = [
    "divorce",
    "talaq",
    "khula",
    "iddah",
    "custody",
    "marriage dispute",
    "domestic abuse",
    "forced marriage",
    "sexual abuse",
    "zina",
    "false accusation",
    "suicide",
    "self harm",
    "self-harm",
    "takfir",
    "fatwa",
    "am i sinful",
    "am i sinning",
    "will allah forgive me",
    "allah forgive my sin",
    "my marriage",
    "my husband",
    "my wife",
    "my relationship",
    "my family",
    "my parents",
    "my children",
    "my child",
    "my money",
    "my income",
    "my job",
    "my business",
  ];

  if (
    sensitiveTerms.some((term) =>
      q.includes(term)
    )
  ) {
    return true;
  }

  const personalPatterns = [
    /\b(haram|halal)\s+for\s+me\b/,
    /\bis\s+(this|that|it)\b.*\b(haram|halal)\b/,
    /\bwould\s+(this|that|it)\b.*\b(haram|halal)\b/,
    /\bcan\s+i\b.*\b(haram|halal)\b/,
    /\bmay\s+i\b.*\b(haram|halal)\b/,
    /\bam\s+i\s+allowed\b/,
    /\bam\s+i\s+permitted\b/,
    /\bis\s+it\s+allowed\s+for\s+me\b/,
    /\bis\s+it\s+permitted\s+for\s+me\b/,
    /\bis\s+this\s+allowed\s+for\s+me\b/,
    /\bis\s+this\s+permitted\s+for\s+me\b/,
  ];

  if (
    personalPatterns.some((pattern) =>
      pattern.test(q)
    )
  ) {
    return true;
  }

  const personalSinPatterns = [
    /\bam\s+i\s+sinful\b/,
    /\bam\s+i\s+sinning\b/,
    /\bwould\s+i\s+be\s+sinful\b/,
    /\bwill\s+i\s+be\s+sinful\b/,
    /\bcould\s+i\s+be\s+sinful\b/,
    /\bwould\s+this\s+be\s+a\s+sin\b/,
    /\bis\s+this\s+a\s+sin\s+for\s+me\b/,
    /\bwould\s+i\s+be\s+committing\s+a\s+sin\b/,
  ];

  return personalSinPatterns.some((pattern) =>
    pattern.test(q)
  );
}

function getSensitiveQuestionType(
  question: string
): SensitiveQuestionType {
  const q = question
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (
    /\b(suicide|suicidal|self harm|self-harm|kill myself|end my life|hurt myself)\b/.test(
      q
    )
  ) {
    return "self-harm";
  }

  if (
    /\b(takfir|takfeer|kafir|apostasy|apostate)\b/.test(
      q
    )
  ) {
    return "takfir";
  }

  if (
    /\b(divorce|talaq|khula|iddah|custody|marriage dispute|domestic abuse|forced marriage|sexual abuse)\b/.test(
      q
    )
  ) {
    return "family-law";
  }

  if (
    /\bam i sinful\b/.test(q) ||
    /\bam i sinning\b/.test(q) ||
    /\bwill allah forgive me\b/.test(q) ||
    /\bwill allah forgive my sin\b/.test(q) ||
    /\ballah forgive my sin\b/.test(q) ||
    /\bwill my sin be forgiven\b/.test(q)
  ) {
    return "personal-sin";
  }

  if (detectPersonalRulingRequest(q)) {
    return "personal-ruling";
  }

  if (detectSensitiveQuestion(q)) {
    return "general-sensitive";
  }

  return null;
}

function hasVerifiedScholarlyAuthority(
  item: any
): boolean {
  if (item.verified !== true) {
    return false;
  }

  const status = String(
    item.verificationStatus || ""
  )
    .trim()
    .toLowerCase();

  if (
    status &&
    status !== "verified" &&
    status !== "active"
  ) {
    return false;
  }

  const category = normalizeCategory(
    item.category
  );

  if (
    category !== "scholarly" &&
    category !== "fiqh" &&
    category !== "tafsir" &&
    category !== "islamic-finance"
  ) {
    return false;
  }

  const hasScholar = Boolean(
    String(item.scholar || "").trim()
  );

  const hasInstitution = Boolean(
    String(item.institution || "").trim()
  );

  const hasAuthorityLevel = Boolean(
    String(item.authorityLevel || "").trim()
  );

  const hasMethodology = Boolean(
    String(item.methodology || "").trim()
  );

  const hasSourceId = Boolean(item.sourceId);

  return (
    hasSourceId &&
    (hasScholar ||
      hasInstitution ||
      hasAuthorityLevel ||
      hasMethodology)
  );
}

function matchesRequestedMadhhab(
  item: any,
  requestedMadhhab: string | null
): boolean {
  if (!requestedMadhhab) {
    return true;
  }

  const itemMadhhab = String(
    item.madhhab || ""
  )
    .trim()
    .toLowerCase();

  const itemMethodology = String(
    item.methodology || ""
  )
    .trim()
    .toLowerCase();

  const combined =
    `${itemMadhhab} ${itemMethodology}`;

  return combined.includes(requestedMadhhab);
}

function hasExplicitFatwaAuthority(
  item: any
): boolean {
  if (!hasVerifiedScholarlyAuthority(item)) {
    return false;
  }

  const text = [
    item.title,
    item.content,
    item.reference,
    item.sourceType,
    item.topic,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    /\bfatwa\b/.test(text) ||
    /\blegal verdict\b/.test(text) ||
    /\breligious verdict\b/.test(text)
  );
}

function getAuthorityDescription(
  item: any
): string {
  const category = normalizeCategory(
    item.category
  );

  if (category === "quran") {
    return "Primary Qur'an evidence";
  }

  if (category === "hadith") {
    return "Primary Hadith evidence";
  }

  if (category === "tafsir") {
    if (hasVerifiedScholarlyAuthority(item)) {
      return "Verified scholarly Tafsir";
    }

    return "Verified Tafsir content";
  }

  if (category === "fiqh") {
    if (hasVerifiedScholarlyAuthority(item)) {
      return "Verified juristic/scholarly source";
    }

    return "Verified Fiqh information";
  }

  if (category === "scholarly") {
    if (hasVerifiedScholarlyAuthority(item)) {
      return "Verified scholarly source";
    }

    return "Verified educational source";
  }

  if (category === "islamic-finance") {
    if (hasVerifiedScholarlyAuthority(item)) {
      return "Verified Islamic-finance scholarly source";
    }

    return "Verified Islamic-finance source";
  }

  return "Verified educational source";
}

function detectScholarlyDifferences(
  results: any[]
): boolean {
  const methodologies = new Set<string>();

  for (const item of results) {
    if (!hasVerifiedScholarlyAuthority(item)) {
      continue;
    }

    const methodology = String(
      item.madhhab ||
        item.methodology ||
        ""
    )
      .trim()
      .toLowerCase();

    if (methodology) {
      methodologies.add(methodology);
    }
  }

  return methodologies.size > 1;
}

function getSafetyNotice(
  sensitiveQuestion: boolean,
  personalRulingRequest: boolean,
  scholarlyDifferences: boolean,
  fatwaRequest: boolean,
  sensitiveQuestionType: SensitiveQuestionType
): string {
  const notices: string[] = [];

  if (sensitiveQuestionType === "self-harm") {
    notices.push(
      "If this question is connected to thoughts of harming yourself or ending your life, seek immediate help from a trusted person or local emergency or crisis service. HalalWise is not a substitute for urgent professional or emergency support."
    );
  } else if (fatwaRequest) {
    notices.push(
      "HalalWise provides educational, source-grounded Islamic information and does not issue binding fatwas. Personal or case-specific rulings should be referred to a qualified scholar or mufti who can consider the full circumstances."
    );
  } else if (sensitiveQuestionType === "takfir") {
    notices.push(
      "Takfir is a serious matter and should not be concluded from a general answer. Do not apply a takfir judgment to a person based on HalalWise; such matters require qualified scholarly assessment."
    );
  } else if (sensitiveQuestionType === "family-law") {
    notices.push(
      "Family-law matters such as marriage, divorce, custody, or abuse can depend on detailed circumstances and jurisdiction. HalalWise provides educational information and is not a substitute for qualified scholarly or professional guidance."
    );
  } else if (sensitiveQuestionType === "personal-sin") {
    notices.push(
      "Questions about personal sin and forgiveness can involve personal circumstances. HalalWise provides educational information and is not a substitute for qualified scholarly guidance."
    );
  } else if (
    sensitiveQuestionType === "personal-ruling" ||
    personalRulingRequest
  ) {
    notices.push(
      "This question asks about a personal or case-specific Islamic ruling. HalalWise can provide verified educational information and relevant evidence, but it cannot determine a definitive ruling for your individual circumstances."
    );
  } else if (sensitiveQuestion) {
    notices.push(
      "This question may involve a personal or sensitive Islamic ruling. HalalWise provides educational, source-grounded information and is not a substitute for qualified scholarly advice."
    );
  }

  if (scholarlyDifferences) {
    notices.push(
      "The available sources reflect different scholarly methodologies or opinions. HalalWise does not present one scholarly position as universally agreed upon."
    );
  }

  return notices.join(" ");
}

function getHadithIntentBoost(
  item: any,
  question: string
): number {
  if (normalizeCategory(item.category) !== "hadith") {
    return 0;
  }

  const q = question.toLowerCase();
  let boost = 0;

  if (
    /\bwhat is a hadith\b/.test(q) ||
    /\bwhat are hadith\b/.test(q) ||
    /\bwhat is hadith\b/.test(q)
  ) {
    boost += 0.05;
  }

  if (
    /\bbukhari\b/.test(q) ||
    /\bmuslim\b/.test(q) ||
    /\bsahih\b/.test(q)
  ) {
    boost += 0.05;
  }

  if (
    /\bintentions\b/.test(q) ||
    /\bintention\b/.test(q)
  ) {
    if (
      String(item.content || "")
        .toLowerCase()
        .includes("intentions")
    ) {
      boost += 0.1;
    }
  }

  return boost;
}

function getHadithMetadataBoost(
  item: any,
  question: string
): number {
  if (normalizeCategory(item.category) !== "hadith") {
    return 0;
  }

  const q = question.toLowerCase();
  const text = String(
    item.content || ""
  ).toLowerCase();

  let boost = 0;

  if (q.includes("aisha") && text.includes("aisha")) {
    boost += 0.05;
  }

  if (q.includes("waraqa") && text.includes("waraqa")) {
    boost += 0.05;
  }

  if (
    q.includes("revelation") &&
    text.includes("revelation")
  ) {
    boost += 0.05;
  }

  return boost;
}

function getHadithPenalty(
  item: any,
  question: string
): number {
  if (normalizeCategory(item.category) !== "hadith") {
    return 0;
  }

  const q = question.toLowerCase();

  if (
    q.includes("intentions") &&
    !String(item.content || "")
      .toLowerCase()
      .includes("intentions")
  ) {
    return 0.2;
  }

  return 0;
}

function getResponseCategoryLabel(
  category: KnowledgeCategory
): string {
  switch (category) {
    case "quran":
      return "Qur'an";
    case "hadith":
      return "Hadith";
    case "tafsir":
      return "Tafsir";
    case "fiqh":
      return "Fiqh";
    case "islamic-finance":
      return "Islamic Finance";
    case "scholarly":
      return "Scholarly";
    default:
      return "General";
  }
}

function getSupportingResults(
  results: any[],
  detectedCategory: KnowledgeCategory
): any[] {
  if (detectedCategory === "general") {
    return results.slice(0, 3);
  }

  return results
    .filter(
      (item: any) =>
        getCategoryPriority(
          item,
          detectedCategory
        ) > 0
    )
    .slice(0, 3);
}

async function getTopicAwareFallbackResults(
  db: any,
  specificTopic: string | null,
  existingResults: any[]
): Promise<any[]> {
  if (!specificTopic) {
    return [];
  }

  const fallbackMinimumScore = 0.55;

  const topicRegex =
    specificTopic === "riba"
      ? /(riba|ribā|usury|interest)/i
      : specificTopic === "gharar"
      ? /gharar/i
      : specificTopic === "maysir"
      ? /(maysir|gambling)/i
      : specificTopic === "zakat"
      ? /(zakat|zakah)/i
      : specificTopic === "halal-investing"
      ? /(halal investing|halal investment|shariah investment|shariah compliant investment)/i
      : null;

  if (!topicRegex) {
    return [];
  }

  const existingIds = new Set(
    existingResults.map((item: any) =>
      String(item._id)
    )
  );

  const candidates = await db
    .collection("knowledge")
    .find({
      verified: true,
      verificationStatus: {
        $in: ["verified", "active"],
      },
      $or: [
        { title: topicRegex },
        { topic: topicRegex },
        { content: topicRegex },
        { reference: topicRegex },
        { concept: topicRegex },
        { product: topicRegex },
        { financialContext: topicRegex },
      ],
    })
    .limit(20)
    .toArray();

  const verifiedFallbacks: any[] = [];

  for (const item of candidates) {
    if (existingIds.has(String(item._id))) {
      continue;
    }

    const verifiedSource =
      await getVerifiedSource(
        db,
        item.sourceId
      );

    if (!verifiedSource) {
      continue;
    }

    if (
      !getSpecificTopicMatch(
        item,
        specificTopic
      )
    ) {
      continue;
    }

    const semanticScore = Number(
      item._retrievalScore || 0
    );

    if (
      semanticScore > 0 &&
      semanticScore < fallbackMinimumScore
    ) {
      continue;
    }

    verifiedFallbacks.push({
      ...item,
      verifiedSource,
      rawScore: semanticScore || 0,
      categoryBoost: 0,
      hadithIntentBoost: 0,
      hadithMetadataBoost: 0,
      hadithPenalty: 0,
      rerankedScore: semanticScore || 0,
      topicAwareFallback: true,
    });
  }

  return verifiedFallbacks;
}

function buildCitation(
  result: any,
  detectedCategory: KnowledgeCategory,
  specificTopic: string | null
): any {
  const verifiedSource =
    result.verifiedSource;

  const resultCategory =
    normalizeCategory(result.category);

  const categoryMatch =
    getCategoryMatch(
      result,
      detectedCategory
    );

  const sourceUrl = cleanSourceUrl(
    result.sourceUrl ||
      verifiedSource?.sourceUrl
  );

  const scholarlyAuthority =
    hasVerifiedScholarlyAuthority(result);

  const isHadith =
    resultCategory === "hadith";

  /*
   * Build a structured Hadith object for the
   * Assistant UI and Save Hadith feature.
   */
  const hadith = isHadith
    ? {
        reference:
          result.reference ||
          verifiedSource?.reference ||
          undefined,

        collection:
          result.collection ||
          verifiedSource?.name ||
          verifiedSource?.sourceName ||
          result.sourceName ||
          undefined,

        hadithNumber:
          result.hadithNumber ||
          undefined,

        narrator:
          result.narrator ||
          undefined,

        arabicText:
          result.arabicText ||
          undefined,

        translation:
          result.translation
            ? {
                text:
                  result.translation.text ||
                  undefined,

                name:
                  result.translation.name ||
                  result.translationName ||
                  undefined,

                translator:
                  result.translation.translator ||
                  result.translator ||
                  undefined,
              }
            : result.translationText
            ? {
                text:
                  result.translationText,

                name:
                  result.translationName ||
                  undefined,

                translator:
                  result.translator ||
                  undefined,
              }
            : result.content
            ? {
                text:
                  result.content,

                name:
                  result.translationName ||
                  undefined,

                translator:
                  result.translator ||
                  undefined,
              }
            : undefined,
      }
    : undefined;

  return {
    category:
      result.category ||
      verifiedSource?.category ||
      "general",

    categoryLabel:
      getResponseCategoryLabel(
        resultCategory
      ),

    categoryMatch,

    categoryBoost:
      Number(result.categoryBoost || 0),

    detectedCategory,

    specificTopic,

    authorityPriority:
      getAuthorityPriority(result),

    authorityClass:
      getAuthorityClass(result),

    authorityDescription:
      getAuthorityDescription(result),

    scholarlyAuthorityVerified:
      scholarlyAuthority,

    fatwaAuthorityVerified:
      hasExplicitFatwaAuthority(result),

    title:
      result.title ||
      result.topic ||
      undefined,

    sourceId:
      normalizeSourceId(
        result.sourceId
      ),

    sourceName:
      result.sourceName ||
      verifiedSource?.name ||
      verifiedSource?.sourceName ||
      "Verified Source",

    sourceType:
      result.sourceType ||
      verifiedSource?.sourceType ||
      "Islamic Source",

    reference:
      result.reference ||
      verifiedSource?.reference ||
      undefined,

    sourceUrl,

    authorityLevel:
      result.authorityLevel ||
      verifiedSource?.authorityLevel ||
      undefined,

    authenticity:
      result.authenticity ||
      verifiedSource?.authenticity ||
      undefined,

    madhhab:
      result.madhhab ||
      verifiedSource?.madhhab ||
      undefined,

    methodology:
      result.methodology ||
      verifiedSource?.methodology ||
      undefined,

    scholar:
      result.scholar ||
      undefined,

    institution:
      result.institution ||
      undefined,

    verified:
      result.verified === true &&
      verifiedSource?.verified === true,

    verificationStatus:
      result.verificationStatus ||
      (verifiedSource?.verified
        ? "verified"
        : undefined),

    verifiedBy:
      result.verifiedBy ||
      verifiedSource?.verifiedBy ||
      undefined,

    verifiedAt:
      result.verifiedAt ||
      verifiedSource?.verifiedAt ||
      undefined,

    attribution:
      result.attribution ||
      verifiedSource?.attribution ||
      undefined,

    license:
      result.license ||
      verifiedSource?.license ||
      undefined,

    collection:
      result.collection ||
      undefined,

    hadithNumber:
      result.hadithNumber ||
      undefined,

    narrator:
      result.narrator ||
      undefined,

    surahNumber:
      result.surahNumber ||
      undefined,

    ayahNumber:
      result.ayahNumber ||
      undefined,

    translationName:
      result.translationName ||
      undefined,

    translator:
      result.translator ||
      undefined,

    tafsirName:
      result.tafsirName ||
      undefined,

    ruling:
      result.ruling ||
      undefined,

    concept:
      result.concept ||
      undefined,

    product:
      result.product ||
      undefined,

    financialContext:
      result.financialContext ||
      undefined,

    companyName:
      result.companyName ||
      undefined,

    stockSymbol:
      result.stockSymbol ||
      undefined,

    securityName:
      result.securityName ||
      undefined,

    /*
     * This is the important new field.
     *
     * The Assistant page checks source.hadith.
     */
    hadith,

    score:
      Number(result.rawScore || 0),

    rerankedScore:
      Number(result.rerankedScore || 0),

    topicAwareFallback:
      result.topicAwareFallback === true,

    relevanceGuard:
      specificTopic
        ? "specific-topic-matched"
        : detectedCategory === "general"
        ? "general-topic-match"
        : "not-required",
  };
}

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const question =
      typeof body?.question === "string"
        ? body.question.trim()
        : "";

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a question.",
          answerType: "invalid-question",
          sources: [],
        },
        { status: 400 }
      );
    }

    if (question.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please keep your question under 1000 characters.",
          answerType: "invalid-question",
          sources: [],
        },
        { status: 400 }
      );
    }

    await client.connect();

    const db = client.db("halalwise");

    const explicitScholarlyOpinionRequest =
      detectScholarlyOpinionRequest(
        question
      );

    const requestedMadhhab =
      detectRequestedMadhhab(question);

    const scholarlyOpinionRequest =
      explicitScholarlyOpinionRequest ||
      requestedMadhhab !== null;

    const detectedCategory =
      detectKnowledgeCategory(question);

    const strictCategoryRequest =
      isStrictCategoryRequest(
        question,
        detectedCategory
      );

    const specificInvestmentRequest =
      isSpecificInvestmentQuestion(
        question,
        detectedCategory
      );

    const specificTopic =
      getSpecificTopic(question);

    const fatwaRequest =
      detectFatwaRequest(question);

    const personalRulingRequest =
      detectPersonalRulingRequest(
        question
      );

    const sensitiveQuestion =
      detectSensitiveQuestion(question);

    const sensitiveQuestionType =
      getSensitiveQuestionType(question);

    const scholarlyDifferenceRequest =
      /\bdo scholars differ\b/i.test(question) ||
      /\bdo the scholars differ\b/i.test(question) ||
      /\bscholars differ\b/i.test(question) ||
      /\bdifference of opinion among scholars\b/i.test(question) ||
      /\bdifferences among scholars\b/i.test(question) ||
      /\bscholarly differences\b/i.test(question) ||
      /\bscholarly disagreement\b/i.test(question) ||
      /\bscholarly disagreements\b/i.test(question);

    /*
     * Safety-first handling for self-harm.
     */
    if (
      sensitiveQuestionType ===
      "self-harm"
    ) {
      const safetyNotice =
        getSafetyNotice(
          true,
          personalRulingRequest,
          false,
          fatwaRequest,
          sensitiveQuestionType
        );

      return NextResponse.json({
        success: true,
        question,
        answer:
          "If this question is connected to thoughts of harming yourself or ending your life, please seek immediate help from a trusted person or local emergency or crisis service. If you are in immediate danger, contact local emergency services now. HalalWise is not equipped to handle an immediate safety crisis.",
        answerType:
          "safety-critical",
        safetyNotice,
        safety: {
          sensitiveQuestion: true,
          sensitiveQuestionType,
          personalRulingRequest,
          fatwaRequest,
          scholarlyOpinionRequest,
          requestedMadhhab,
          scholarlyDifferences:
            scholarlyDifferenceRequest,
          scholarlyDifferenceRequest,
          unsupportedClaimsPrevented: true,
          verifiedSourceRequired: true,
        },
        retrieval: {
          detectedCategory,
          strictCategoryRequest,
          specificInvestmentRequest,
          fatwaRequest,
          personalRulingRequest,
          sensitiveQuestionType,
          scholarlyOpinionRequest,
          requestedMadhhab,
          specificTopic,
          selectedCategory: null,
          categoryMatch: null,
          relevanceGuard:
            "safety-critical",
        },
        selectionPolicy:
          "safety-first",
        knowledgeArchitecture: {
          unifiedKnowledgeSchema: true,
          category:
            getResponseCategoryLabel(
              detectedCategory
            ),
          sourceHierarchy:
            "Safety-first",
          verificationStatus:
            "verified",
          authorityAwareSelection: true,
        },
        sources: [],
      });
    }

    /*
     * FATWA GUARD
     */
    if (fatwaRequest) {
      const safetyNotice =
        getSafetyNotice(
          true,
          personalRulingRequest,
          false,
          true,
          sensitiveQuestionType
        );

      return NextResponse.json({
        success: true,
        question,
        answer:
          "HalalWise does not issue fatwas or binding Islamic rulings. I can provide general, source-grounded Islamic information from verified sources, but a fatwa—especially for a personal or case-specific situation—should be obtained from a qualified scholar or mufti who can consider the complete circumstances.",
        answerType:
          "fatwa-not-issued",
        safetyNotice,
        safety: {
          sensitiveQuestion,
          sensitiveQuestionType,
          personalRulingRequest,
          fatwaRequest: true,
          scholarlyOpinionRequest,
          requestedMadhhab,
          scholarlyDifferences:
            scholarlyDifferenceRequest,
          scholarlyDifferenceRequest,
          unsupportedClaimsPrevented: true,
          verifiedSourceRequired: true,
          fatwaIssued: false,
        },
        retrieval: {
          detectedCategory,
          strictCategoryRequest,
          specificInvestmentRequest,
          fatwaRequest: true,
          personalRulingRequest,
          sensitiveQuestionType,
          scholarlyOpinionRequest,
          requestedMadhhab,
          specificTopic,
          selectedCategory: null,
          categoryMatch: null,
          relevanceGuard:
            "fatwa-not-issued",
        },
        selectionPolicy:
          "fatwa-not-issued",
        knowledgeArchitecture: {
          unifiedKnowledgeSchema: true,
          category:
            getResponseCategoryLabel(
              detectedCategory
            ),
          sourceHierarchy:
            "Fatwa Not Issued",
          verificationStatus:
            "verified",
          authorityAwareSelection: true,
        },
        selectedSource: null,
        sources: [],
      });
    }

    const queryEmbedding =
      await getEmbedding(question);

    const rawResults =
      await db
        .collection("knowledge")
        .aggregate([
          {
            $vectorSearch: {
              index: "vector_index",
              path: "embedding",
              queryVector:
                queryEmbedding,
              numCandidates: 100,
              limit: 10,
            },
          },
          {
            $project: {
              _id: 1,
              category: 1,
              title: 1,
              topic: 1,
              content: 1,
              sourceId: 1,
              sourceType: 1,
              sourceName: 1,
              reference: 1,
              sourceUrl: 1,
              authorityLevel: 1,
              authenticity: 1,
              methodology: 1,
              madhhab: 1,
              verified: 1,
              verificationStatus: 1,
              verifiedBy: 1,
              verifiedAt: 1,
              attribution: 1,
              license: 1,
              collection: 1,
              hadithNumber: 1,
              narrator: 1,
              arabicText: 1,
              translation: 1,
              translationText: 1,
              surahNumber: 1,
              ayahNumber: 1,
              translationName: 1,
              translator: 1,
              tafsirName: 1,
              scholar: 1,
              institution: 1,
              ruling: 1,
              concept: 1,
              product: 1,
              financialContext: 1,
              companyName: 1,
              company: 1,
              stockSymbol: 1,
              ticker: 1,
              securityName: 1,
              embeddingModel: 1,
              embeddingDimensions: 1,
              score: {
                $meta:
                  "vectorSearchScore",
              },
            },
          },
        ])
        .toArray();

    const scoredResults =
      rawResults.map((item: any) => {
        const rawScore =
          Number(item.score || 0);

        const categoryBoost =
          getCategoryBoost(
            item,
            detectedCategory
          );

        const hadithIntentBoost =
          getHadithIntentBoost(
            item,
            question
          );

        const hadithMetadataBoost =
          getHadithMetadataBoost(
            item,
            question
          );

        const hadithPenalty =
          getHadithPenalty(
            item,
            question
          );

        const rerankedScore =
          rawScore +
          categoryBoost +
          hadithIntentBoost +
          hadithMetadataBoost -
          hadithPenalty;

        return {
          ...item,
          rawScore,
          categoryBoost,
          hadithIntentBoost,
          hadithMetadataBoost,
          hadithPenalty,
          rerankedScore,
        };
      });

    /*
     * Original raw-score threshold remains 0.65.
     */
    const confidentResults =
      scoredResults.filter(
        (item: any) =>
          Number(item.rawScore || 0) >=
          0.65
      );

    const verifiedKnowledgeResults: any[] =
      [];

    for (const item of confidentResults) {
      const verificationStatus =
        String(
          item.verificationStatus || ""
        )
          .trim()
          .toLowerCase();

      if (item.verified !== true) {
        continue;
      }

      if (
        verificationStatus &&
        verificationStatus !== "verified" &&
        verificationStatus !== "active"
      ) {
        continue;
      }

      const verifiedSource =
        await getVerifiedSource(
          db,
          item.sourceId
        );

      if (!verifiedSource) {
        continue;
      }

      verifiedKnowledgeResults.push({
        ...item,
        verifiedSource,
      });
    }

    let relevanceGuardedResults =
      verifiedKnowledgeResults;

    if (
      detectedCategory === "general" &&
      !specificTopic &&
      !specificInvestmentRequest &&
      !strictCategoryRequest &&
      !scholarlyOpinionRequest
    ) {
      relevanceGuardedResults =
        verifiedKnowledgeResults.filter(
          (item: any) =>
            hasGeneralQuestionRelevance(
              item,
              question
            )
        );
    }

    /*
     * Topic-aware fallback.
     * Minimum remains 0.55.
     */
    let topicAwareFallbackResults: any[] =
      [];

    if (
      specificTopic &&
      !specificInvestmentRequest &&
      !strictCategoryRequest &&
      !scholarlyOpinionRequest
    ) {
      const fallbackCandidates =
        await db
          .collection("knowledge")
          .aggregate([
            {
              $vectorSearch: {
                index: "vector_index",
                path: "embedding",
                queryVector:
                  queryEmbedding,
                numCandidates: 100,
                limit: 20,
              },
            },
            {
              $project: {
                _id: 1,
                category: 1,
                title: 1,
                topic: 1,
                content: 1,
                sourceId: 1,
                sourceType: 1,
                sourceName: 1,
                reference: 1,
                sourceUrl: 1,
                authorityLevel: 1,
                authenticity: 1,
                methodology: 1,
                madhhab: 1,
                verified: 1,
                verificationStatus: 1,
                verifiedBy: 1,
                verifiedAt: 1,
                attribution: 1,
                license: 1,
                collection: 1,
                hadithNumber: 1,
                narrator: 1,
                arabicText: 1,
                translation: 1,
                translationText: 1,
                surahNumber: 1,
                ayahNumber: 1,
                translationName: 1,
                translator: 1,
                tafsirName: 1,
                scholar: 1,
                institution: 1,
                ruling: 1,
                concept: 1,
                product: 1,
                financialContext: 1,
                companyName: 1,
                company: 1,
                stockSymbol: 1,
                ticker: 1,
                securityName: 1,
                score: {
                  $meta:
                    "vectorSearchScore",
                },
              },
            },
          ])
          .toArray();

      const scoredFallbackCandidates =
        fallbackCandidates.map(
          (item: any) => {
            const rawScore =
              Number(item.score || 0);

            return {
              ...item,
              rawScore,
              _retrievalScore:
                rawScore,
            };
          }
        );

      topicAwareFallbackResults =
        await getTopicAwareFallbackResults(
          db,
          specificTopic,
          [
            ...relevanceGuardedResults,
          ]
        );

      topicAwareFallbackResults =
        topicAwareFallbackResults.map(
          (item: any) => {
            const matchingCandidate =
              scoredFallbackCandidates.find(
                (candidate: any) =>
                  String(candidate._id) ===
                  String(item._id)
              );

            const rawScore =
              Number(
                matchingCandidate?.rawScore ||
                  0
              );

            const categoryBoost =
              getCategoryBoost(
                item,
                detectedCategory
              );

            const hadithIntentBoost =
              getHadithIntentBoost(
                item,
                question
              );

            const hadithMetadataBoost =
              getHadithMetadataBoost(
                item,
                question
              );

            const hadithPenalty =
              getHadithPenalty(
                item,
                question
              );

            return {
              ...item,
              rawScore,
              categoryBoost,
              hadithIntentBoost,
              hadithMetadataBoost,
              hadithPenalty,
              rerankedScore:
                rawScore +
                categoryBoost +
                hadithIntentBoost +
                hadithMetadataBoost -
                hadithPenalty,
              topicAwareFallback: true,
            };
          }
        );
    }

    const combinedVerifiedResults = [
      ...relevanceGuardedResults,
      ...topicAwareFallbackResults,
    ];

    /*
     * A scholarly-opinion question must NOT use
     * Qur'an/Hadith as a substitute for a scholar.
     */
    let scholarlyRelevantResults =
      combinedVerifiedResults;

    if (scholarlyOpinionRequest) {
      scholarlyRelevantResults =
        combinedVerifiedResults.filter(
          (item: any) => {
            if (
              !hasVerifiedScholarlyAuthority(
                item
              )
            ) {
              return false;
            }

            if (
              !matchesRequestedMadhhab(
                item,
                requestedMadhhab
              )
            ) {
              return false;
            }

            if (
              specificTopic &&
              !getSpecificTopicMatch(
                item,
                specificTopic
              )
            ) {
              return false;
            }

            return true;
          }
        );
    }

    const categoryRelevantResults =
      strictCategoryRequest
        ? combinedVerifiedResults.filter(
            (item: any) =>
              normalizeCategory(
                item.category
              ) === detectedCategory
          )
        : scholarlyOpinionRequest
        ? scholarlyRelevantResults
        : combinedVerifiedResults;

    const investmentRelevantResults =
      specificInvestmentRequest
        ? categoryRelevantResults.filter(
            (item: any) =>
              normalizeCategory(
                item.category
              ) === "islamic-finance" &&
              getSpecificInvestmentMatch(
                item
              )
          )
        : categoryRelevantResults;

    const topicRelevantResults =
      specificTopic &&
      !specificInvestmentRequest
        ? investmentRelevantResults.filter(
            (item: any) =>
              getSpecificTopicMatch(
                item,
                specificTopic
              )
          )
        : investmentRelevantResults;

    /*
     * Scholarly questions have their own final guard.
     */
    if (
      scholarlyOpinionRequest &&
      scholarlyRelevantResults.length === 0
    ) {
      const safetyNotice =
        getSafetyNotice(
          sensitiveQuestion,
          personalRulingRequest,
          scholarlyDifferenceRequest,
          fatwaRequest,
          sensitiveQuestionType
        );

      let answer =
        "I could not find sufficiently relevant verified scholarly information for this question. I don't want to present the Qur'an, Hadith, or another source as a scholarly opinion when I do not have a verified scholarly source supporting that claim.";

      if (requestedMadhhab) {
        answer =
          `I could not find sufficiently relevant verified scholarly information for the ${requestedMadhhab} position on this question. I don't want to attribute an opinion to that madhhab without a verified scholarly source.`;
      }

      if (scholarlyDifferenceRequest) {
        answer =
          "I could not find sufficiently relevant verified scholarly sources to determine or describe a difference of opinion on this question. I don't want to claim that scholars differ unless the available verified scholarly sources actually establish that difference.";
      }

      return NextResponse.json({
        success: true,
        question,
        answer,
        answerType:
          "insufficient-verified-scholarly-information",
        safetyNotice,
        safety: {
          sensitiveQuestion,
          sensitiveQuestionType,
          personalRulingRequest,
          fatwaRequest,
          scholarlyOpinionRequest: true,
          requestedMadhhab,
          scholarlyDifferences:
            scholarlyDifferenceRequest,
          scholarlyDifferenceRequest,
          unsupportedClaimsPrevented: true,
          verifiedSourceRequired: true,
        },
        retrieval: {
          detectedCategory,
          strictCategoryRequest,
          specificInvestmentRequest,
          fatwaRequest,
          personalRulingRequest,
          sensitiveQuestionType,
          scholarlyOpinionRequest: true,
          requestedMadhhab,
          specificTopic,
          selectedCategory: null,
          categoryMatch: null,
          relevanceGuard:
            scholarlyDifferenceRequest
              ? "no-verified-scholarly-difference-match"
              : requestedMadhhab
              ? "no-verified-madhhab-match"
              : "no-verified-scholarly-match",
        },
        selectionPolicy:
          "scholarly-authority-first",
        knowledgeArchitecture: {
          unifiedKnowledgeSchema: true,
          category: "Scholarly",
          sourceHierarchy:
            requestedMadhhab
              ? "Verified Scholarly Madhhab Authority Required"
              : "Verified Scholarly Authority Required",
          verificationStatus:
            "verified",
          authorityAwareSelection: true,
        },
        sources: [],
      });
    }

    /*
     * Existing no-result protection.
     */
    if (topicRelevantResults.length === 0) {
      let safetyNotice =
        getSafetyNotice(
          sensitiveQuestion,
          personalRulingRequest,
          scholarlyDifferenceRequest,
          fatwaRequest,
          sensitiveQuestionType
        );

      let answer =
        "I could not find sufficiently relevant verified information for this specific topic. I don't want to answer using a related source that may not actually address your question.";

      let relevanceGuard =
        "no-specific-topic-match";

      if (
        detectedCategory === "general" &&
        !specificTopic &&
        !specificInvestmentRequest &&
        !strictCategoryRequest &&
        !scholarlyOpinionRequest
      ) {
        answer =
          "I could not find sufficiently relevant verified information about this specific topic. I don't want to guess or make an unsupported religious claim.";

        relevanceGuard =
          "no-general-topic-match";
      }

      if (strictCategoryRequest) {
        answer =
          `I could not find sufficiently relevant verified ${getResponseCategoryLabel(
            detectedCategory
          )} information for this question. I don't want to present another type of source as ${getResponseCategoryLabel(
            detectedCategory
          )} or make an unsupported religious claim.`;

        relevanceGuard =
          "no-verified-category-match";
      }

      if (specificInvestmentRequest) {
        answer =
          "I could not find sufficiently relevant verified Islamic-finance information for this specific investment question. I don't want to make an unsupported Shariah assessment about a specific company or investment.";

        relevanceGuard =
          "no-verified-investment-match";
      }

      if (
        personalRulingRequest &&
        !fatwaRequest &&
        !(
          sensitiveQuestionType === "personal-sin" &&
          specificTopic
        )
      ) {
        answer =
          "I could not find sufficiently relevant verified information to answer this personal or case-specific Islamic ruling. I don't want to guess about your individual circumstances or present an unsupported ruling as definitive.";

        relevanceGuard =
          "no-verified-personal-ruling-match";
      }

      if (
        sensitiveQuestionType ===
        "family-law"
      ) {
        answer =
          "I could not find sufficiently relevant verified information for this family-law question. I don't want to give a potentially harmful or incomplete ruling without the necessary circumstances and reliable scholarly guidance.";

        relevanceGuard =
          "no-verified-family-law-match";
      }

      if (
        sensitiveQuestionType ===
        "personal-sin" &&
        !specificTopic
      ) {
        answer =
          "I could not find sufficiently relevant verified information to answer this personal question about sin or forgiveness. I don't want to make an unsupported judgment about your individual circumstances.";

        relevanceGuard =
          "no-verified-personal-sin-match";
      }

      if (
        sensitiveQuestionType ===
        "takfir"
      ) {
        answer =
          "I could not find sufficiently relevant verified information for this takfir-related question. I don't want to make or encourage a serious judgment about a person's faith without qualified scholarly assessment.";

        relevanceGuard =
          "no-verified-takfir-match";
      }

      return NextResponse.json({
        success: true,
        question,
        answer,
        answerType:
          "insufficient-verified-information",
        safetyNotice,
        safety: {
          sensitiveQuestion,
          sensitiveQuestionType,
          personalRulingRequest,
          fatwaRequest,
          scholarlyOpinionRequest,
          requestedMadhhab,
          scholarlyDifferences:
            scholarlyDifferenceRequest,
          scholarlyDifferenceRequest,
          unsupportedClaimsPrevented: true,
          verifiedSourceRequired: true,
        },
        retrieval: {
          detectedCategory,
          strictCategoryRequest,
          specificInvestmentRequest,
          fatwaRequest,
          personalRulingRequest,
          sensitiveQuestionType,
          scholarlyOpinionRequest,
          requestedMadhhab,
          specificTopic,
          selectedCategory: null,
          categoryMatch: null,
          relevanceGuard,
        },
        selectionPolicy:
          scholarlyOpinionRequest
            ? "scholarly-authority-first"
            : "category-then-authority-then-relevance",
        knowledgeArchitecture: {
          unifiedKnowledgeSchema: true,
          category:
            scholarlyOpinionRequest
              ? "Scholarly"
              : getResponseCategoryLabel(
                  detectedCategory
                ),
          sourceHierarchy:
            scholarlyOpinionRequest
              ? "Verified Scholarly Authority Required"
              : specificInvestmentRequest
              ? "Specialized Islamic Finance"
              : "Primary",
          verificationStatus:
            "verified",
          authorityAwareSelection: true,
        },
        sources: [],
      });
    }

    /*
     * Category → authority → relevance.
     */
    const categoryAwareResults =
      [...topicRelevantResults].sort(
        (a, b) => {
          const categoryPriorityDifference =
            getCategoryPriority(
              b,
              detectedCategory
            ) -
            getCategoryPriority(
              a,
              detectedCategory
            );

          if (
            categoryPriorityDifference !== 0
          ) {
            return categoryPriorityDifference;
          }

          const authorityPriorityDifference =
            getAuthorityPriority(b) -
            getAuthorityPriority(a);

          if (
            authorityPriorityDifference !== 0
          ) {
            return authorityPriorityDifference;
          }

          return (
            Number(
              b.rerankedScore || 0
            ) -
            Number(
              a.rerankedScore || 0
            )
          );
        }
      );

    const bestResult =
      categoryAwareResults[0];

    const supportingResults =
      scholarlyOpinionRequest
        ? categoryAwareResults
            .filter(
              (item: any) =>
                hasVerifiedScholarlyAuthority(
                  item
                )
            )
            .slice(0, 3)
        : strictCategoryRequest ||
          specificInvestmentRequest
        ? categoryAwareResults
            .filter(
              (item: any) =>
                normalizeCategory(
                  item.category
                ) === detectedCategory
            )
            .slice(0, 3)
        : getSupportingResults(
            categoryAwareResults,
            detectedCategory
          );

    const selectedCategory =
      normalizeCategory(
        bestResult.category
      );

    const selectedCategoryMatch =
      getCategoryMatch(
        bestResult,
        detectedCategory
      );

    const verifiedScholarlyDifferences =
      detectScholarlyDifferences(
        supportingResults
      );

    const scholarlyDifferences =
      scholarlyDifferenceRequest ||
      verifiedScholarlyDifferences;

    const safetyNotice =
      getSafetyNotice(
        sensitiveQuestion,
        personalRulingRequest,
        verifiedScholarlyDifferences,
        fatwaRequest,
        sensitiveQuestionType
      );

    const responseSources =
      supportingResults.map(
        (result: any) =>
          buildCitation(
            result,
            detectedCategory,
            specificTopic
          )
      );

    const selectedSource =
      buildCitation(
        bestResult,
        detectedCategory,
        specificTopic
      );

    const sourceAnswer =
      String(
        bestResult.content || ""
      ).trim();

    const answer =
      personalRulingRequest
        ? `The verified sources indicate the relevant Islamic guidance on this matter. However, HalalWise cannot determine a definitive ruling about your individual circumstances. The general source-based information is: ${sourceAnswer}`
        : sourceAnswer;

    if (!answer) {
      return NextResponse.json({
        success: true,
        question,
        answer:
          "I found a verified source, but it does not contain enough usable source content to provide a grounded answer. I don't want to guess or make an unsupported religious claim.",
        answerType:
          "insufficient-source-content",
        safetyNotice,
        safety: {
          sensitiveQuestion,
          sensitiveQuestionType,
          personalRulingRequest,
          fatwaRequest,
          scholarlyOpinionRequest,
          requestedMadhhab,
          scholarlyDifferences,
          scholarlyDifferenceRequest,
          unsupportedClaimsPrevented: true,
          verifiedSourceRequired: true,
        },
        retrieval: {
          detectedCategory,
          strictCategoryRequest,
          specificInvestmentRequest,
          fatwaRequest,
          personalRulingRequest,
          sensitiveQuestionType,
          scholarlyOpinionRequest,
          requestedMadhhab,
          specificTopic,
          selectedCategory,
          categoryMatch:
            selectedCategoryMatch,
          relevanceGuard:
            scholarlyOpinionRequest
              ? "verified-scholarly-match"
              : specificInvestmentRequest
              ? "specific-investment-match"
              : strictCategoryRequest
              ? "strict-category-match"
              : specificTopic
              ? "specific-topic-matched"
              : detectedCategory ===
                "general"
              ? "general-topic-match"
              : personalRulingRequest
              ? "personal-ruling-match"
              : "not-required",
        },
        selectionPolicy:
          scholarlyOpinionRequest
            ? "scholarly-authority-first"
            : "category-then-authority-then-relevance",
        knowledgeArchitecture: {
          unifiedKnowledgeSchema: true,
          category:
            getResponseCategoryLabel(
              selectedCategory
            ),
          sourceHierarchy:
            scholarlyOpinionRequest
              ? "Verified Scholarly Authority"
              : bestResult.authorityLevel ||
                "Primary",
          verificationStatus:
            bestResult.verificationStatus ||
            "verified",
          authorityAwareSelection: true,
        },
        selectedSource,
        sources: [],
      });
    }

    return NextResponse.json({
      success: true,
      question,
      answer,
      answerType:
        personalRulingRequest
          ? "personal-ruling"
          : "source-grounded",

      safetyNotice,

      safety: {
        sensitiveQuestion,
        sensitiveQuestionType,
        personalRulingRequest,
        fatwaRequest,
        scholarlyOpinionRequest,
        requestedMadhhab,
        scholarlyDifferences,
        scholarlyDifferenceRequest,
        unsupportedClaimsPrevented: true,
        verifiedSourceRequired: true,
      },

      retrieval: {
        detectedCategory,
        strictCategoryRequest,
        specificInvestmentRequest,
        fatwaRequest,
        personalRulingRequest,
        sensitiveQuestionType,
        scholarlyOpinionRequest,
        requestedMadhhab,
        specificTopic,
        selectedCategory,
        categoryMatch:
          selectedCategoryMatch,
        relevanceGuard:
          scholarlyOpinionRequest
            ? "verified-scholarly-match"
            : specificInvestmentRequest
            ? "specific-investment-match"
            : strictCategoryRequest
            ? "strict-category-match"
            : specificTopic
            ? "specific-topic-matched"
            : detectedCategory ===
              "general"
            ? "general-topic-match"
            : personalRulingRequest
            ? "personal-ruling-match"
            : "not-required",
      },

      selectionPolicy:
        scholarlyOpinionRequest
          ? "scholarly-authority-first"
          : "category-then-authority-then-relevance",

      knowledgeArchitecture: {
        unifiedKnowledgeSchema: true,

        category:
          getResponseCategoryLabel(
            selectedCategory
          ),

        sourceHierarchy:
          scholarlyOpinionRequest
            ? "Verified Scholarly Authority"
            : bestResult.authorityLevel ||
              "Primary",

        verificationStatus:
          bestResult.verificationStatus ||
          "verified",

        authorityAwareSelection: true,
      },

      selectedSource,

      sources: responseSources,
    });
  } catch (error) {
    console.error(
      "Islamic Assistant error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "The Islamic Assistant encountered an unexpected error while processing the question. Please try again.",
        answerType:
          "system-error",
        sources: [],
      },
      { status: 500 }
    );
  }
}