"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  SendHorizontal,
  Sparkles,
  Copy,
  Bot,
  User,
  Settings2,
  RotateCcw,
  Eraser,
  Lightbulb,
  PanelRightOpen,
  PlusCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  parsedJson?: any;
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
  instructions: defaultInstructions,
  starterPrompts,
}: AutoTourPackageBuilderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [usage, setUsage] = useState<UsageMeta | null>(null);
  const [tone, setTone] = useState<keyof typeof tonePresets>("balanced");
  const [systemInstruction, setSystemInstruction] = useState(defaultInstructions);
  const [customInstruction, setCustomInstruction] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  // Fetch custom instructions on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/ai/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.customInstructions) {
            setCustomInstruction(data.customInstructions);
          }
          if (data.systemInstruction) {
            setSystemInstruction(data.systemInstruction);
          }
        }
      } catch (error) {
        console.error("Failed to fetch AI settings", error);
      }
    };
    fetchSettings();
  }, []);

  // Save custom instructions on change (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await fetch("/api/ai/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customInstructions: customInstruction,
            systemInstruction: systemInstruction
          }),
        });
      } catch (error) {
        console.error("Failed to save AI settings", error);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [customInstruction, systemInstruction]);

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

  const extractJson = (content: string) => {
    const match = content.match(/```json\n([\s\S]*?)\n```/);
    if (match) {
      try {
        return {
          text: content.replace(match[0], "").trim(),
          data: JSON.parse(match[1])
        };
      } catch (e) {
        return { text: content, data: null };
      }
    }
    return { text: content, data: null };
  };

  const handleCreatePackage = async (json: any) => {
    setIsCreating(true);
    try {
      // Store the AI result as a draft
      const draftKey = 'autoTourPackageDraft';
      localStorage.setItem(draftKey, JSON.stringify({
        timestamp: new Date().toISOString(),
        data: json
      }));

      toast({
        title: "Draft Generated",
        description: "Redirecting to review page...",
      });
      router.push(`/tourPackages/new`);
    } catch (error) {
      console.error("Failed to process package draft:", error);
      toast({
        title: "Error",
        description: "Failed to process package draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt.trim(),
      createdAt: new Date().toISOString(),
    };

    const historyPayload = [...messages, userMessage].map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setIsSubmitting(true);

    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const response = await fetch("/api/ai/auto-tour-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage.content,
          history: historyPayload,
          tone: tonePresets[tone],
          systemInstruction: systemInstruction,
          customInstruction: customInstruction,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to reach OpenAI");
      }

      const data = await response.json();
      const { text, data: parsedJson } = extractJson(data.message);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: text,
        parsedJson: parsedJson,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setUsage(null);
    setPrompt("");
  };

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col relative">
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between border-b pb-4 mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Package Designer</h2>
            <p className="text-xs text-muted-foreground">Powered by {usage?.model ?? "gpt-4o-mini"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset} title="Clear Chat">
              <Eraser className="h-4 w-4 mr-2" /> Clear
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Instructions
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[800px] sm:w-[800px] sm:max-w-[800px] overflow-y-auto flex flex-col h-full">
              <SheetHeader>
                <SheetTitle>Custom Instructions</SheetTitle>
                <SheetDescription>
                  Control how the AI behaves. These instructions are hidden from the chat but guide every response.
                </SheetDescription>
              </SheetHeader>

              <div className="py-6 space-y-6 flex-1 flex flex-col">
                <div className="space-y-2 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Custom Instructions (Safe)</label>
                    {isSaving ? (
                      <Badge variant="secondary" className="text-[10px] h-5">Saving...</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">Saved</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add specific rules like &quot;Use British English&quot; or &quot;Always suggest vegan food&quot;. These are appended to the system prompt.
                  </p>
                  <Textarea
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder="e.g. Focus on eco-friendly hotels..."
                    className="min-h-[200px] text-sm flex-1 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Core System Prompt (Advanced)</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSystemInstruction(defaultInstructions)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" /> Reset to Default
                    </Button>
                  </div>
                  <Textarea
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    className="min-h-[400px] font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Pro Tips
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                    <li>Include traveller count, age group, and preferred hotel category in your prompt.</li>
                    <li>Specify flight requirements or whether pricing should exclude air.</li>
                    <li>Add any mandatory experiences so they are never dropped.</li>
                    <li>After the first draft, ask for tweaks instead of restarting.</li>
                  </ul>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <ScrollArea className="flex-1 pr-4 -mr-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
              <div className="mb-6 rounded-full bg-muted p-6">
                <Bot className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight mb-2">How can I help you plan?</h3>
              <p className="text-muted-foreground max-w-md mb-8">
                I can draft detailed itineraries, suggest hotels, and calculate pricing based on your requirements.
              </p>

              <div className="grid gap-3 w-full max-w-2xl grid-cols-1 md:grid-cols-2">
                {starterPrompts.map((starter) => (
                  <button
                    key={starter}
                    onClick={() => setPrompt(starter)}
                    className="flex flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left text-sm transition-all hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="font-medium">Draft a package</span>
                    <span className="text-muted-foreground line-clamp-2 text-xs">
                      {starter}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 pb-4 max-w-3xl mx-auto w-full">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4 group",
                    message.role === "assistant" ? "bg-transparent" : ""
                  )}
                >
                  <Avatar className={cn(
                    "h-8 w-8 border shadow-sm mt-1",
                    message.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <AvatarFallback className={message.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted"}>
                      {message.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {message.role === "assistant" ? "Aagam AI" : "You"}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleCopyMessage(message.content)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert leading-relaxed">
                      <pre className="whitespace-pre-wrap font-sans text-sm bg-transparent p-0 border-none">
                        {message.content}
                      </pre>
                    </div>
                    {message.parsedJson && (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 border-primary/20 hover:bg-primary/5"
                          onClick={() => handleCreatePackage(message.parsedJson)}
                          disabled={isCreating}
                        >
                          {isCreating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <PlusCircle className="h-4 w-4" />
                          )}
                          Create Draft Package
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="mt-4 max-w-3xl mx-auto w-full">
        <div className="relative flex flex-col gap-2 rounded-xl border bg-background p-4 shadow-sm focus-within:ring-1 focus-within:ring-ring">
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the trip (e.g. '5 days in Kerala for a couple, luxury hotels')..."
            className="min-h-[60px] w-full resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Select value={tone} onValueChange={(v) => setTone(v as any)}>
                <SelectTrigger className="h-8 w-[140px] text-xs border-0 bg-muted/50 hover:bg-muted">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="celebratory">Celebratory</SelectItem>
                  <SelectItem value="budgetFocused">Budget</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!prompt.trim() || isSubmitting}
              className={cn("h-8 w-8 rounded-lg p-0", prompt.trim() ? "bg-primary" : "bg-muted text-muted-foreground")}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          AI can make mistakes. Review generated packages before sending to clients.
        </p>
      </div>
    </div>
  );
}