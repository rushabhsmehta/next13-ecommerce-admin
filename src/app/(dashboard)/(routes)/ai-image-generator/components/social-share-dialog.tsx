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
  onSuccess: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

const SocialShareDialog: React.FC<SocialShareDialogProps> = ({
  aiGeneratedImageId,
  defaultText,
  onSuccess,
  onCancel,
  isOpen
}) => {
  if (!isOpen) return null;

  const [isLoading, setIsLoading] = useState(false);
  const [shareText, setShareText] = useState(defaultText);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [platforms, setPlatforms] = useState({
    twitter: true,
    facebook: false,
    instagram: false,
    linkedin: false,
    pinterest: false,
    whatsapp: false
  });

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Share to Social Media</h3>
        
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
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Platforms</label>
          
          <div className="space-y-2">
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
        
        <div className="flex justify-end space-x-2 mt-4">
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
