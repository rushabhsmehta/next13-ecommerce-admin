"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function AiCreateTourPackageQueryPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [template, setTemplate] = useState<"Domestic" | "International">("Domestic");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [status, setStatus] = useState<string>("");
  const [tokenCount, setTokenCount] = useState<number>(0);

  const createNonStreaming = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt");
    setLoading(true);
    setCreatedId(null);
    try {
      const { data } = await axios.post("/api/ai/tourPackageQuery", { prompt, template, messages, debug: true });
      if (data?.ok) {
        toast.success("Tour Package Query created");
        setCreatedId(data.tourPackageQuery?.id || null);
        setMessages((prev) => [...prev, { role: "user", content: prompt }, { role: "assistant", content: `Created query ${data.tourPackageQuery?.id}` }]);
        router.refresh();
      } else {
        toast.error(data?.message || "Failed");
      }
    } catch (e: any) {
      toast.error(e?.response?.data || "Error");
    } finally {
      setLoading(false);
    }
  };

  const createStreaming = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt");
    setLoading(true);
    setCreatedId(null);
    setStatus("");
    setTokenCount(0);
    try {
      const res = await fetch("/api/ai/tourPackageQuery", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ prompt, template, messages, stream: true }),
      });
      if (!res.ok || !res.body) throw new Error("SSE request failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const processChunk = (text: string) => {
        const parts = text.split(/\n\n/).filter(Boolean);
        for (const block of parts) {
          const line = block.trim();
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          try {
            const evt = JSON.parse(json);
            if (evt.event === "status") setStatus(evt.message);
            if (evt.event === "tokens") setTokenCount(evt.length || 0);
            if (evt.event === "created") {
              setCreatedId(evt.id);
              toast.success("Tour Package Query created");
              setMessages((prev) => [...prev, { role: "user", content: prompt }, { role: "assistant", content: `Created query ${evt.id}` }]);
            }
            if (evt.event === "error") toast.error(evt.message || "Error");
          } catch {}
        }
      };
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
          <CardTitle>AI: Create Tour Package Query from Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Describe the query</label>
            <Textarea
              placeholder="e.g., 5N/6D Goa family trip for 2 adults, 2 kids, start 2025-12-10, pickups from Mumbai, prefer beachside hotel, budget mid-range."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Template</label>
            <div className="flex gap-2">
              <Button type="button" variant={template === "Domestic" ? "default" : "outline"} onClick={() => setTemplate("Domestic")} disabled={loading}>Domestic</Button>
              <Button type="button" variant={template === "International" ? "default" : "outline"} onClick={() => setTemplate("International")} disabled={loading}>International</Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={createStreaming} disabled={loading}>{loading ? `Creating… ${status ? `(${status})` : ""}` : "Create (Stream)"}</Button>
            <Button variant="outline" onClick={createNonStreaming} disabled={loading}>Create (Non-Stream)</Button>
            <Link href="/tourPackageQuery" className="text-sm text-muted-foreground underline">View all queries</Link>
            {createdId && (
              <Link href={`/tourPackageQuery/${createdId}`} className="text-sm text-green-600 underline">Open created query</Link>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {status && <span>Status: {status} • </span>}Tokens: {tokenCount}
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
