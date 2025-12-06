import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import OpenAI from "openai";
import { z } from "zod";

import { handleApi, jsonError } from "@/lib/api-response";
import { AUTO_TOUR_PACKAGE_SYSTEM_PROMPT } from "@/lib/ai/tour-package-instructions";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  prompt: z.string().min(8, "Please provide a little more detail."),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .optional()
    .default([]),
  tone: z.string().max(240).optional(),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) {
      return jsonError("Unauthenticated", 403, "AUTH");
    }

    const parsed = bodySchema.parse(await req.json());
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[AUTO_TOUR_PKG] Missing OPENAI_API_KEY env var");
      return jsonError("OpenAI API key is not configured", 500, "NO_OPENAI_KEY");
    }

    const modelId = process.env.OPENAI_TOUR_MODEL ?? "gpt-4.1-mini";
    const openai = new OpenAI({ apiKey });

    const historyMessages: ChatMessage[] = parsed.history.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const previousMessages = historyMessages.length > 0 ? historyMessages.slice(0, -1) : [];
    const chatMessages: ChatMessage[] = [
      { role: "system", content: AUTO_TOUR_PACKAGE_SYSTEM_PROMPT },
      ...previousMessages,
    ];

    const augmentedPrompt = parsed.tone
      ? `Use the following tone instructions before drafting the package: ${parsed.tone}.\n\n${parsed.prompt}`
      : parsed.prompt;

    chatMessages.push({ role: "user", content: augmentedPrompt });

    const completion = await openai.chat.completions.create({
      model: modelId,
      temperature: 0.65,
      top_p: 0.9,
      messages: chatMessages,
    });

    const responseText = completion.choices[0]?.message?.content ?? "";
    const usage = completion.usage;

    return NextResponse.json({
      message: responseText,
      usage: {
        model: completion.model,
        promptTokens: usage?.prompt_tokens ?? null,
        responseTokens: usage?.completion_tokens ?? null,
        totalTokens: usage?.total_tokens ?? null,
      },
    });
  });
}
