"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadCmsImage } from "@/lib/cms-image-upload";

type TransactionImageUploadButtonProps = {
  disabled?: boolean;
  isUploading?: boolean;
  onUploadStart?: () => void;
  onUploaded: (url: string) => void | Promise<void>;
  onError?: (error: Error) => void;
  title?: string;
  className?: string;
  iconClassName?: string;
};

export function TransactionImageUploadButton({
  disabled,
  isUploading,
  onUploadStart,
  onUploaded,
  onError,
  title = "Upload Image",
  className = "h-7 w-7 p-0",
  iconClassName = "h-3.5 w-3.5 text-purple-600",
}: TransactionImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    onUploadStart?.();

    try {
      const { url } = await uploadCmsImage(file);
      await onUploaded(url);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Upload failed"));
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={className}
        disabled={disabled || isUploading}
        title={title}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <div className={`${iconClassName} flex items-center justify-center`}>
            <svg
              className={`animate-spin ${iconClassName}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : (
          <Upload className={iconClassName} />
        )}
      </Button>
    </>
  );
}
