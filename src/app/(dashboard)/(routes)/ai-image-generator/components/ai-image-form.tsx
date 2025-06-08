"use client";

import * as z from "zod";
import axios from "axios";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation"; // Use next/navigation

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import ImageUpload from "@/components/ui/image-upload";

const formSchema = z.object({
  prompt: z.string().min(1, { message: "Prompt cannot be empty." }),
  referenceImageUrl: z.string().url().optional().or(z.literal('')),
  style: z.string().optional(),
  platform: z.string().optional(),
  purpose: z.string().optional(),
  targetAudience: z.string().optional(),
  colorScheme: z.string().optional(),
});

type AiImageFormValues = z.infer<typeof formSchema>;

interface AiImageFormProps {
  onImageGenerated: (url: string, prompt: string, enhancedData?: any) => void;
  onGenerationStart: () => void;
  onGenerationError: () => void;
  isLoading: boolean;
}

const AiImageForm: React.FC<AiImageFormProps> = ({
  onImageGenerated,
  onGenerationStart,
  onGenerationError,
  isLoading,
}) => {
  const router = useRouter();
  const form = useForm<AiImageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      referenceImageUrl: "",
      style: "",
      platform: "",
      purpose: "",
      targetAudience: "",
      colorScheme: "",
    },
  });
  const onSubmit = async (data: AiImageFormValues) => {
    try {
      onGenerationStart();

      // Use enhanced API endpoint
      const response = await axios.post('/api/ai-image/enhance', {
        prompt: data.prompt,
        referenceImageUrl: data.referenceImageUrl || undefined,
        style: data.style || undefined,
        platform: data.platform || undefined,
        purpose: data.purpose || undefined,
        targetAudience: data.targetAudience || undefined,
        colorScheme: data.colorScheme || undefined,
      });

      const { imageUrl, enhancedPrompt, metadata, suggestedCaptions, hashtags, bestPostingTimes, engagementTips } = response.data;

      if (imageUrl) {
        onImageGenerated(imageUrl, data.prompt, {
          enhancedPrompt,
          metadata,
          suggestedCaptions,
          hashtags,
          bestPostingTimes,
          engagementTips,
          style: data.style,
          platform: data.platform,
          purpose: data.purpose,
          targetAudience: data.targetAudience,
          colorScheme: data.colorScheme,
          referenceImageUrl: data.referenceImageUrl,
        });
        form.reset();
        router.refresh();
      } else {
        throw new Error("Image URL not found in response");
      }

    } catch (error: any) {
      toast.error('Image generation failed. Please try again.');
      console.error("Generation error:", error);
      onGenerationError();
    }
  };

  // Handle single image upload for reference
  // The ImageUpload component might need adjustment if it's designed for multiple images.
  // This assumes it calls onChange with an array, and we take the first element.
  const handleReferenceImageUpload = (url: string) => { // Changed parameter from urls: string[] to url: string
      form.setValue("referenceImageUrl", url || ""); // Set the URL or empty string
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Image Prompt</FormLabel>
                <FormControl>
                  <Textarea
                    disabled={isLoading}
                    placeholder="e.g., A futuristic cityscape at sunset, synthwave style"
                    {...field}
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="referenceImageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference Image (Optional)</FormLabel>
                <FormControl>
                  <ImageUpload
                    value={field.value ? [field.value] : []}
                    disabled={isLoading}
                    onChange={handleReferenceImageUpload}
                    onRemove={() => field.onChange("")}
                    maxFiles={1}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="platform"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Platform</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={isLoading}>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="twitter">Twitter/X</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="pinterest">Pinterest</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="snapchat">Snapchat</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="style"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visual Style</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={isLoading}>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="photorealistic">Photorealistic</SelectItem>
                    <SelectItem value="artistic">Artistic</SelectItem>
                    <SelectItem value="minimalist">Minimalist</SelectItem>
                    <SelectItem value="vibrant">Vibrant</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
                    <SelectItem value="elegant">Elegant</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="vintage">Vintage</SelectItem>
                    <SelectItem value="futuristic">Futuristic</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content Purpose</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={isLoading}>
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="branding">Branding</SelectItem>
                    <SelectItem value="awareness">Awareness</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="targetAudience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Audience</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={isLoading}>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="millennials">Millennials</SelectItem>
                    <SelectItem value="genz">Gen Z</SelectItem>
                    <SelectItem value="professionals">Professionals</SelectItem>
                    <SelectItem value="parents">Parents</SelectItem>
                    <SelectItem value="students">Students</SelectItem>
                    <SelectItem value="seniors">Seniors</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="colorScheme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color Scheme (Optional)</FormLabel>
                <FormControl>
                  <Input
                    disabled={isLoading}
                    placeholder="e.g., blue and white, warm tones, neon colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-center">
          <Button disabled={isLoading} type="submit" size="lg">
            {isLoading ? 'Generating Enhanced Image...' : 'Generate Enhanced Image'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AiImageForm;

