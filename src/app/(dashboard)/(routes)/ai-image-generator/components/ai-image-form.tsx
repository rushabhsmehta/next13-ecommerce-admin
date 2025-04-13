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
import { Textarea } from "@/components/ui/textarea"; // Assuming Textarea component exists
import ImageUpload from "@/components/ui/image-upload"; // Assuming ImageUpload component exists

const formSchema = z.object({
  prompt: z.string().min(1, { message: "Prompt cannot be empty." }),
  referenceImageUrl: z.string().url().optional().or(z.literal('')), // Allow empty string or valid URL
});

type AiImageFormValues = z.infer<typeof formSchema>;

interface AiImageFormProps {
  onImageGenerated: (url: string, prompt: string, referenceUrl?: string) => void;
  onGenerationStart: () => void;
  onGenerationError: () => void;
  isLoading: boolean; // Receive loading state from parent
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
    },
  });

  const onSubmit = async (data: AiImageFormValues) => {
    try {
      onGenerationStart(); // Notify parent that generation is starting

      const payload = {
        prompt: data.prompt,
        ...(data.referenceImageUrl && { referenceImageUrl: data.referenceImageUrl }), // Only include if present
      };

      const response = await axios.post('/api/ai-image/generate', payload);
      const { imageUrl } = response.data;

      if (imageUrl) {
        onImageGenerated(imageUrl, data.prompt, data.referenceImageUrl || undefined);
        form.reset(); // Reset form after successful generation
        router.refresh(); // Refresh data if needed (e.g., for gallery)
      } else {
          throw new Error("Image URL not found in response");
      }

    } catch (error: any) {
      toast.error('Image generation failed. Please try again.');
      console.error("Generation error:", error);
      onGenerationError(); // Notify parent about the error
    }
    // No finally block needed here as parent controls isLoading based on callbacks
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
        <div className="md:grid md:grid-cols-2 gap-8"> {/* Adjust grid layout as needed */}
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
                    rows={5} // Adjust rows as needed
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
              control={form.control}
              name="referenceImageUrl" // This name must match the schema
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Image (Optional)</FormLabel>
                  <FormControl>
                    {/* Adapt ImageUpload:
                        - Ensure it handles a single URL value correctly.
                        - Pass field.value and a modified onChange.
                        - May need internal state management or prop changes in ImageUpload itself.
                    */}
                    <ImageUpload
                      value={field.value ? [field.value] : []} // Pass value as array (ImageUpload might expect array)
                      disabled={isLoading}
                      onChange={handleReferenceImageUpload} // Use corrected handler
                      onRemove={() => field.onChange("")} // Clear the value on remove
                      maxFiles={1} // Enforce single file
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <Button disabled={isLoading} className="ml-auto" type="submit">
          {isLoading ? 'Generating...' : 'Generate Image'}
        </Button>
      </form>
    </Form>
  );
};

export default AiImageForm;

