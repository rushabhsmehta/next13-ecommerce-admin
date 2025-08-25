import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import OpenAI from "openai";
import { dateToUtc } from "@/lib/timezone-utils";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type CreateFromPromptRequest = {
  prompt?: string;
  messages?: ChatMessage[];
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
    const template = body?.template === "International" ? "International" : "Domestic";
    const shouldStream = Boolean(body?.stream) || (req.headers.get("accept") || "").includes("text/event-stream") || req.headers.get("x-stream") === "1";

    const history: ChatMessage[] = Array.isArray(body?.messages) ? body!.messages! : [];
    const lastUser = body?.prompt?.trim();
    const prompt = lastUser || history.filter((m) => m.role === "user").slice(-1)[0]?.content?.trim();
    if (!prompt) return new NextResponse("Prompt is required", { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return new NextResponse(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 });
    const openai = new OpenAI({ apiKey });

  const system = `Extract structured data to create a Tour Package Query for a travel admin app. Return STRICT JSON with keys:
tourPackageQueryName (string), location (string), tourCategory ("Domestic"|"International"), customerName (string), customerNumber (string), numDaysNight (string), period (string), numAdults (int), numChild5to12 (int), numChild0to5 (int), journeyStart (date string), journeyEnd (date string), transport (string), pickup_location (string), drop_location (string), price (string), pricePerAdult (string), pricePerChild5to12YearsNoBed (string), pricePerChildOrExtraBed (string), pricePerChildwithSeatBelow5Years (string), totalPrice (string), remarks (string), inclusions (array of strings), exclusions (array of strings), importantNotes (array of strings), paymentPolicy (array of strings), usefulTip (array of strings), cancellationPolicy (array of strings), airlineCancellationPolicy (array of strings), kitchenGroupPolicy (array of strings), termsconditions (array of strings),
itineraries (array of objects) where each object has: dayNumber (int), days (string, optional), itineraryTitle (string), itineraryDescription (string), hotelName (string, optional), numberofRooms (string, optional), roomCategory (string, optional), mealsIncluded (string, optional), itineraryImages (array of { url: string }, optional), roomAllocations (array of { roomType: string, occupancyType: string, mealPlan?: string, quantity?: int, guestNames?: string }, optional), transportDetails (array of { vehicleType: string, quantity?: int, description?: string }, optional).
Keep lists concise (3-8 items). Prefer names over IDs for hotels, room types, occupancy, meal plans, vehicle types.`;

    const aiMessages: ChatMessage[] = [
      { role: "system", content: system },
      ...history,
      { role: "user", content: `Prompt: ${prompt}\nTemplate: ${template}` },
    ];

    const runModelNonStreaming = async () => {
      const completion: any = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        messages: aiMessages,
        response_format: { type: "json_object" },
      });
      return completion.choices?.[0]?.message?.content || "{}";
    };

    const runModelStreaming = async (onChunk: (delta: string) => void) => {
      const completion: any = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        messages: aiMessages,
        response_format: { type: "json_object" },
        stream: true,
      });
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

    const resolveOrCreateLocation = async (locName: string) => {
      const name = (locName || "").toString().trim();
      if (!name) return "";
      const found = await prismadb.location.findFirst({ where: { OR: [{ slug: name }, { label: name }] } });
      if (found) return found.id;
      const slug = await ensureUniqueSlugForLocation(name);
      const created = await prismadb.location.create({ data: { label: name, slug, imageUrl: "" } as any });
      return created.id;
    };

    const prepareData = async (data: any) => {
      const locId = await resolveOrCreateLocation(data.location || "");
      const mergedPolicies = mergeWithTemplateDefaults(template, data);
      const tourCategory = data.tourCategory === "International" ? "International" : template;
      // Dates
      const tourStartsFrom = dateToUtc(data.journeyStart || data.tourStartsFrom || null);
      const tourEndsOn = dateToUtc(data.journeyEnd || data.tourEndsOn || null);

      return {
        tourPackageQueryName: (data.tourPackageQueryName || "").toString().trim() || undefined,
        customerName: (data.customerName || "").toString().trim() || undefined,
        customerNumber: (data.customerNumber || "").toString().trim() || undefined,
        numDaysNight: (data.numDaysNight || "").toString().trim() || undefined,
        locationId: locId,
        period: (data.period || "").toString().trim() || undefined,
        numAdults: String(parseInt(data.numAdults || 0) || 0),
        numChild5to12: String(parseInt(data.numChild5to12 || 0) || 0),
        numChild0to5: String(parseInt(data.numChild0to5 || 0) || 0),
        tourCategory,
        transport: (data.transport || "").toString().trim() || undefined,
        pickup_location: (data.pickup_location || "").toString().trim() || undefined,
        drop_location: (data.drop_location || "").toString().trim() || undefined,
        tourStartsFrom: tourStartsFrom,
        tourEndsOn: tourEndsOn,
        price: (data.price || "").toString() || undefined,
        pricePerAdult: (data.pricePerAdult || "").toString() || undefined,
        pricePerChild5to12YearsNoBed: (data.pricePerChild5to12YearsNoBed || "").toString() || undefined,
        pricePerChildOrExtraBed: (data.pricePerChildOrExtraBed || "").toString() || undefined,
        pricePerChildwithSeatBelow5Years: (data.pricePerChildwithSeatBelow5Years || "").toString() || undefined,
        totalPrice: (data.totalPrice || "").toString() || undefined,
        remarks: (data.remarks || "").toString() || undefined,
        inclusions: mergedPolicies.inclusions,
        exclusions: mergedPolicies.exclusions,
        importantNotes: mergedPolicies.importantNotes,
        paymentPolicy: mergedPolicies.paymentPolicy,
        usefulTip: mergedPolicies.usefulTip,
        cancellationPolicy: mergedPolicies.cancellationPolicy,
        airlineCancellationPolicy: mergedPolicies.airlineCancellationPolicy,
        kitchenGroupPolicy: mergedPolicies.kitchenGroupPolicy,
        termsconditions: mergedPolicies.termsconditions,
        __itineraries: Array.isArray(data.itineraries) ? data.itineraries : [],
      } as any;
    };

    // Lookup caches for names -> IDs
    const buildLookups = async (locationId: string) => {
      const [hotels, roomTypes, occupancyTypes, mealPlans, vehicleTypes] = await Promise.all([
        prismadb.hotel.findMany({ where: { locationId }, select: { id: true, name: true } }),
        prismadb.roomType.findMany({ select: { id: true, name: true } }),
        prismadb.occupancyType.findMany({ select: { id: true, name: true } }),
        prismadb.mealPlan.findMany({ select: { id: true, name: true, code: true } }),
        prismadb.vehicleType.findMany({ select: { id: true, name: true } }),
      ]);
      const toMap = (arr: any[], keyA: string, keyB?: string) => {
        const map = new Map<string, string>();
        for (const i of arr) {
          const a = (i[keyA] || "").toString().toLowerCase();
          if (a) map.set(a, i.id);
          if (keyB) {
            const b = (i[keyB] || "").toString().toLowerCase();
            if (b) map.set(b, i.id);
          }
        }
        return map;
      };
      return {
        hotelByName: toMap(hotels, "name"),
        roomTypeByName: toMap(roomTypes, "name"),
        occupancyByName: toMap(occupancyTypes, "name"),
        mealPlanByNameOrCode: toMap(mealPlans, "name", "code"),
        vehicleTypeByName: toMap(vehicleTypes, "name"),
      };
    };

    const createItineraryGraph = async (tourPackageQueryId: string, locationId: string, aiItinerary: any, lookups: any) => {
      // Resolve hotel
      let hotelId: string | undefined = undefined;
      const hotelName = (aiItinerary.hotelName || aiItinerary.hotel || "").toString().trim().toLowerCase();
      if (hotelName) hotelId = lookups.hotelByName.get(hotelName);

      // Create itinerary first
      const createdItinerary = await prismadb.itinerary.create({
        data: {
          itineraryTitle: (aiItinerary.itineraryTitle || aiItinerary.title || "").toString() || null,
          itineraryDescription: (aiItinerary.itineraryDescription || aiItinerary.description || "").toString() || null,
          locationId,
          tourPackageQueryId,
          dayNumber: aiItinerary.dayNumber ? parseInt(aiItinerary.dayNumber) || null : null,
          days: aiItinerary.days ? String(aiItinerary.days) : null,
          hotelId: hotelId || undefined,
          numberofRooms: aiItinerary.numberofRooms ? String(aiItinerary.numberofRooms) : null,
          roomCategory: aiItinerary.roomCategory ? String(aiItinerary.roomCategory) : null,
          mealsIncluded: aiItinerary.mealsIncluded ? String(aiItinerary.mealsIncluded) : null,
          itineraryImages: {
            createMany: {
              data: Array.isArray(aiItinerary.itineraryImages)
                ? aiItinerary.itineraryImages
                    .map((img: any) => ({ url: (img?.url || img)?.toString() }))
                    .filter((i: any) => i.url)
                : [],
            },
          },
        },
      });

      // Create room allocations
      if (Array.isArray(aiItinerary.roomAllocations) && aiItinerary.roomAllocations.length) {
        for (const ra of aiItinerary.roomAllocations) {
          const roomTypeId = lookups.roomTypeByName.get((ra.roomType || ra.room || "").toString().toLowerCase());
          const occupancyTypeId = lookups.occupancyByName.get((ra.occupancyType || ra.occupancy || "").toString().toLowerCase());
          const mealPlanId = lookups.mealPlanByNameOrCode.get((ra.mealPlan || ra.meal || ra.mealPlanCode || "").toString().toLowerCase());
          if (!roomTypeId || !occupancyTypeId) continue;
          await prismadb.roomAllocation.create({
            data: {
              itineraryId: createdItinerary.id,
              roomTypeId,
              occupancyTypeId,
              mealPlanId: mealPlanId || undefined,
              quantity: ra.quantity ? parseInt(ra.quantity) || 1 : 1,
              guestNames: (ra.guestNames || "").toString() || "",
            },
          });
        }
      }

      // Create transport details
      if (Array.isArray(aiItinerary.transportDetails) && aiItinerary.transportDetails.length) {
        for (const td of aiItinerary.transportDetails) {
          const vehicleTypeId = lookups.vehicleTypeByName.get((td.vehicleType || td.vehicle || "").toString().toLowerCase());
          if (!vehicleTypeId) continue;
          await prismadb.transportDetail.create({
            data: {
              itineraryId: createdItinerary.id,
              vehicleTypeId,
              quantity: td.quantity ? parseInt(td.quantity) || 1 : 1,
              description: (td.description || "").toString() || "",
            },
          });
        }
      }

      return createdItinerary.id;
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
            try { data = JSON.parse(content); } catch { data = {}; }
            send({ event: "ai_output", data });

            sendStatus("Preparing payload");
            const prepared = await prepareData(data);
            send({ event: "prepared", prepared });

            if (!prepared.locationId) {
              send({ event: "error", message: "Could not resolve or create location" });
              controller.close();
              return;
            }

            sendStatus("Saving to database");
            const { __itineraries, ...baseData } = prepared;
            const created = await prismadb.tourPackageQuery.create({ data: baseData });
            send({ event: "created", id: created.id });

            // Create itineraries + nested details
            if (Array.isArray(__itineraries) && __itineraries.length) {
              sendStatus("Creating itineraries");
              const lookups = await buildLookups(baseData.locationId);
              let index = 0;
              for (const it of __itineraries) {
                try {
                  const itId = await createItineraryGraph(created.id, baseData.locationId, it, lookups);
                  index++;
                  send({ event: "itinerary_created", index, itineraryId: itId });
                } catch (e: any) {
                  send({ event: "itinerary_error", index: index + 1, message: e?.message || "Failed to create itinerary" });
                }
              }
            }
            controller.close();
          } catch (e: any) {
            send({ event: "error", message: e?.message || "Internal error" });
            controller.close();
          }
        },
      });
      return new NextResponse(stream as any, { status: 200, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
    }

    // Non-streaming
    const content = await runModelNonStreaming();
    let data: any = {};
    try { data = JSON.parse(content); } catch { data = {}; }
    const prepared = await prepareData(data);

    try {
      const { __itineraries, ...baseData } = prepared;
      const created = await prismadb.tourPackageQuery.create({ data: baseData });

      // Build lookups and create itineraries after main record
      let createdItineraries = 0;
      if (Array.isArray(__itineraries) && __itineraries.length) {
        const lookups = await buildLookups(baseData.locationId);
        for (const it of __itineraries) {
          try {
            await createItineraryGraph(created.id, baseData.locationId, it, lookups);
            createdItineraries++;
          } catch (e) {
            // continue; leave partial OK
          }
        }
      }

      const resp: any = { ok: true, tourPackageQuery: created };
      if (body?.debug) resp.debug = { ai: data, prepared, template };
      return NextResponse.json(resp);
    } catch (dbErr: any) {
      const resp: any = { ok: false, message: "DB write failed" };
      if (body?.debug) resp.debug = { ai: data, prepared, template, dbError: dbErr?.message || String(dbErr) };
      return NextResponse.json(resp, { status: 500 });
    }
  } catch (err: any) {
    console.error("[AI_TOURPACKAGEQUERY_POST]", err?.message || err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
