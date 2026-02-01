"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import Image from "next/image";
import axios from "axios";
import { toast } from "react-hot-toast";

interface AIImageGeneratorModalProps {
  onImageGenerated: (url: string) => void;
  trigger?: React.ReactNode;
}

export function AIImageGeneratorModal({ onImageGenerated, trigger }: AIImageGeneratorModalProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      setLoading(true);
      setGeneratedUrl(null);

      const response = await axios.post("/api/ai/images", {
        prompt,
        aspectRatio: "1:1"
      });

      if (response.data.success && response.data.url) {
        setGeneratedUrl(response.data.url);
        toast.success("Image generated successfully!");
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.response?.data?.message || "Failed to generate image. Please try a different prompt.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseImage = () => {
    if (generatedUrl) {
      onImageGenerated(generatedUrl);
      setOpen(false);
      setGeneratedUrl(null);
      setPrompt("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            AI Generate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Generate with Banana Pro
          </DialogTitle>
          <DialogDescription>
             Describe the image you want to create for your tour package.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Input
              id="prompt"
              placeholder="e.g. A luxury houseboat in Kerala backwaters at sunset"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
          </div>

          <div className="min-h-[250px] w-full border rounded-md flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm">Creating magic...</span>
              </div>
            ) : generatedUrl ? (
              <div className="relative w-full h-full aspect-square">
                 <Image 
                   src={generatedUrl} 
                   alt="Generated result" 
                   fill 
                   className="object-cover"
                   unoptimized={true}
                 />
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-4">
                <Wand2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Enter a prompt and click Generate</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {generatedUrl ? (
             <Button onClick={handleUseImage} className="w-full">
               Use This Image
             </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="w-full">
              {loading ? "Generating..." : "Generate Image"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
