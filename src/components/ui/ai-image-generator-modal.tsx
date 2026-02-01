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
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Loader2, 
  Sparkles, 
  Wand2, 
  Settings, 
  Image as ImageIcon,
  Download,
  RefreshCw,
  Info
} from "lucide-react";
import Image from "next/image";
import axios from "axios";
import { toast } from "react-hot-toast";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AIImageGeneratorModalProps {
  onImageGenerated: (url: string) => void;
  trigger?: React.ReactNode;
  autoPrompt?: string;
  aspectRatio?: "1:1" | "4:3" | "16:9" | "9:16" | "3:4";
}

const aspectRatioInfo: Record<string, { label: string; description: string; icon: string }> = {
  "1:1": { label: "Square", description: "Perfect for social media posts", icon: "⬛" },
  "4:3": { label: "Landscape", description: "Standard travel photography", icon: "🖼️" },
  "16:9": { label: "Wide", description: "Cinematic landscape views", icon: "📺" },
  "9:16": { label: "Portrait", description: "Mobile-optimized vertical", icon: "📱" },
  "3:4": { label: "Portrait", description: "Traditional portrait format", icon: "🖼️" },
};

export function AIImageGeneratorModal({ onImageGenerated, trigger, autoPrompt, aspectRatio = "1:1" }: AIImageGeneratorModalProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("blurry, low quality, distorted, ugly, bad anatomy, watermark, text");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(aspectRatio);
  const [steps, setSteps] = useState(30);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [lastAutoPrompt, setLastAutoPrompt] = useState<string | undefined>(autoPrompt);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  
  // Handle dialog open/close and keep prompt in sync with autoPrompt where appropriate
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);

    if (isOpen) {
      const hasPrompt = prompt.trim().length > 0;
      const autoPromptChanged = autoPrompt !== undefined && autoPrompt !== lastAutoPrompt;
      const wasAutoPromptApplied = lastAutoPrompt !== undefined && prompt === lastAutoPrompt;

      // If there is an autoPrompt, either seed an empty prompt
      // or refresh the prompt when autoPrompt has changed and the user
      // has not modified the previous auto-generated prompt.
      if (autoPrompt && (!hasPrompt || (autoPromptChanged && wasAutoPromptApplied))) {
        setPrompt(autoPrompt);
        setLastAutoPrompt(autoPrompt);
      }
    } else {
      // When closing, clear any previously generated image URL
      setGeneratedUrl(null);
      // Optionally clear the prompt if it was auto-generated or empty,
      // so that a future open can pick up a new autoPrompt.
      if (!prompt.trim() || (lastAutoPrompt !== undefined && prompt === lastAutoPrompt)) {
        setPrompt("");
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      setLoading(true);
      setGeneratedUrl(null);
      setGenerationTime(null);
      
      const startTime = Date.now();

      const response = await axios.post("/api/ai/images", {
        prompt,
        aspectRatio: selectedAspectRatio,
        negativePrompt,
        steps,
        guidanceScale
      });

      const endTime = Date.now();
      setGenerationTime((endTime - startTime) / 1000); // Convert to seconds

      if (response.data.success && response.data.url) {
        setGeneratedUrl(response.data.url);
        toast.success("Image generated successfully!");
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      const errorMessage = error.response?.data?.message || "Failed to generate image. Please try a different prompt.";
      toast.error(errorMessage);
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
      setGenerationTime(null);
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const resetAdvancedSettings = () => {
    setSteps(30);
    setGuidanceScale(7.5);
    setNegativePrompt("blurry, low quality, distorted, ugly, bad anatomy, watermark, text");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            AI Generate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Wand2 className="h-6 w-6 text-indigo-500" />
            AI Image Generator
            <span className="text-sm font-normal text-muted-foreground ml-2">
              Powered by RunPod GPU
            </span>
          </DialogTitle>
          <DialogDescription>
             Create stunning AI-generated images for your tour packages using advanced GPU-powered diffusion models.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Left side - Controls */}
          <div className="space-y-4">
            <Tabs defaultValue="prompt" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="prompt" className="gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Prompt
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="prompt" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt" className="text-base font-semibold">
                    Image Description
                  </Label>
                  <Textarea
                    id="prompt"
                    placeholder="e.g. A luxury houseboat in Kerala backwaters at sunset, palm trees, golden hour lighting, photorealistic, 8k, detailed"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 Be specific and descriptive for best results
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aspectRatio" className="text-base font-semibold">
                    Aspect Ratio
                  </Label>
                  <Select value={selectedAspectRatio} onValueChange={(value: any) => setSelectedAspectRatio(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(aspectRatioInfo).map(([ratio, info]) => (
                        <SelectItem key={ratio} value={ratio}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{info.icon}</span>
                            <div className="flex flex-col">
                              <span className="font-medium">{ratio} - {info.label}</span>
                              <span className="text-xs text-muted-foreground">{info.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="negativePrompt" className="text-base font-semibold">
                    Negative Prompt (Optional)
                  </Label>
                  <Textarea
                    id="negativePrompt"
                    placeholder="Things to avoid in the image..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    ℹ️ Describe what you don't want in the image
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <p className="font-semibold mb-1">Advanced Settings</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Fine-tune the generation parameters. Default values work well for most cases.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="steps" className="text-base font-semibold">
                      Inference Steps
                    </Label>
                    <span className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {steps}
                    </span>
                  </div>
                  <Slider
                    id="steps"
                    min={10}
                    max={100}
                    step={5}
                    value={[steps]}
                    onValueChange={([value]) => setSteps(value)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    More steps = higher quality but slower generation (recommended: 20-50)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="guidance" className="text-base font-semibold">
                      Guidance Scale
                    </Label>
                    <span className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {guidanceScale.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    id="guidance"
                    min={1}
                    max={20}
                    step={0.5}
                    value={[guidanceScale]}
                    onValueChange={([value]) => setGuidanceScale(value)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    How closely to follow the prompt (recommended: 7-12)
                  </p>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetAdvancedSettings}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right side - Preview */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Preview</Label>
              <div 
                className="relative w-full border-2 border-dashed rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden"
                style={{ minHeight: '400px' }}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-4 text-muted-foreground p-8">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                    <div className="text-center">
                      <p className="text-lg font-semibold mb-1">Creating your image...</p>
                      <p className="text-sm">This may take 30-60 seconds</p>
                      <div className="mt-4 flex items-center gap-2 text-xs">
                        <div className="animate-pulse">⚡</div>
                        <span>GPU is working hard</span>
                        <div className="animate-pulse">⚡</div>
                      </div>
                    </div>
                  </div>
                ) : generatedUrl ? (
                  <div className="relative w-full h-full p-4">
                    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg">
                      <Image 
                        src={generatedUrl} 
                        alt="Generated result" 
                        fill 
                        className="object-contain"
                        unoptimized={true}
                      />
                    </div>
                    {generationTime && (
                      <div className="absolute top-6 right-6 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-mono">
                        ⏱️ {generationTime.toFixed(1)}s
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                    <div className="mb-4 flex justify-center">
                      <div className="relative">
                        <Wand2 className="h-16 w-16 opacity-20" />
                        <Sparkles className="h-8 w-8 absolute -top-2 -right-2 text-indigo-400 opacity-40" />
                      </div>
                    </div>
                    <p className="text-lg font-semibold mb-2">Ready to Create</p>
                    <p className="text-sm max-w-xs mx-auto">
                      Enter a detailed prompt and click Generate to create your AI-powered image
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Generation info */}
            {generatedUrl && (
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-sm text-green-900 dark:text-green-100">
                  <Sparkles className="h-4 w-4 text-green-500" />
                  <span className="font-semibold">Generation Complete!</span>
                </div>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Image created successfully in {generationTime?.toFixed(1)}s using RunPod GPU
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {generatedUrl ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleRegenerate}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
              <Button 
                onClick={handleUseImage} 
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                <Download className="h-4 w-4" />
                Use This Image
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleGenerate} 
              disabled={loading || !prompt.trim()} 
              className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Image
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
