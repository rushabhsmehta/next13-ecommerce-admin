# AI Image Generation for Tour Package Query Itineraries

> **⚠️ DEPRECATED**: This document describes the old Google Imagen implementation. 
> See [ai-image-generation-runpod.md](./ai-image-generation-runpod.md) for the current RunPod GPU implementation.

## Overview
This feature has been migrated from Google's Imagen 4.0 to RunPod GPU for cost efficiency and better control. This document is kept for historical reference.

For current documentation, see: **[AI Image Generation - RunPod GPU Integration](./ai-image-generation-runpod.md)**

---

## Legacy Implementation (Google Imagen)

This feature enabled AI-powered image generation for itinerary day images and activity images in Tour Package Queries. The system used Google's Imagen 4.0 to create relevant travel images.

## Features

### 1. Auto-Prompt Generation
- **Day Images**: Automatically generates prompts from:
  - Day title
  - Day description
  - Associated activities (up to first 3)
  - Context: "suitable for a travel itinerary"
  
- **Activity Images**: Automatically generates prompts from:
  - Activity title
  - Activity description
  - Context: "suitable for a travel itinerary"

### 2. Aspect Ratio Support
- **4:3 aspect ratio** is used for itinerary images (matches PDF display format)
- API supports: 1:1, 4:3, 16:9, 9:16, 3:4

### 3. HTML Stripping
- All HTML tags are automatically removed from titles and descriptions
- Ensures clean, readable prompts for the AI

### 4. Smart Truncation
- Descriptions longer than 200 characters are truncated
- Prevents overly long prompts that might confuse the AI
- Activities are limited to first 3 to keep prompts focused

## Implementation Details

### Modified Components

#### 1. `src/components/ui/ai-image-generator-modal.tsx`
- Added `autoPrompt` prop to pre-fill the prompt field
- Added `aspectRatio` prop to support different image ratios
- Modal now pre-populates with auto-generated prompt when opened

#### 2. `src/components/ui/image-upload.tsx`
- Added `autoPrompt` prop (string)
- Added `aspectRatio` prop (default: "1:1")
- Passes these props through to AIImageGeneratorModal

#### 3. `src/app/api/ai/images/route.ts`
- Updated schema to support all aspect ratios: 1:1, 4:3, 16:9, 9:16, 3:4
- Removed hardcoded aspect ratio conversion
- Passes aspect ratio directly to Google Imagen API

#### 4. `src/components/tour-package-query/ItineraryTab.tsx`
- Added `stripHtml()` helper function
- Added `generateItineraryImagePrompt()` function
- Added `generateActivityImagePrompt()` function
- Enabled AI generation for itinerary images (`enableAI={true}`)
- Enabled AI generation for activity images (`enableAI={true}`)
- Set aspect ratio to 4:3 for both

#### 5. `src/app/(dashboard)/(routes)/tourpackagequeryfrominquiry/associate/[inquiryId]/components/ItineraryTab.tsx`
- Applied same changes as main ItineraryTab for associate partners

## Usage

### For End Users

1. **Navigate to Tour Package Query** → Edit any query
2. **Go to Itinerary Tab** → Select a day
3. **Scroll to "Destination Images"** section
4. **Click "Generate with AI"** button
5. The modal opens with an auto-generated prompt based on:
   - Day title
   - Day description
   - Activities for that day
6. **Review/Edit the prompt** if needed
7. **Click "Generate Image"** to create the image
8. **Click "Use This Image"** to add it to the itinerary

The same process works for **Activity Images** within each day.

### Example Auto-Generated Prompts

#### Day Prompt
```
Day 1: Arrival in Kerala. Welcome to Kerala, the land of backwaters 
and spices. You will be transferred to your hotel and check in. 
Activities include: Airport Transfer: Comfortable transfer from 
Cochin International Airport to your hotel. Hotel Check-in: Check 
into your luxurious resort with backwater views. Create a beautiful, 
scenic travel destination image that captures the essence of this 
day's activities in 4:3 aspect ratio, suitable for a travel itinerary.
```

#### Activity Prompt
```
Elephant Safari. Exciting elephant safari through the lush forests 
of Periyar Wildlife Sanctuary. Spot wild animals in their natural 
habitat including elephants, tigers, and exotic birds. Create a 
beautiful, scenic image that captures the essence of this activity 
in 4:3 aspect ratio, suitable for a travel itinerary.
```

## Technical Notes

### Aspect Ratio Selection
- **4:3 ratio chosen** because PDF generation displays itinerary images using:
  ```html
  <div style="width: 100%; padding-bottom: 75%; /* 4:3 aspect ratio */">
  ```
  (75% = 3/4 ratio)

### AI Model
- **Google Gemini Imagen 4.0** (`imagen-4.0-generate-001`)
- Requires `GEMINI_API_KEY` environment variable
- Images uploaded to Cloudflare R2 storage

### Security
- Associates (read-only users) cannot generate AI images
- Role check in API route prevents unauthorized access

## Benefits

1. **Consistency**: All itinerary images use the same 4:3 aspect ratio matching the PDF output
2. **Relevance**: Auto-generated prompts ensure images match the actual itinerary content
3. **Time-saving**: No need to manually craft prompts for each day/activity
4. **Flexibility**: Users can still edit the auto-generated prompt if needed
5. **Context-aware**: Prompts include day context, activities, and descriptions

## Future Enhancements

Potential improvements:
- Add location/destination context to prompts
- Support for seasonal/weather preferences
- Option to regenerate images with variations
- Batch generation for all days at once
- Image style preferences (photography, illustration, etc.)
