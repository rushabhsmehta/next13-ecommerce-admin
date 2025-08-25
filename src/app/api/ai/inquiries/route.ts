import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import OpenAI from "openai";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type CreateFromPromptRequest = {
  prompt?: string;
  messages?: ChatMessage[];
  template?: "Quick" | "Full";
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

async function ensureUniqueSlugForLocation(base: string) {
  const baseSlug = toSlug(base) || "location";
  try {
    const existing = await prismadb.location.findMany({ where: { slug: { startsWith: baseSlug } }, select: { slug: true } });
    const existingSet = new Set((existing || []).map((e) => e.slug || ""));
    if (!existingSet.has(baseSlug)) return baseSlug;
    let n = 2;
    while (existingSet.has(`${baseSlug}-${n}`)) n++;
    return `${baseSlug}-${n}`;
  } catch (err: any) {
    return `${baseSlug}-${Date.now()}`;
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const body = (await req.json()) as CreateFromPromptRequest;
    const template = body?.template === "Full" ? "Full" : "Quick";
    const shouldStream = Boolean(body?.stream) || (req.headers.get("accept") || "").includes("text/event-stream") || req.headers.get("x-stream") === "1";
    const history: ChatMessage[] = Array.isArray(body?.messages) ? body!.messages! : [];
    const lastUser = body?.prompt?.trim();
    const prompt = lastUser || history.filter((m) => m.role === "user").slice(-1)[0]?.content?.trim();
    if (!prompt) return new NextResponse("Prompt is required", { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return new NextResponse(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 });
    const openai = new OpenAI({ apiKey });

    const system = `Extract structured data to create an Inquiry for a travel admin app. Return STRICT JSON with: customerName (string), customerMobileNumber (string), location (string, name or slug), numAdults (int), numChildrenAbove11 (int), numChildren5to11 (int), numChildrenBelow5 (int), journeyDate (ISO date or human readable), remarks (string). Keep values concise.`;

    const aiMessages: ChatMessage[] = [
      { role: "system", content: system },
      ...history,
      { role: "user", content: `Prompt: ${prompt}\nTemplate: ${template}` },
    ];

    const runModelNonStreaming = async () => {
      const completion: any = await openai.chat.completions.create({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.3, messages: aiMessages, response_format: { type: "json_object" } });
      return completion.choices?.[0]?.message?.content || "{}";
    };

    const runModelStreaming = async (onChunk: (delta: string) => void) => {
      const completion: any = await openai.chat.completions.create({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.3, messages: aiMessages, response_format: { type: "json_object" }, stream: true });
      let accumulated = "";
      for await (const part of completion as AsyncIterable<any>) {
        const delta = part?.choices?.[0]?.delta?.content || "";
        if (delta) {
          accumulated += delta;
          onChunk(delta);
        }
      }
      return accumulated;
    };

    if (shouldStream) {
      const stream = new ReadableStream<Uint8Array>({
        start: async (controller) => {
          const enc = new TextEncoder();
          const send = (obj: any) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
          const sendStatus = (m: string) => send({ event: "status", message: m });
          try {
            sendStatus("Initializing");
            send({ event: "template", template });
            sendStatus("Calling OpenAI");
            let streamed = "";
            const content = await runModelStreaming((delta) => {
              streamed += delta;
              send({ event: "tokens", length: streamed.length });
            });
            sendStatus("Parsing AI output");
            let data: any = {};
            try { data = JSON.parse(content); } catch { data = { customerName: "" }; }
            send({ event: "ai_output", data });

            // Resolve location: try find existing by slug or label, else create minimal location
            const locName = (data.location || "").toString().trim();
            let locationId = "";
            if (locName) {
              const found = await prismadb.location.findFirst({ where: { OR: [{ slug: locName }, { label: locName }] } });
              if (found) locationId = found.id;
              else {
                const slug = await ensureUniqueSlugForLocation(locName);
                const createdLoc = await prismadb.location.create({ data: { label: locName, slug, imageUrl: "" } as any });
                locationId = createdLoc.id;
              }
            }

            const prepared = {
              customerName: data.customerName || "",
              customerMobileNumber: data.customerMobileNumber || "",
              locationId,
              numAdults: parseInt(data.numAdults || 0) || 0,
              numChildrenAbove11: parseInt(data.numChildrenAbove11 || 0) || 0,
              numChildren5to11: parseInt(data.numChildren5to11 || 0) || 0,
              numChildrenBelow5: parseInt(data.numChildrenBelow5 || 0) || 0,
              journeyDate: data.journeyDate || null,
              remarks: data.remarks || "",
            };

            send({ event: "prepared", prepared });
            sendStatus("Saving inquiry");
            const created = await prismadb.inquiry.create({ data: { customerName: prepared.customerName || "Unknown", customerMobileNumber: prepared.customerMobileNumber || "", locationId: prepared.locationId || "", numAdults: prepared.numAdults, numChildrenAbove11: prepared.numChildrenAbove11, numChildren5to11: prepared.numChildren5to11, numChildrenBelow5: prepared.numChildrenBelow5, journeyDate: prepared.journeyDate ? new Date(prepared.journeyDate) : null, remarks: prepared.remarks, status: "pending" } as any });
            send({ event: "created", id: created.id });
            controller.close();
          } catch (e: any) {
            send({ event: "error", message: e?.message || "Internal error" });
            controller.close();
          }
        }
      });
      return new NextResponse(stream as any, { status: 200, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
    }

    // Non-streaming
    const content = await runModelNonStreaming();
    let data: any = {};
    try { data = JSON.parse(content); } catch { data = {}; }
    // find or create location
    const locName = (data.location || "").toString().trim();
    let locationId = "";
    if (locName) {
      const found = await prismadb.location.findFirst({ where: { OR: [{ slug: locName }, { label: locName }] } });
      if (found) locationId = found.id;
      else {
        const slug = await ensureUniqueSlugForLocation(locName);
        const createdLoc = await prismadb.location.create({ data: { label: locName, slug, imageUrl: "" } as any });
        locationId = createdLoc.id;
      }
    }

    const prepared = {
      customerName: data.customerName || "",
      customerMobileNumber: data.customerMobileNumber || "",
      locationId,
      numAdults: parseInt(data.numAdults || 0) || 0,
      numChildrenAbove11: parseInt(data.numChildrenAbove11 || 0) || 0,
      numChildren5to11: parseInt(data.numChildren5to11 || 0) || 0,
      numChildrenBelow5: parseInt(data.numChildrenBelow5 || 0) || 0,
      journeyDate: data.journeyDate || null,
      remarks: data.remarks || "",
    };

    try {
      const created = await prismadb.inquiry.create({ data: { customerName: prepared.customerName || "Unknown", customerMobileNumber: prepared.customerMobileNumber || "", locationId: prepared.locationId || "", numAdults: prepared.numAdults, numChildrenAbove11: prepared.numChildrenAbove11, numChildren5to11: prepared.numChildren5to11, numChildrenBelow5: prepared.numChildrenBelow5, journeyDate: prepared.journeyDate ? new Date(prepared.journeyDate) : null, remarks: prepared.remarks, status: "pending" } as any });
      const resp: any = { ok: true, inquiry: created };
      if (body?.debug) resp.debug = { ai: data, prepared, template };
      return NextResponse.json(resp);
    } catch (dbErr: any) {
      const resp: any = { ok: false, message: "DB write failed" };
      if (body?.debug) resp.debug = { ai: data, prepared, template, dbError: dbErr?.message || String(dbErr) };
      return NextResponse.json(resp, { status: 500 });
    }
  } catch (err: any) {
    console.error("[AI_INQUIRIES_POST]", err?.message || err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
