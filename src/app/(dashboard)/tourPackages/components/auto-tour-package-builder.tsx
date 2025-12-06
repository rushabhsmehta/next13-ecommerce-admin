"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, MessageCircle, RefreshCw, SendHorizontal, Sparkles, Copy } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface UsageMeta {
  model?: string | null;
  promptTokens?: number | null;
  responseTokens?: number | null;
  totalTokens?: number | null;
}

interface AutoTourPackageBuilderProps {
  instructions: string;
  starterPrompts: string[];
}

const tonePresets: Record<string, string> = {
  balanced: "Maintain a professional yet warm tone suited for premium FIT travellers.",
  celebratory: "Sound energetic and celebratory as if pitching a milestone getaway to an excited family.",
  budgetFocused: "Lean into value engineering, call out shared transfers and 3-star hotels where relevant.",
  luxury: "Highlight exclusivity, private transfers, suites, and curated experiences with an aspirational voice.",
};

export function AutoTourPackageBuilder({
  instructions,
  starterPrompts,
}: AutoTourPackageBuilderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usage, setUsage] = useState<UsageMeta | null>(null);
  const [tone, setTone] = useState<keyof typeof tonePresets>("balanced");
  const [customNotes, setCustomNotes] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  const instructionSummary = useMemo(() => {
    const trimmed = instructions.trim();
    const blocks = trimmed.split(/## /);

    return blocks
      .map((block, index) => {
        const content = block.trim();
        if (!content) return null;

        if (index === 0 && !trimmed.startsWith("##")) {
          return { title: "Overview", body: content };
        }

        const [titleLine, ...rest] = content.split("\n");
        return {
          title: titleLine.trim().replace(/^#+\s*/, ""),
          body: rest.join("\n").trim(),
        };
      })
      .filter(Boolean) as { title: string; body: string }[];
  }, [instructions]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ description: "Copied to clipboard" });
    } catch (error) {
      console.error("[AUTO_TOUR_PKG] copy failed", error);
      toast({ variant: "destructive", description: "Unable to copy. Please try again." });
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim() && !customNotes.trim()) {
      toast({ variant: "destructive", description: "Add a prompt or extra notes." });
      return;
    }

    const userContent = [prompt.trim(), customNotes.trim()].filter(Boolean).join("\n\nAdditional Notes: ");
    if (!userContent) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userContent,
      createdAt: new Date().toISOString(),
    };

    const historyPayload = [...messages, userMessage].map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setCustomNotes("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ai/auto-tour-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage.content,
          history: historyPayload,
          tone: tonePresets[tone],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to reach OpenAI");
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setUsage(data.usage ?? null);
      scrollToBottom();
    } catch (error) {
      console.error("[AUTO_TOUR_PKG] generate failed", error);
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setUsage(null);
    setTone("balanced");
    setPrompt("");
    setCustomNotes("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Auto Tour Package Builder
              </CardTitle>
              <CardDescription>
                Craft tour-ready packages with OpenAI using the internal Aagam playbook.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={isSubmitting || messages.length === 0}>
                <RefreshCw className="mr-2 h-4 w-4" /> Reset chat
              </Button>
              <Badge variant="outline">Model: {usage?.model ?? "gpt-4.1-mini"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[minmax(220px,260px)_1fr]">
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tone Preset
                </label>
                <Select value={tone} onValueChange={(value) => setTone(value as keyof typeof tonePresets)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(tonePresets).map((key) => (
                      <SelectItem key={key} value={key}>
                        {key === "balanced"
                          ? "Balanced"
                          : key === "celebratory"
                          ? "Celebratory"
                          : key === "budgetFocused"
                          ? "Budget Focused"
                          : "Luxury"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tonePresets[tone]}
                </p>
                <Separator className="my-2" />
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quick Starters
                </label>
                <div className="flex flex-col gap-2">
                  {starterPrompts.map((sample) => (
                    <Button
                      key={sample}
                      variant="secondary"
                      size="sm"
                      className="justify-start text-left"
                      onClick={() => setPrompt(sample)}
                    >
                      <MessageCircle className="mr-2 h-3.5 w-3.5" />
                      {sample}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Prompt
                </label>
                <Textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Describe the traveller profile, destination, season, must-dos, and budget guardrails."
                  className="min-h-[160px]"
                />
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Extra notes for AI (optional)
                </label>
                <Input
                  value={customNotes}
                  onChange={(event) => setCustomNotes(event.target.value)}
                  placeholder="e.g., Mention scuba add-on and spotlight 4-star hotels only"
                />
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-muted-foreground">
                    OpenAI sees the entire chat history so you can refine further responses.
                  </div>
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating
                      </>
                    ) : (
                      <>
                        <SendHorizontal className="mr-2 h-4 w-4" /> Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[420px]">
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            <CardDescription>Refine the plan by adding more prompts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ScrollArea className="h-[420px] pr-4">
                {messages.length === 0 ? (
                  <div className="flex h-[360px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
                    <Sparkles className="mb-3 h-6 w-6 text-primary" />
                    Start with a quick prompt or paste an inquiry brief to let OpenAI draft the first package.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`rounded-lg border p-4 text-sm leading-relaxed ${
                          message.role === "assistant"
                            ? "border-primary/30 bg-primary/5"
                            : "border-muted bg-background"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-wide">
                          <span className="font-semibold">
                            {message.role === "assistant" ? "Aagam AI" : "You"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleCopyMessage(message.content)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <pre className="whitespace-pre-wrap text-[13px] leading-relaxed">
                          {message.content}
                        </pre>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </ScrollArea>
              {usage && (
                <div className="rounded-md bg-muted px-4 py-2 text-xs text-muted-foreground">
                  Tokens: {usage.totalTokens ?? "-"} (prompt {usage.promptTokens ?? "-"} / response {usage.responseTokens ?? "-"})
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Instruction Playbook</CardTitle>
            <CardDescription>These guardrails keep outputs consistent for the ops team.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end pb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyMessage(instructions)}
                className="gap-2"
              >
                <Copy className="h-3.5 w-3.5" /> Copy instructions
              </Button>
            </div>
            <ScrollArea className="h-[520px] pr-4">
              <div className="space-y-4 text-sm">
                {instructionSummary.map((section, index) => (
                  <div key={section.title + index} className="space-y-1">
                    <h3 className="font-semibold">{section.title}</h3>
                    <p className="whitespace-pre-wrap text-muted-foreground">{section.body}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tips</CardTitle>
            <CardDescription>Help OpenAI stay factual.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>Include traveller count, age group, and preferred hotel category.</li>
              <li>Specify flight requirements or whether pricing should exclude air.</li>
              <li>Add any mandatory experiences so they are never dropped.</li>
              <li>After the first draft, ask for tweaks instead of restarting.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
