"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";

export default function AiCreateInquiryPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const create = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/ai/inquiries", { prompt, debug: true });
      if (data?.ok) {
        toast.success("Inquiry created");
        setCreatedId(data.inquiry?.id || null);
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

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <Card>
        <CardHeader>
          <CardTitle>AI: Create Inquiry from Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Describe the inquiry</label>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6} placeholder="e.g., Customer John, mobile 9999999999, wants a 5-night family package to Goa for 2 adults and 2 children starting 2025-12-10" />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={create} disabled={loading}>{loading ? 'Creating...' : 'Create Inquiry'}</Button>
          </div>
          {createdId && (
            <div className="text-sm text-green-600">Created inquiry: <a className="underline" href={`/inquiries/${createdId}`}>{createdId}</a></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
