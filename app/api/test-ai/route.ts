import { NextResponse } from "next/server";
import { pipeline } from "@huggingface/transformers";

let generator: any = null;

async function getGenerator() {
  if (!generator) {
    generator = await pipeline(
      "text-generation",
      "HuggingFaceTB/SmolLM2-360M-Instruct"
    );
  }

  return generator;
}

export async function POST(request: Request) {
  try {
    const { question, context } = await request.json();

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          message: "Question is required",
        },
        { status: 400 }
      );
    }

    if (!context) {
      return NextResponse.json(
        {
          success: false,
          message: "Context is required",
        },
        { status: 400 }
      );
    }

    const model = await getGenerator();

    const prompt = `
You are HalalWise, an Islamic educational assistant.

Your job is to explain the verified information provided by HalalWise.

STRICT RULES:

1. Use ONLY the information explicitly present in the verified context.
2. Do not add Islamic facts from your own knowledge.
3. Do not invent or paraphrase Quran verses as if they were quotations.
4. Do not invent Hadith, scholars, fatwas, rulings, or references.
5. Do not create a new source or citation.
6. Do not claim something is halal or haram unless the provided context explicitly supports that claim.
7. If the context is insufficient, say:
   "I don't have enough verified information in the HalalWise knowledge base to answer this reliably."
8. Keep the answer simple and educational.
9. Do not present the answer as a fatwa.
10. Do not mention information that is not supported by the provided context.

VERIFIED CONTEXT:
${context}

USER QUESTION:
${question}

Answer using only the verified context above.
`;

    const messages = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const output = await model(messages, {
      max_new_tokens: 150,
    });

    return NextResponse.json({
      success: true,
      question,
      output,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "AI model test failed",
      },
      { status: 500 }
    );
  }
}