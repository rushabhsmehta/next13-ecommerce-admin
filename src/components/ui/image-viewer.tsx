"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ImageViewerProps {
  images: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialImageIndex?: number;
  onDelete?: (imageUrl: string, index: number) => void;
}

const ImageViewer = ({
  images,
  open,
  onOpenChange,
  initialImageIndex = 0,
  onDelete
}: ImageViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialImageIndex);
  const [isDeleting, setIsDeleting] = useState(false);
  
  if (images.length === 0) return null;
  
  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };
  
  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };
  
  const handleDelete = async () => {
    if (onDelete && images.length > 0) {
      setIsDeleting(true);
      
      try {
        const imageToDelete = images[currentIndex];
        await onDelete(imageToDelete, currentIndex);
        
        // If we're deleting the last image in the array, move to the previous one
        if (currentIndex === images.length - 1 && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        }
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black/95 border-0">
        <div className="relative w-full h-[80vh] flex items-center justify-center">
          <Button
            variant="ghost"
            aria-label="Previous image"
            className="absolute left-4 z-10 rounded-full bg-black/50 p-2 hover:bg-black/70"
            onClick={handlePrevious}
            disabled={images.length <= 1}
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </Button>
          
          <div className="relative w-full h-full flex justify-center items-center">
            <Image
              src={images[currentIndex]}
              alt={`Image ${currentIndex + 1}`}
              className="object-contain"
              fill
              sizes="(max-width: 1024px) 100vw, 80vw"
              priority
            />
          </div>
          
          <Button
            variant="ghost"
            aria-label="Next image"
            className="absolute right-4 z-10 rounded-full bg-black/50 p-2 hover:bg-black/70"
            onClick={handleNext}
            disabled={images.length <= 1}
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </Button>
            <div className="absolute top-4 right-4 z-10 flex gap-2">            {onDelete && (              <Button 
                variant="ghost" 
                className="rounded-full bg-red-500/70 p-2 hover:bg-red-600/70" 
                onClick={handleDelete}
                disabled={isDeleting}
                aria-label="Delete image"
              >
                {isDeleting ? (
                  <div className="h-4 w-4 flex items-center justify-center">
                    <svg className="animate-spin text-white h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : (
                  <Trash2 className="h-4 w-4 text-white" />
                )}
              </Button>
            )}
            <Button 
              variant="ghost" 
              className="rounded-full bg-black/50 p-2 hover:bg-black/70" 
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4 text-white" />
            </Button>
          </div>
          
          {images.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {images.map((_, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  aria-label={`Go to image ${idx + 1}`}
                  className={`h-2 w-2 rounded-full p-0 ${
                    idx === currentIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                  onClick={() => setCurrentIndex(idx)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;
