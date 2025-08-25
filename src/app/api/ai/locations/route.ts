import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

import OpenAI from "openai";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type CreateFromPromptRequest = {
  prompt?: string;
  imageUrl?: string;
  messages?: ChatMessage[]; // prior chat history + current message (optional)
  template?: "Domestic" | "International";
  stream?: boolean;
  debug?: boolean;
};

function toSlug(text: string) {
  return text
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function ensureArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    // allow comma-separated strings
    if (value.includes(",")) return value.split(",").map((s) => s.trim()).filter(Boolean);
    return [value];
  }
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String) : [String(value)];
  } catch {
    return [String(value)];
  }
}

// Top-level helpers to avoid function-in-block issues under strict mode
async function ensureUniqueSlug(base: string) {
  const baseSlug = toSlug(base) || "location";
  try {
    const existing = await prismadb.location.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    });
    const existingSet = new Set((existing || []).map((e) => e.slug || ""));
    if (!existingSet.has(baseSlug)) return baseSlug;
    let n = 2;
    while (existingSet.has(`${baseSlug}-${n}`)) n++;
    return `${baseSlug}-${n}`;
  } catch (err: any) {
    console.warn("[AI_LOCATIONS] could not check existing slugs, falling back to timestamp suffix", err?.message || err);
    // Fallback: append timestamp to avoid collision when DB is unreachable
    return `${baseSlug}-${Date.now()}`;
  }
}

const TEMPLATE_DEFAULTS = {
  Domestic: {
    inclusions: ["Breakfast included", "Local sightseeing", "Airport pickup"],
    exclusions: ["Personal expenses", "GST", "Entry fees unless specified"],
    importantNotes: ["Carry valid ID", "Weather may vary"],
    paymentPolicy: ["50% advance", "Balance before travel"],
    usefulTip: ["Carry sunscreen", "Stay hydrated"],
    cancellationPolicy: ["Cancellation charges apply as per policy"],
    airlineCancellationPolicy: ["As per airline rules"],
    kitchenGroupPolicy: ["Shared kitchen policy varies by hotel"],
    termsconditions: ["Subject to availability", "Rates subject to change"],
  },
  International: {
    inclusions: ["Breakfast included", "City tour", "Airport transfers"],
    exclusions: ["Visa fees", "Travel insurance", "Personal expenses"],
    importantNotes: ["Passport valid 6+ months", "Currency exchange may apply"],
    paymentPolicy: ["60% advance", "Balance 15 days before travel"],
    usefulTip: ["Carry universal adapter", "Check roaming charges"],
    cancellationPolicy: ["International cancellation policy applies"],
    airlineCancellationPolicy: ["As per international airline rules"],
    kitchenGroupPolicy: ["Kitchen access subject to hotel policy"],
    termsconditions: ["FX rate fluctuations may apply", "Subject to embassy rules"],
  },
} as const;

