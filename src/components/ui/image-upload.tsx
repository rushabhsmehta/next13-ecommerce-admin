"use client";

import { useEffect, useState, useRef, useCallback } from "react";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ImagePlus, Trash, Sparkles, Loader2 } from "lucide-react";
import { AIImageGeneratorModal } from "@/components/ui/ai-image-generator-modal";
import { shouldUseUnoptimizedImage, uploadCmsImage } from "@/lib/cms-image-upload";
import toast from "react-hot-toast";

interface ImageUploadProps {
  disabled?: boolean;
  onChange: (value: string) => void;
  onRemove: (value: string) => void;
  value: string[];
  maxFiles?: number;
  enableAI?: boolean;
  autoPrompt?: string;
  aspectRatio?: "1:1" | "4:3" | "16:9" | "9:16" | "3:4";
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  disabled,
  onChange,
  onRemove,
  value,
  enableAI = false,
  autoPrompt,
  aspectRatio = "1:1",
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) {
        return;
      }

      setIsUploading(true);
      try {
        const { url } = await uploadCmsImage(file);
        onChange(url);
        toast.success("Image uploaded");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        toast.error(message);
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  if (!isMounted) {
    return null;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        {value.map((url) => (
          <div key={url} className="relative w-[200px] h-[200px] rounded-md overflow-hidden">
            <div className="z-10 absolute top-2 right-2">
              <Button type="button" onClick={() => onRemove(url)} variant="destructive" size="sm">
                <Trash className="h-4 w-4" />
              </Button>
            </div>
            <Image
              fill
              className="object-cover"
              alt="Image"
              src={url}
              unoptimized={shouldUseUnoptimizedImage(url)}
            />
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={disabled || isUploading}
          variant="secondary"
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4 mr-2" />
          )}
          {isUploading ? "Uploading..." : "Upload an Image"}
        </Button>
        {enableAI && (
          <AIImageGeneratorModal
            onImageGenerated={(url) => onChange(url)}
            autoPrompt={autoPrompt}
            aspectRatio={aspectRatio}
            trigger={
              <Button
                type="button"
                disabled={disabled || isUploading}
                variant="outline"
                className="border-indigo-200 hover:bg-indigo-50 text-indigo-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate with AI
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
