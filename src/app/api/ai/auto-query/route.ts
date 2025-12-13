
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import OpenAI from "openai";
import { z } from "zod";

import { handleApi, jsonError } from "@/lib/api-response";
import { AUTO_QUERY_SYSTEM_PROMPT } from "@/lib/ai/tour-package-instructions";

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
    systemInstruction: z.string().optional(),
    customInstruction: z.string().optional(),
});

export async function POST(req: Request) {
    return handleApi(async () => {
        const { userId } = auth();
        if (!userId) {
            return jsonError("Unauthenticated", 403, "AUTH");
        }

        const parsed = bodySchema.parse(await req.json());

        // Force load .env to override system vars
        const dotenv = require('dotenv');
        dotenv.config({ override: true });

        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            console.error("[AUTO_QUERY] Missing OPENAI_API_KEY env var");
            return jsonError("OpenAI API key is not configured", 500, "NO_OPENAI_KEY");
        }

        const modelId = process.env.OPENAI_TOUR_MODEL ?? "gpt-4o-mini";
        const openai = new OpenAI({ apiKey });

        const historyMessages: ChatMessage[] = parsed.history.map((message) => ({
            role: message.role,
            content: message.content,
        }));

        const previousMessages = historyMessages.length > 0 ? historyMessages.slice(0, -1) : [];

        // Construct system message
        let systemContent = parsed.systemInstruction || AUTO_QUERY_SYSTEM_PROMPT;
        if (parsed.customInstruction) {
            systemContent += `\n\n## User Custom Instructions\n${parsed.customInstruction}`;
        }

        const chatMessages: ChatMessage[] = [
            {
                role: "system",
                content: systemContent
            },
            ...previousMessages,
        ];

        const augmentedPrompt = parsed.tone
            ? `Use the following tone instructions before drafting the proposal: ${parsed.tone}.\n\n${parsed.prompt}`
            : parsed.prompt;

        chatMessages.push({ role: "user", content: augmentedPrompt });

        // Force correct model if env var is invalid
        let finalModelId = modelId;
        if (modelId === "gpt-4.1-mini") {
            finalModelId = "gpt-4o-mini";
        }

        const completion = await openai.chat.completions.create({
            model: finalModelId,
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