function mergeWithTemplateDefaults(template: "Domestic" | "International", data: any) {
  const defaults = TEMPLATE_DEFAULTS[template];
  const merged = { ...data };
  const keys = [
    "inclusions",
    "exclusions",
    "importantNotes",
    "paymentPolicy",
    "usefulTip",
    "cancellationPolicy",
    "airlineCancellationPolicy",
    "kitchenGroupPolicy",
    "termsconditions",
  ] as const;
  for (const k of keys) {
    const fromAi = ensureArray((data as any)[k]);
    merged[k] = fromAi.length ? fromAi : defaults[k];
  }
  return merged;
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const body = (await req.json()) as CreateFromPromptRequest;
    const providedImageUrl = body?.imageUrl?.trim();
    const template = body?.template === "International" ? "International" : "Domestic";
  const shouldStream = Boolean(body?.stream) ||
      (req.headers.get("accept") || "").includes("text/event-stream") ||
      req.headers.get("x-stream") === "1";

    // Resolve prompt/messages
    const history: ChatMessage[] = Array.isArray(body?.messages) ? body!.messages! : [];
    const lastUser = body?.prompt?.trim();
    const prompt = lastUser || history.filter(m => m.role === "user").slice(-1)[0]?.content?.trim();
    if (!prompt) return new NextResponse("Prompt is required", { status: 400 });

  // Default image if none provided (keep blank per request)
  const defaultImageUrl = "";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new NextResponse(
        JSON.stringify({
          error: "Missing OPENAI_API_KEY",
          hint: "Set OPENAI_API_KEY in your environment to enable AI creation.",
        }),
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // System instruction and template defaults
    const system = `You extract structured data to create a travel Location entity for a tour packages admin app.
Return STRICT JSON with keys: label (string), tags (array of strings), inclusions (array of strings), exclusions (array of strings), importantNotes (array of strings), paymentPolicy (array of strings), usefulTip (array of strings), cancellationPolicy (array of strings), airlineCancellationPolicy (array of strings), kitchenGroupPolicy (array of strings), termsconditions (array of strings).
Keep lists concise (3-8 items each).`;

    const templateDefaults = {
      Domestic: {
        inclusions: ["Breakfast included", "Local sightseeing", "Airport pickup"],
        exclusions: ["Personal expenses", "GST", "Entry fees unless specified"],
        importantNotes: ["Carry valid ID", "Weather may vary"],
        paymentPolicy: ["50% advance", "Balance before travel"],
        usefulTip: ["Carry sunscreen", "Stay hydrated"],
        cancellationPolicy: ["Cancellation charges apply as per policy"],
        airlineCancellationPolicy: ["As per airline rules"],
        kitchenGroupPolicy: ["Shared kitchen policy varies by hotel"],
        termsconditions: ["Subject to availability", "Rates subject to change"],
      },
      International: {
        inclusions: ["Breakfast included", "City tour", "Airport transfers"],
        exclusions: ["Visa fees", "Travel insurance", "Personal expenses"],
        importantNotes: ["Passport valid 6+ months", "Currency exchange may apply"],
        paymentPolicy: ["60% advance", "Balance 15 days before travel"],
        usefulTip: ["Carry universal adapter", "Check roaming charges"],
        cancellationPolicy: ["International cancellation policy applies"],
        airlineCancellationPolicy: ["As per international airline rules"],
        kitchenGroupPolicy: ["Kitchen access subject to hotel policy"],
        termsconditions: ["FX rate fluctuations may apply", "Subject to embassy rules"],
      },
    } as const;

    // Build message list for the model
    const aiMessages: ChatMessage[] = [
      { role: "system", content: system },
      ...history.filter(m => m.role === "system" || m.role === "assistant" || m.role === "user"),
      { role: "user", content: `Prompt: ${prompt}\nTemplate: ${template}` },
    ];

    const runModelNonStreaming = async () => {
      const completion: any = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        messages: aiMessages,
        response_format: { type: "json_object" },
      });
      return completion.choices?.[0]?.message?.content || "{}";
    };

    const runModelStreaming = async (onChunk: (delta: string) => void) => {
      const completion: any = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        messages: aiMessages,
        response_format: { type: "json_object" },
        stream: true,
      });
      let accumulated = "";
      // stream is an async iterable when stream:true
      for await (const part of completion as AsyncIterable<any>) {
        const delta = part?.choices?.[0]?.delta?.content || "";
        if (delta) {
          accumulated += delta;
          onChunk(delta);
        }
      }
      return accumulated;
    };

  // (ensureUniqueSlug available at top-level)

    // Merge with defaults
    const mergeWithDefaults = (data: any) => {
      const defaults = templateDefaults[template];
      const merged = { ...data };
      const keys = [
        "inclusions",
        "exclusions",
        "importantNotes",
        "paymentPolicy",
        "usefulTip",
        "cancellationPolicy",
        "airlineCancellationPolicy",
        "kitchenGroupPolicy",
        "termsconditions",
      ] as const;
      for (const k of keys) {
        const fromAi = ensureArray((data as any)[k]);
        merged[k] = fromAi.length ? fromAi : defaults[k];
      }
      return merged;
    };

  if (shouldStream) {
      const stream = new ReadableStream<Uint8Array>({
        start: async (controller) => {
          const enc = new TextEncoder();
          const send = (obj: any) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
          const sendStatus = (message: string) => send({ event: "status", message });
          try {
            sendStatus("Initializing");
            send({ event: "template", template });
            sendStatus("Calling OpenAI");
            let streamed = "";
      const content = await runModelStreaming((delta) => {
              streamed += delta;
              // Optionally throttle token streaming; here we just send length updates
              send({ event: "tokens", length: streamed.length });
            });
            sendStatus("Parsing AI output");
            let data: any = {};
            try { data = JSON.parse(content); } catch { data = { label: prompt.slice(0, 50) }; }
            // Emit raw AI extracted JSON
            send({ event: "ai_output", data });
            const label: string = (data.label || prompt).toString().trim();
            if (!label) {
              send({ event: "error", message: "Could not infer label from prompt" });
              controller.close();
              return;
            }
            const uniqueSlug = await ensureUniqueSlug(label);
            const merged = mergeWithDefaults(data);
            const tagsString = ensureArray(merged.tags).join(", ");
            // Emit prepared payload preview prior to save
            send({ event: "prepared", label, slug: uniqueSlug, tags: tagsString, merged });
            sendStatus("Saving to database");
            const created = await prismadb.location.create({
              data: {
                label,
                slug: uniqueSlug,
                imageUrl: providedImageUrl || defaultImageUrl,
                tags: tagsString,
                inclusions: merged.inclusions,
                exclusions: merged.exclusions,
                importantNotes: merged.importantNotes,
                paymentPolicy: merged.paymentPolicy,
                usefulTip: merged.usefulTip,
                cancellationPolicy: merged.cancellationPolicy,
                airlineCancellationPolicy: merged.airlineCancellationPolicy,
                termsconditions: merged.termsconditions,
                kitchenGroupPolicy: merged.kitchenGroupPolicy,
              } as any,
            });
            send({ event: "created", id: created.id, slug: created.slug, label: created.label });
            controller.close();
          } catch (e: any) {
            send({ event: "error", message: e?.message || "Internal error" });
            controller.close();
          }
        },
      });
      return new NextResponse(stream as any, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // Non-streaming path
  const content = await runModelNonStreaming();
    let data: any = {};
    try { data = JSON.parse(content); } catch { data = { label: prompt.slice(0, 50) }; }

    const label: string = (data.label || prompt).toString().trim();
    if (!label) return new NextResponse("Could not infer label from prompt", { status: 400 });

    const uniqueSlug = await ensureUniqueSlug(label);
    const merged = mergeWithDefaults(data);
    const tagsString = ensureArray(merged.tags).join(", ");

    try {
      const created = await prismadb.location.create({
        data: {
          label,
          slug: uniqueSlug,
    imageUrl: providedImageUrl || defaultImageUrl,
          tags: tagsString,
          inclusions: merged.inclusions,
          exclusions: merged.exclusions,
          importantNotes: merged.importantNotes,
          paymentPolicy: merged.paymentPolicy,
          usefulTip: merged.usefulTip,
          cancellationPolicy: merged.cancellationPolicy,
          airlineCancellationPolicy: merged.airlineCancellationPolicy,
          termsconditions: merged.termsconditions,
          kitchenGroupPolicy: merged.kitchenGroupPolicy,
        } as any,
      });

      const response: any = { ok: true, location: created };
      if (body?.debug) {
        response.debug = {
          label,
          slug: uniqueSlug,
          tags: tagsString,
          ai: data,
          merged,
          template,
        };
      }
      return NextResponse.json(response);
    } catch (prismaErr: any) {
      console.error("[AI_LOCATIONS_DB_ERROR]", prismaErr?.message || prismaErr);
      const resp: any = { ok: false, message: "DB write failed" };
      if (body?.debug) {
        resp.debug = {
          label,
          slug: uniqueSlug,
          tags: tagsString,
          ai: data,
          merged,
          template,
          prismaError: prismaErr?.message || String(prismaErr),
        };
      }
      return NextResponse.json(resp, { status: 500 });
    }
  } catch (err) {
    console.error("[AI_LOCATIONS_POST]", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
