"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface SocialShareDialogProps {
  aiGeneratedImageId: string;
  defaultText: string;
  enhancedData?: any;
  onSuccess: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

const SocialShareDialog: React.FC<SocialShareDialogProps> = ({
  aiGeneratedImageId,
  defaultText,
  enhancedData,
  onSuccess,
  onCancel,
  isOpen
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [shareText, setShareText] = useState(defaultText);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [showABTest, setShowABTest] = useState(false);
  const [abTestData, setAbTestData] = useState<any>(null);
  const [selectedCaption, setSelectedCaption] = useState(0);
  const [platforms, setPlatforms] = useState({
    twitter: true,
    facebook: false,
    instagram: false,
    linkedin: false,
    pinterest: false,
    whatsapp: false
  });
  
  if (!isOpen) return null;
  const generateABTest = async () => {
    setIsLoading(true);
    try {
      const selectedPlatform = Object.entries(platforms).find(([_, selected]) => selected)?.[0];
      const response = await axios.post('/api/ai-image/ab-test', {
        originalPrompt: defaultText,
        platform: selectedPlatform,
        variations: 3
      });
      
      setAbTestData(response.data);
      setShowABTest(true);
      toast.success('A/B test variations generated!');
    } catch (error) {
      console.error('Error generating A/B test:', error);
      toast.error('Failed to generate A/B test');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlatformChange = (platform: keyof typeof platforms) => {
    setPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  const handleShare = async () => {
    // Validate at least one platform is selected
    const selectedPlatforms = Object.entries(platforms)
      .filter(([_, isSelected]) => isSelected)
      .map(([platform]) => platform);

    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform to share to');
      return;
    }

    // Validate WhatsApp number if WhatsApp is selected
    if (platforms.whatsapp && !whatsappNumber) {
      toast.error('Please enter a WhatsApp number');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await axios.post('/api/ai-image/share', {
        aiGeneratedImageId,
        platforms: selectedPlatforms,
        customText: shareText,
        phoneNumber: platforms.whatsapp ? whatsappNumber : undefined
      });
      
      const { results } = response.data;
      
      // Check results and prepare a message
      const successPlatforms = Object.entries(results)
        .filter(([_, result]: [string, any]) => result.success)
        .map(([platform]) => platform);
        
      const failedPlatforms = Object.entries(results)
        .filter(([_, result]: [string, any]) => !result.success)
        .map(([platform]) => platform);
      
      if (successPlatforms.length > 0) {
        toast.success(`Successfully shared to ${successPlatforms.join(', ')}`);
      }
      
      if (failedPlatforms.length > 0) {
        toast.error(`Failed to share to ${failedPlatforms.join(', ')}`);
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error sharing image:', error);
      toast.error('Failed to share image');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-6">Share to Social Media</h3>
        
        {/* Enhanced Caption Selection */}
        {enhancedData?.suggestedCaptions && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Choose Caption</label>
            <div className="space-y-2">
              {enhancedData.suggestedCaptions.map((caption: string, index: number) => (
                <label key={index} className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="caption"
                    checked={selectedCaption === index}
                    onChange={() => {
                      setSelectedCaption(index);
                      setShareText(caption);
                    }}
                    className="mt-1"
                  />
                  <span className="text-sm flex-1 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {caption}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Share Text</label>
          <Textarea
            value={shareText}
            onChange={(e) => setShareText(e.target.value)}
            placeholder="Text to share with the image..."
            rows={3}
            className="w-full"
          />
        </div>

        {/* Hashtags */}
        {enhancedData?.hashtags && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Recommended Hashtags</label>
            <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-700 rounded">
              {enhancedData.hashtags.map((tag: string, index: number) => (
                <span 
                  key={index} 
                  className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded cursor-pointer"
                  onClick={() => setShareText(prev => prev + ' ' + tag)}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Select Platforms</label>
            <Button
              variant="outline"
              size="sm"
              onClick={generateABTest}
              disabled={isLoading || Object.values(platforms).every(v => !v)}
            >
              Generate A/B Test
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="twitter" 
                checked={platforms.twitter}
                onCheckedChange={() => handlePlatformChange('twitter')}
              />
              <label htmlFor="twitter">Twitter/X</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="facebook" 
                checked={platforms.facebook}
                onCheckedChange={() => handlePlatformChange('facebook')}
              />
              <label htmlFor="facebook">Facebook</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="instagram" 
                checked={platforms.instagram}
                onCheckedChange={() => handlePlatformChange('instagram')}
              />
              <label htmlFor="instagram">Instagram</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="linkedin" 
                checked={platforms.linkedin}
                onCheckedChange={() => handlePlatformChange('linkedin')}
              />
              <label htmlFor="linkedin">LinkedIn</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="pinterest" 
                checked={platforms.pinterest}
                onCheckedChange={() => handlePlatformChange('pinterest')}
              />
              <label htmlFor="pinterest">Pinterest</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="whatsapp" 
                checked={platforms.whatsapp}
                onCheckedChange={() => handlePlatformChange('whatsapp')}
              />
              <label htmlFor="whatsapp">WhatsApp Business</label>
            </div>
          </div>
        </div>
        
        {platforms.whatsapp && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
            <Input
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+1234567890"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">Include country code (e.g., +1 for US)</p>
          </div>
        )}

        {/* A/B Test Results */}
        {showABTest && abTestData && (
          <div className="mb-6 p-4 border rounded-lg">
            <h4 className="font-medium mb-3">A/B Test Variations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {abTestData.variations.map((variation: any, index: number) => (
                <div key={index} className="border rounded p-2">
                  <h5 className="text-sm font-medium mb-2">{variation.variation}</h5>
                  <img src={variation.imageUrl} alt={`Variation ${variation.variation}`} className="w-full h-32 object-cover rounded mb-2" />
                  <p className="text-xs text-gray-600">{variation.optimizedFor}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-600">
              <p><strong>Testing Recommendations:</strong></p>
              <ul className="list-disc list-inside">
                {abTestData.testingRecommendations.map((rec: string, index: number) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Best Posting Times */}
        {enhancedData?.bestPostingTimes && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <h5 className="text-sm font-medium mb-2">💡 Best Posting Times</h5>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {Object.entries(enhancedData.bestPostingTimes).slice(0, 4).map(([day, times]: [string, any]) => (
                <div key={day}>
                  <strong>{day}:</strong> {Array.isArray(times) ? times.slice(0, 2).join(', ') : times}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-2 mt-6">
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleShare}
            disabled={isLoading}
          >
            {isLoading ? 'Sharing...' : 'Share'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SocialShareDialog;
