"use client";

import { CldUploadWidget } from 'next-cloudinary';
import { useEffect, useState, useId, useCallback, useRef } from 'react';

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ImagePlus, Trash, Sparkles } from 'lucide-react';
import { AIImageGeneratorModal } from "@/components/ui/ai-image-generator-modal";

interface ImageUploadProps {
  disabled?: boolean;
  onChange: (value: string) => void;
  onRemove: (value: string) => void;
  value: string[];
  maxFiles?: number;
  enableAI?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  disabled,
  onChange,
  onRemove,
  value,
  enableAI = false
}) => {
  const [isMounted, setIsMounted] = useState(false);
  // Generate a unique ID for this widget instance to prevent conflicts
  const uniqueId = useId();
  // Use a ref to store the widget ID to ensure it remains stable across re-renders
  const widgetIdRef = useRef(`upload-widget-${uniqueId}-${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Memoize the onUpload callback to prevent unnecessary re-renders
  const onUpload = useCallback((result: any) => {
    if (result?.info?.secure_url) {
      onChange(result.info.secure_url);
    }
  }, [onChange]);

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
              unoptimized={!url.includes("cloudinary.com")}
            />
          </div>
        ))}
      </div>
      <CldUploadWidget
        onUpload={onUpload}
        uploadPreset="ckwg6oej"
        options={{
          multiple: false,
          maxFiles: 1,
          clientAllowedFormats: ['image'],
          sources: ['local', 'url', 'camera'],
        }}
      >
        {({ open }) => {
          const onClick = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            open();
          };

          return (
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={disabled}
                variant="secondary"
                onClick={onClick}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Upload an Image
              </Button>
              {enableAI && (
                 <AIImageGeneratorModal 
                   onImageGenerated={(url) => onChange(url)}
                   trigger={
                     <Button type="button" disabled={disabled} variant="outline" className="border-indigo-200 hover:bg-indigo-50 text-indigo-700">
                       <Sparkles className="h-4 w-4 mr-2" />
                       Generate with AI
                     </Button>
                   }
                 />
              )}
            </div>
          );
        }}
      </CldUploadWidget>
    </div>
  );
}

export default ImageUpload;

