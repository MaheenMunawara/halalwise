import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

import type {
  SearchResponse,
  SearchResult,
} from "./types";

import { normalizeSearchText } from "./utils";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

type SearchFilter =
  | "all"
  | "quran"
  | "hadith"
  | "lesson"
  | "finance";

function scoreText(
  value: string,
  query: string,
  exactScore: number,
  startsWithScore: number,
  containsScore: number
) {
  const text = normalizeSearchText(value);
  const normalizedQuery =
    normalizeSearchText(query);

  if (!text || !normalizedQuery) {
    return 0;
  }

  if (text === normalizedQuery) {
    return exactScore;
  }

  if (text.startsWith(normalizedQuery)) {
    return startsWithScore;
  }

  if (text.includes(normalizedQuery)) {
    return containsScore;
  }

  return 0;
}

function getFilter(
  value: string | null
): SearchFilter {
  const filter =
    value?.trim().toLowerCase();

  if (
    filter === "quran" ||
    filter === "hadith" ||
    filter === "lesson" ||
    filter === "finance"
  ) {
    return filter;
  }

  return "all";
}

export async function GET(request: Request) {
  const client = new MongoClient(uri);

  try {
    const { searchParams } =
      new URL(request.url);

    const query =
      searchParams.get("q")?.trim() || "";

    const filter = getFilter(
      searchParams.get("type")
    );

    if (!query) {
      const response: SearchResponse = {
        success: true,
        query: "",
        count: 0,
        results: [],
      };

      return NextResponse.json(response);
    }

    if (query.length < 2) {
      const response: SearchResponse = {
        success: true,
        query,
        count: 0,
        results: [],
      };

      return NextResponse.json(response);
    }

    await client.connect();

    const db = client.db("halalwise");

    const rankedResults: Array<{
      result: SearchResult;
      score: number;
      order: number;
    }> = [];

    // ==================================================
    // QUR'AN
    // ==================================================

    if (
      filter === "all" ||
      filter === "quran"
    ) {
      const quranCollection =
        db.collection("quran");

      const quranTranslationsCollection =
        db.collection(
          "quran_translations"
        );

      const quranVerses =
        await quranCollection
          .find({
            verified: true,
          })
          .limit(1000)
          .toArray();

      const translations =
        await quranTranslationsCollection
          .find({
            verified: true,
          })
          .limit(1000)
          .toArray();

      const translationMap =
        new Map<
          string,
          typeof translations[number]
        >();

      for (const translation of translations) {
        const reference =
          typeof translation.reference ===
          "string"
            ? normalizeSearchText(
                translation.reference
              )
            : "";

        if (reference) {
          translationMap.set(
            reference,
            translation
          );
        }
      }

      const matchedTranslationReferences =
        new Set<string>();

      // ----------------------------------------------
      // SEARCH QUR'AN VERSES
      // ----------------------------------------------

      for (const verse of quranVerses) {
        const reference =
          typeof verse.reference ===
          "string"
            ? verse.reference
            : "";

        const surahName =
          typeof verse.surahName ===
          "string"
            ? verse.surahName
            : "";

        const arabicText =
          typeof verse.arabicText ===
          "string"
            ? verse.arabicText
            : "";

        const ayahNumber =
          typeof verse.ayahNumber ===
          "number"
            ? String(verse.ayahNumber)
            : "";

        const surahNumber =
          typeof verse.surahNumber ===
          "number"
            ? String(verse.surahNumber)
            : "";

        const normalizedReference =
          normalizeSearchText(
            reference
          );

        const translation =
          translationMap.get(
            normalizedReference
          );

        const translationText =
          typeof translation?.translationText ===
          "string"
            ? translation.translationText
            : "";

        const score =
          scoreText(
            reference,
            query,
            100,
            70,
            50
          ) +
          scoreText(
            surahName,
            query,
            60,
            40,
            25
          ) +
          scoreText(
            ayahNumber,
            query,
            60,
            40,
            25
          ) +
          scoreText(
            surahNumber,
            query,
            40,
            30,
            20
          ) +
          scoreText(
            arabicText,
            query,
            20,
            15,
            10
          ) +
          scoreText(
            translationText,
            query,
            50,
            35,
            20
          );

        if (score > 0) {
          if (normalizedReference) {
            matchedTranslationReferences.add(
              normalizedReference
            );
          }

          rankedResults.push({
            result: {
              type: "quran",
              title:
                reference ||
                `Qur'an ${surahNumber}:${ayahNumber}`,
              description:
                translationText ||
                `Verified Qur'an verse from ${
                  surahName ||
                  "the Qur'an"
                }.`,
              reference:
                reference ||
                `Qur'an ${surahNumber}:${ayahNumber}`,
              category: "Qur'an",
              url:
                surahNumber && ayahNumber
                  ? `/quran/${surahNumber}/${ayahNumber}`
                  : undefined,
              verified: true,
              verificationStatus:
                typeof translation?.verificationStatus ===
                "string"
                  ? translation.verificationStatus
                  : typeof verse.verificationStatus ===
                      "string"
                    ? verse.verificationStatus
                    : undefined,
              sourceName:
                typeof translation?.sourceName ===
                "string"
                  ? translation.sourceName
                  : typeof verse.sourceName ===
                      "string"
                    ? verse.sourceName
                    : undefined,
              sourceUrl:
                typeof translation?.sourceUrl ===
                "string"
                  ? translation.sourceUrl
                  : typeof verse.sourceUrl ===
                      "string"
                    ? verse.sourceUrl
                    : undefined,
            },
            score,
            order: 1,
          });
        }
      }

      // ----------------------------------------------
      // SEARCH TRANSLATIONS THAT DO NOT HAVE A
      // MATCHED QUR'AN RESULT
      // ----------------------------------------------

      for (const translation of translations) {
        const reference =
          typeof translation.reference ===
          "string"
            ? translation.reference
            : "";

        const surahName =
          typeof translation.surahName ===
          "string"
            ? translation.surahName
            : "";

        const translationText =
          typeof translation.translationText ===
          "string"
            ? translation.translationText
            : "";

        const ayahNumber =
          typeof translation.ayahNumber ===
          "number"
            ? String(translation.ayahNumber)
            : "";

        const normalizedReference =
          normalizeSearchText(
            reference
          );

        if (
          normalizedReference &&
          matchedTranslationReferences.has(
            normalizedReference
          )
        ) {
          continue;
        }

        const score =
          scoreText(
            reference,
            query,
            100,
            70,
            50
          ) +
          scoreText(
            surahName,
            query,
            60,
            40,
            25
          ) +
          scoreText(
            ayahNumber,
            query,
            60,
            40,
            25
          ) +
          scoreText(
            translationText,
            query,
            50,
            35,
            20
          );

        if (score > 0) {
          rankedResults.push({
            result: {
              type: "quran",
              title:
                reference ||
                `Qur'an ${surahName}:${ayahNumber}`,
              description:
                translationText ||
                "Verified Qur'an translation.",
              reference:
                reference || undefined,
              category: "Qur'an",
              url:
                typeof translation.surahNumber ===
                  "number" &&
                typeof translation.ayahNumber ===
                  "number"
                  ? `/quran/${translation.surahNumber}/${translation.ayahNumber}`
                  : undefined,
              verified:
                translation.verified === true,
              verificationStatus:
                typeof translation.verificationStatus ===
                "string"
                  ? translation.verificationStatus
                  : undefined,
              sourceName:
                typeof translation.sourceName ===
                "string"
                  ? translation.sourceName
                  : undefined,
              sourceUrl:
                typeof translation.sourceUrl ===
                "string"
                  ? translation.sourceUrl
                  : undefined,
            },
            score,
            order: 1,
          });
        }
      }
    }

    // ==================================================
    // HADITH
    // ==================================================

    if (
      filter === "all" ||
      filter === "hadith"
    ) {
      const sourceCollection =
        db.collection("sources");

      const hadithSources =
        await sourceCollection
          .find({
            sourceType: {
              $regex:
                /^Hadith Collection$/i,
            },
          })
          .limit(1000)
          .toArray();

      for (const source of hadithSources) {
        const sourceName =
          typeof source.sourceName ===
          "string"
            ? source.sourceName
            : "";

        const reference =
          typeof source.reference ===
          "string"
            ? source.reference
            : "";

        const topic =
          typeof source.topic ===
          "string"
            ? source.topic
            : "";

        const methodology =
          typeof source.methodology ===
          "string"
            ? source.methodology
            : "";

        const authenticity =
          typeof source.authenticity ===
          "string"
            ? source.authenticity
            : "";

        const searchableText = [
          sourceName,
          reference,
          topic,
          methodology,
          authenticity,
        ].join(" ");

        const score =
          scoreText(
            reference,
            query,
            100,
            70,
            50
          ) +
          scoreText(
            sourceName,
            query,
            70,
            50,
            30
          ) +
          scoreText(
            topic,
            query,
            50,
            35,
            20
          ) +
          scoreText(
            searchableText,
            query,
            0,
            0,
            10
          );

        if (score > 0) {
          rankedResults.push({
            result: {
              type: "hadith",
              title:
                reference ||
                sourceName ||
                "Hadith Source",
              description:
                topic ||
                methodology ||
                "Hadith source.",
              reference:
                reference || undefined,
              category: "Hadith",
              verified:
                source.verified === true,
              verificationStatus:
                typeof source.verificationStatus ===
                "string"
                  ? source.verificationStatus
                  : undefined,
              sourceName:
                sourceName || undefined,
              sourceUrl:
                typeof source.sourceUrl ===
                "string"
                  ? source.sourceUrl
                  : undefined,
            },
            score,
            order: 2,
          });
        }
      }
    }

    // ==================================================
    // LEARN LESSONS
    // ==================================================

    if (
      filter === "all" ||
      filter === "lesson"
    ) {
      const lessons = await db
        .collection("learn_lessons")
        .find({
          published: true,
        })
        .limit(1000)
        .toArray();

      const categories = await db
        .collection("learn_categories")
        .find({
          published: true,
        })
        .toArray();

      const categoryMap = new Map(
        categories.map((category) => [
          category.id,
          category,
        ])
      );

      for (const lesson of lessons) {
        const title =
          typeof lesson.title ===
          "string"
            ? lesson.title
            : "";

        const description =
          typeof lesson.description ===
          "string"
            ? lesson.description
            : "";

        const content =
          typeof lesson.content ===
          "string"
            ? lesson.content
            : "";

        const category =
          categoryMap.get(
            lesson.categoryId
          );

        const categoryName =
          typeof category?.name ===
          "string"
            ? category.name
            : "";

        const score =
          scoreText(
            title,
            query,
            100,
            70,
            50
          ) +
          scoreText(
            categoryName,
            query,
            60,
            40,
            25
          ) +
          scoreText(
            description,
            query,
            30,
            20,
            10
          ) +
          scoreText(
            content,
            query,
            15,
            10,
            5
          );

        if (score > 0) {
          rankedResults.push({
            result: {
              type: "lesson",
              title:
                title || "Learn Lesson",
              description:
                description ||
                "Islamic learning lesson.",
              category:
                categoryName || "Learn",
              slug:
                typeof lesson.slug ===
                "string"
                  ? lesson.slug
                  : undefined,
              url:
                category?.slug &&
                typeof lesson.slug ===
                  "string"
                  ? `/learn/${category.slug}/${lesson.slug}`
                  : undefined,
              verified: false,
            },
            score,
            order: 3,
          });
        }
      }
    }

    // ==================================================
    // FINANCE
    // ==================================================

    if (
      filter === "all" ||
      filter === "finance"
    ) {
      const financeCompanies =
        await db
          .collection("finance_companies")
          .find({})
          .limit(1000)
          .toArray();

      for (const company of financeCompanies) {
        const companyName =
          typeof company.companyName ===
          "string"
            ? company.companyName
            : "";

        const ticker =
          typeof company.ticker ===
          "string"
            ? company.ticker
            : "";

        const exchange =
          typeof company.exchange ===
          "string"
            ? company.exchange
            : "";

        const sector =
          typeof company.sector ===
          "string"
            ? company.sector
            : "";

        const score =
          scoreText(
            companyName,
            query,
            100,
            70,
            50
          ) +
          scoreText(
            ticker,
            query,
            100,
            70,
            50
          ) +
          scoreText(
            exchange,
            query,
            40,
            30,
            20
          ) +
          scoreText(
            sector,
            query,
            60,
            40,
            25
          );

        if (score > 0) {
  rankedResults.push({
    result: {
      type: "finance",

      title:
        companyName ||
        ticker ||
        "Finance Company",

      description:
        ticker
          ? `${ticker}${
              exchange
                ? ` • ${exchange}`
                : ""
            }`
          : "Islamic finance company.",

      reference:
        ticker || undefined,

      category:
        sector || "Finance",

      verified:
        company.verification?.status ===
        "verified",

      verificationStatus:
        typeof company.verification?.status ===
        "string"
          ? company.verification.status
          : undefined,

      sourceName:
        typeof company.financialDataSource?.name ===
        "string"
          ? company.financialDataSource.name
          : undefined,

      sourceUrl:
        typeof company.financialDataSource?.url ===
        "string"
          ? company.financialDataSource.url
          : undefined,

      url: "/finance",
    },

    score,

    order: 4,
  });
}
      }
    }

    // ==================================================
    // RANK RESULTS
    // ==================================================

    rankedResults.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (a.order !== b.order) {
        return a.order - b.order;
      }

      return a.result.title.localeCompare(
        b.result.title
      );
    });

    // ==================================================
    // FINAL DEDUPLICATION
    // ==================================================

    const deduplicatedResults: SearchResult[] =
      [];

    const seenKeys = new Set<string>();

    for (const item of rankedResults) {
      const result = item.result;

      let key = "";

      if (
        result.type === "quran" &&
        result.reference
      ) {
        key =
          `quran:${normalizeSearchText(
            result.reference
          )}`;
      } else if (
        result.type === "finance" &&
        result.reference
      ) {
        key =
          `finance:${normalizeSearchText(
            result.reference
          )}`;
      } else {
        key =
          `${result.type}:${normalizeSearchText(
            result.title
          )}`;
      }

      if (seenKeys.has(key)) {
        continue;
      }

      seenKeys.add(key);
      deduplicatedResults.push(result);
    }

    const results =
      deduplicatedResults.slice(0, 50);

    const response: SearchResponse = {
      success: true,
      query,
      count: results.length,
      results,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      "Global search API failed:",
      error
    );

    const response: SearchResponse = {
      success: false,
      query: "",
      count: 0,
      results: [],
      error:
        "Failed to perform global search.",
    };

    return NextResponse.json(
      response,
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}