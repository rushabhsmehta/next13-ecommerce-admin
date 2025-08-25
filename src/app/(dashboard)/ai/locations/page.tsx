"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function AiCreateLocationPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [template, setTemplate] = useState<"Domestic" | "International">("Domestic");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [status, setStatus] = useState<string>("");
  const [tokenCount, setTokenCount] = useState<number>(0);
  const evtSourceRef = useRef<EventSource | null>(null);

  const createNonStreaming = async () => {
    if (!prompt.trim()) {
      toast.error("Enter a prompt");
      return;
    }
    setLoading(true);
    setCreatedId(null);
    try {
      const { data } = await axios.post("/api/ai/locations", { prompt, imageUrl: imageUrl || undefined, template, messages });
      if (data?.ok) {
        toast.success("Location created");
        setCreatedId(data.location?.id || null);
        setMessages((prev) => [...prev, { role: "user", content: prompt }, { role: "assistant", content: `Created ${data.location?.label} (${data.location?.slug})` }]);
        router.refresh();
      } else {
        toast.error("Failed to create");
      }
    } catch (e: any) {
      toast.error(e?.response?.data || "Error creating location");
    } finally {
      setLoading(false);
    }
  };

  const createStreaming = async () => {
    if (!prompt.trim()) {
      toast.error("Enter a prompt");
      return;
    }
    setLoading(true);
    setCreatedId(null);
    setStatus("");
    setTokenCount(0);
    try {
      if (evtSourceRef.current) {
        evtSourceRef.current.close();
      }
      const url = "/api/ai/locations";
      const payload = { prompt, imageUrl: imageUrl || undefined, template, messages, stream: true };
      // Use fetch for SSE: initiate request first to set cookie/auth headers implicitly
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !res.body) throw new Error("SSE request failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      // simple SSE parser
      const processChunk = (text: string) => {
        const lines = text.split(/\n\n/).filter(Boolean);
        for (const block of lines) {
          const line = block.trim();
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          try {
            const evt = JSON.parse(json);
            if (evt.event === "status") setStatus(evt.message);
            if (evt.event === "tokens") setTokenCount(evt.length || 0);
            if (evt.event === "created") {
              setCreatedId(evt.id);
              toast.success("Location created");
              setMessages((prev) => [...prev, { role: "user", content: prompt }, { role: "assistant", content: `Created ${evt.label} (${evt.slug})` }]);
            }
            if (evt.event === "error") {
              toast.error(evt.message || "Error");
            }
          } catch {}
        }
      };
      // Read stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        processChunk(decoder.decode(value, { stream: true }));
      }
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Streaming failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <Card>
        <CardHeader>
          <CardTitle>AI: Create Location from Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Describe the location</label>
            <Textarea
              placeholder="e.g., Create a tropical beach destination in Goa ideal for family trips; include water sports, local cuisine highlights, and safety tips."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Optional image URL</label>
            <Input
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={createStreaming} disabled={loading}>
              {loading ? `Creating… ${status ? `(${status})` : ""}` : "Create (Stream)"}
            </Button>
            <Button variant="outline" onClick={createNonStreaming} disabled={loading}>
              Create (Non-Stream)
            </Button>
            <Link href="/locations" className="text-sm text-muted-foreground underline">
              View all locations
            </Link>
            {createdId && (
              <Link href={`/locations/${createdId}`} className="text-sm text-green-600 underline">
                Open created location
              </Link>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {status && <span>Status: {status} • </span>}Tokens: {tokenCount}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Template</label>
            <div className="flex gap-2">
              <Button type="button" variant={template === "Domestic" ? "default" : "outline"} onClick={() => setTemplate("Domestic")} disabled={loading}>Domestic</Button>
              <Button type="button" variant={template === "International" ? "default" : "outline"} onClick={() => setTemplate("International")} disabled={loading}>International</Button>
            </div>
          </div>
          {messages.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Conversation</label>
              <div className="border rounded p-3 max-h-64 overflow-auto text-sm">
                {messages.map((m, i) => (
                  <div key={i} className="mb-2">
                    <span className="font-semibold mr-2">{m.role === "user" ? "You:" : "AI:"}</span>
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
