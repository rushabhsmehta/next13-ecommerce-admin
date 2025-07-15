"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { 
  Send, 
  Phone, 
  MessageSquare, 
  Image as ImageIcon, 
  Clock,
  CheckCircle,
  CheckCheck,
  XCircle,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  Search,
  Paperclip,
  Smile,
  Mic,
  FileText,
  X
} from 'lucide-react';

interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  status: string;
  timestamp: Date;
  mediaUrl?: string;
  mediaContentType?: string;
  direction?: 'incoming' | 'outgoing';
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  components: {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: string;
    parameters?: string[];
  }[];
}

export default function WhatsAppChat() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [conversations, setConversations] = useState<string[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);
  const [previewVariables, setPreviewVariables] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Common country codes
  const countryCodes = [
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+1', country: 'United States', flag: '🇺🇸' },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
    { code: '+66', country: 'Thailand', flag: '🇹🇭' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadAllConversations();
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    // Sample templates - in a real app, these would come from Twilio API
    const sampleTemplates: WhatsAppTemplate[] = [
      {
        id: '1',
        name: 'booking_confirmation',
        category: 'TRANSACTIONAL',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'HEADER',
            text: 'Booking Confirmation',
            format: 'TEXT'
          },
          {
            type: 'BODY',
            text: 'Hello {{1}}, your booking for {{2}} has been confirmed. Check-in: {{3}}. Reference: {{4}}',
            parameters: ['Customer Name', 'Hotel Name', 'Check-in Date', 'Booking Reference']
          },
          {
            type: 'FOOTER',
            text: 'Aagam Holidays - Your Travel Partner'
          }
        ]
      },
      {
        id: '2',
        name: 'payment_reminder',
        category: 'UTILITY',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'HEADER',
            text: 'Payment Reminder',
            format: 'TEXT'
          },
          {
            type: 'BODY',
            text: 'Hi {{1}}, your payment of ₹{{2}} for booking {{3}} is due on {{4}}. Please complete your payment to confirm your booking.',
            parameters: ['Customer Name', 'Amount', 'Booking ID', 'Due Date']
          },
          {
            type: 'FOOTER',
            text: 'Thank you for choosing Aagam Holidays'
          }
        ]
      },
      {
        id: '3',
        name: 'welcome_message',
        category: 'MARKETING',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'HEADER',
            text: 'Welcome to Aagam Holidays! 🌟',
            format: 'TEXT'
          },
          {
            type: 'BODY',
            text: 'Thank you for contacting us! We\'re here to help you plan your perfect trip. Our travel experts will assist you with the best packages and deals.',
          },
          {
            type: 'FOOTER',
            text: 'Reply with your travel preferences to get started'
          }
        ]
      },
      {
        id: '4',
        name: 'trip_itinerary',
        category: 'TRANSACTIONAL',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'HEADER',
            text: 'Your Trip Itinerary',
            format: 'TEXT'
          },
          {
            type: 'BODY',
            text: 'Hi {{1}}, here\'s your detailed itinerary for {{2}}:\n\n📍 Destination: {{3}}\n📅 Duration: {{4}} days\n🏨 Hotel: {{5}}\n✈️ Flight: {{6}}',
            parameters: ['Customer Name', 'Trip Name', 'Destination', 'Duration', 'Hotel', 'Flight Details']
          },
          {
            type: 'FOOTER',
            text: 'Have questions? Reply to this message!'
          }
        ]
      }
    ];
    setTemplates(sampleTemplates);
  };

  useEffect(() => {
    if (selectedConversation || phoneNumber) {
      loadConversationHistory();
    }
  }, [selectedConversation, phoneNumber]);

  const loadAllConversations = async () => {
    try {
      // This would ideally be a separate API endpoint that returns unique phone numbers
      const response = await fetch('/api/whatsapp/conversations');
      const data = await response.json();
      
      if (data.success) {
        // Extract unique phone numbers from all messages
        const uniqueNumbers = new Set<string>();
        data.messages.forEach((msg: WhatsAppMessage) => {
          if (msg.from.includes('+')) uniqueNumbers.add(msg.from);
          if (msg.to.includes('+')) uniqueNumbers.add(msg.to);
        });
        setConversations(Array.from(uniqueNumbers));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversationHistory = async () => {
    const targetNumber = selectedConversation || (phoneNumber ? getFullPhoneNumber() : '');
    if (!targetNumber) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/conversations?phoneNumber=${encodeURIComponent(targetNumber)}&limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      } else {
        toast.error('Failed to load conversation history');
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      toast.error('Failed to load conversation history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'your_cloudinary_preset'); // You'll need to set this up
    
    const response = await fetch('https://api.cloudinary.com/v1_1/your_cloud_name/image/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    return data.secure_url;
  };

  const selectConversation = (number: string) => {
    setSelectedConversation(number);
    
    // Try to extract country code and phone number from existing conversation
    if (number.startsWith('+')) {
      const matchedCountry = countryCodes.find(c => number.startsWith(c.code));
      if (matchedCountry) {
        setCountryCode(matchedCountry.code);
        setPhoneNumber(number.substring(matchedCountry.code.length));
      } else {
        // If no match found, keep the full number as is
        setPhoneNumber(number);
      }
    } else {
      setPhoneNumber(number);
    }
  };

  const sendTemplateMessage = async (template: WhatsAppTemplate, variables: string[] = []) => {
    const targetNumber = selectedConversation || getFullPhoneNumber();
    if (!targetNumber.trim()) {
      toast.error('Please select a conversation or enter a phone number');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/whatsapp/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: targetNumber,
          templateName: template.name,
          variables: variables
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Template message sent successfully!');
        
        // Add message to local state
        const sentMessage: WhatsAppMessage = {
          id: data.data.id,
          from: data.data.from,
          to: data.data.to,
          body: data.data.body,
          status: data.data.status,
          timestamp: new Date(data.data.timestamp),
          direction: 'outgoing'
        };
        
        setMessages(prev => [...prev, sentMessage]);
        setSelectedTemplate(null);
      } else {
        toast.error(data.error || 'Failed to send template message');
      }
    } catch (error) {
      console.error('Error sending template message:', error);
      toast.error('Failed to send template message');
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = async () => {
    const targetNumber = selectedConversation || getFullPhoneNumber();
    if (!newMessage.trim() && !selectedImage) {
      toast.error('Please enter a message or select an image');
      return;
    }

    if (!targetNumber.trim()) {
      toast.error('Please enter a phone number or select a conversation');
      return;
    }

    setIsSending(true);
    try {
      let mediaUrl = undefined;
      
      // Upload image if selected
      if (selectedImage) {
        try {
          mediaUrl = await uploadImage(selectedImage);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          toast.error('Failed to upload image');
          setIsSending(false);
          return;
        }
      }

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: targetNumber,
          message: newMessage,
          mediaUrl: mediaUrl
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Message sent successfully!');
        
        // Add message to local state
        const sentMessage: WhatsAppMessage = {
          id: data.data.id,
          from: data.data.from,
          to: data.data.to,
          body: data.data.body,
          status: data.data.status,
          timestamp: new Date(data.data.timestamp),
          mediaUrl: mediaUrl,
          direction: 'outgoing'
        };
        
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <div className="flex">
            <CheckCircle className="w-3 h-3 text-gray-500" />
          </div>
        );
      case 'delivered':
        return (
          <div className="flex -space-x-1">
            <CheckCircle className="w-3 h-3 text-gray-500" />
            <CheckCircle className="w-3 h-3 text-gray-500" />
          </div>
        );
      case 'read':
        return (
          <div className="flex -space-x-1">
            <CheckCircle className="w-3 h-3 text-blue-500" />
            <CheckCircle className="w-3 h-3 text-blue-500" />
          </div>
        );
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-500" />;
      case 'queued':
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    // If message is from today, show only time
    if (messageDay.getTime() === today.getTime()) {
      return messageDate.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    
    // If message is from yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDay.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }
    
    // If message is from this week
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (messageDate > weekAgo) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'short' });
    }
    
    // For older messages, show date
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Generate template preview content
  const generateTemplatePreview = (template: WhatsAppTemplate, variables: string[]): string => {
    switch(template.name) {
      case 'booking_confirmation':
        return `*Booking Confirmation*\n\nHello ${variables[0] || 'Customer'}, your booking for ${variables[1] || 'Service'} has been confirmed.\nCheck-in: ${variables[2] || 'Date'}\nReference: ${variables[3] || 'REF123'}\n\n_Aagam Holidays - Your Travel Partner_`;
      case 'payment_reminder':
        return `*Payment Reminder*\n\nDear ${variables[0] || 'Customer'}, this is a reminder that your payment of ${variables[1] || 'Amount'} for ${variables[2] || 'Service'} is due on ${variables[3] || 'Date'}.\n\n_Please contact us for any queries_`;
      case 'welcome_message':
        return `*Welcome to Aagam Holidays!*\n\nHello ${variables[0] || 'Customer'}, welcome to our travel family! We're excited to help you plan your perfect getaway.\n\n_Feel free to reach out anytime for assistance_`;
      case 'trip_update':
        return `*Trip Update*\n\nHi ${variables[0] || 'Customer'}, we have an important update regarding your trip to ${variables[1] || 'Destination'} scheduled for ${variables[2] || 'Date'}. Please check your email for details.\n\n_Aagam Holidays_`;
      default:
        return `*${template.name.replace(/_/g, ' ').toUpperCase()}*\n\nHello ${variables[0] || 'Customer'}, thank you for choosing our services.\n\n_This is an automated message from our business_`;
    }
  };

  // Show template preview
  const showPreview = (template: WhatsAppTemplate, variables: string[]) => {
    setPreviewTemplate(template);
    setPreviewVariables(variables);
    setShowTemplatePreview(true);
  };

  // Send template after preview confirmation
  const confirmAndSendTemplate = async () => {
    if (!previewTemplate || !previewVariables) return;
    
    setShowTemplatePreview(false);
    await sendTemplateMessage(previewTemplate, previewVariables);
    setShowTemplates(false);
  };

  // Update preview variables
  const updatePreviewVariable = (index: number, value: string) => {
    const newVariables = [...previewVariables];
    newVariables[index] = value;
    setPreviewVariables(newVariables);
  };

  // Get full phone number with country code
  const getFullPhoneNumber = () => {
    return countryCode + phoneNumber;
  };

  // Get country info for display
  const getCountryInfo = (phoneNumber: string) => {
    const country = countryCodes.find(c => phoneNumber.startsWith(c.code));
    return country ? `${country.flag} ${country.country}` : '🌍 International';
  };

  return (
    <>
      {/* Template Preview Modal */}
      {showTemplatePreview && previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-[#075e54] text-white px-6 py-4 rounded-t-lg sticky top-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">Message Preview</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowTemplatePreview(false)}
                  className="p-1 h-auto hover:bg-[#064e46] text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-sm text-gray-200 mt-1">
                How this will appear to: {selectedConversation || getFullPhoneNumber()}
              </p>
            </div>
            
            <div className="p-6">
              {/* Preview Message Bubble */}
              <div className="bg-[#e5ddd5] p-4 rounded-lg mb-4">
                <div className="flex justify-end">
                  <div
                    className="max-w-[85%] px-3 py-2 rounded-lg bg-[#dcf8c6] relative"
                    style={{ borderRadius: '18px 18px 4px 18px' }}
                  >
                    {/* Message tail */}
                    <div className="absolute top-0 right-[-8px] w-0 h-0 border-l-[8px] border-l-[#dcf8c6] border-t-[8px] border-t-transparent" />
                    
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                      {generateTemplatePreview(previewTemplate, previewVariables)}
                    </div>
                    
                    <div className="flex items-center justify-end mt-1 text-xs text-gray-600 gap-1">
                      <span>Now</span>
                      <CheckCircle className="w-3 h-3 text-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Template Info */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-sm">
                    {previewTemplate.name.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    previewTemplate.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    previewTemplate.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {previewTemplate.status}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Category: {previewTemplate.category} • Language: {previewTemplate.language}
                </p>
              </div>

              {/* Editable Variables */}
              {previewVariables.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <h4 className="font-medium text-sm text-gray-800 mb-2 flex items-center gap-2">
                    <span>📝</span>
                    Edit Variables (Optional)
                  </h4>
                  <div className="space-y-2">
                    {previewVariables.map((variable, index) => {
                      const component = previewTemplate.components.find(c => c.type === 'BODY');
                      const parameterName = component?.parameters?.[index] || `Variable ${index + 1}`;
                      
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <label className="text-xs text-gray-600 w-20 truncate">
                            {parameterName}:
                          </label>
                          <Input
                            value={variable}
                            onChange={(e) => updatePreviewVariable(index, e.target.value)}
                            className="text-sm h-8 flex-1"
                            placeholder={parameterName}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Changes will update the preview above automatically
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowTemplatePreview(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAndSendTemplate}
                  disabled={isSending}
                  className="flex-1 bg-[#075e54] hover:bg-[#064e46]"
                >
                  {isSending ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sending...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Send Message
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main WhatsApp Interface */}
      <div className="flex h-screen bg-gray-100">
        {/* WhatsApp Layout */}
        <div className="flex w-full max-w-6xl mx-auto bg-white shadow-xl">
          
          {/* Left Sidebar - Conversations */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            {/* Sidebar Header */}
            <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-medium">WhatsApp Business</h3>
                  <p className="text-xs text-gray-200">Conversations</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={loadAllConversations}
                  className="p-1 h-auto hover:bg-[#064e46] text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-3 bg-gray-50 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-gray-200"
                />
              </div>
            </div>

            {/* New Chat Input */}
            <div className="p-3 border-b bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">New Chat</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Country Code Selector */}
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-20">
                    <SelectValue>
                      <div className="flex items-center gap-1">
                        <span>{countryCodes.find(c => c.code === countryCode)?.flag}</span>
                        <span className="text-xs">{countryCode}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {countryCodes.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <div className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span className="text-xs">{country.code}</span>
                          <span className="text-xs text-gray-500">{country.country}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Phone Number Input */}
                <Input
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChange={(e) => {
                    // Only allow numbers and limit length based on country
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    // Limit to 15 digits (international standard)
                    if (value.length <= 15) {
                      setPhoneNumber(value);
                    }
                  }}
                  className="flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && phoneNumber.trim().length >= 10) {
                      setSelectedConversation(getFullPhoneNumber());
                    }
                  }}
                  maxLength={15}
                />
              </div>
              
              {/* Preview of full number and validation */}
              {phoneNumber && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span>Full number:</span>
                    <code className="bg-gray-100 px-1 rounded text-green-600 font-mono">
                      {getFullPhoneNumber()}
                    </code>
                  </div>
                  {phoneNumber.length < 10 && (
                    <div className="text-xs text-orange-600 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>Phone number should be at least 10 digits</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {conversations
                .filter(number => number.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((number) => (
                <div
                  key={number}
                  onClick={() => selectConversation(number)}
                  className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${
                    selectedConversation === number ? 'bg-gray-100' : ''
                  }`}
                >
                  {/* Contact Avatar */}
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-gray-600" />
                  </div>
                  
                  {/* Contact Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 truncate">{number}</h4>
                      <span className="text-xs text-gray-500">Now</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">Click to view conversation</p>
                  </div>
                </div>
              ))}
              
              {conversations.length === 0 && (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <div className="text-center">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Chat Area */}
          <div className="flex-1 flex flex-col relative">
            {/* Chat Header */}
            <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Contact Avatar */}
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-medium">{selectedConversation || (phoneNumber ? getFullPhoneNumber() : '') || 'Select a conversation'}</h3>
                  <p className="text-xs text-gray-200">
                    {selectedConversation || phoneNumber ? 
                      `Business Account ${phoneNumber && !selectedConversation ? '• ' + getCountryInfo(getFullPhoneNumber()) : ''}` : 
                      'Choose a contact to start messaging'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Search className="w-5 h-5 cursor-pointer hover:text-gray-200" />
                <MoreVertical className="w-5 h-5 cursor-pointer hover:text-gray-200" />
              </div>
            </div>

            {/* Templates Sidebar */}
            {showTemplates && (
              <div className="absolute top-[73px] right-0 w-80 h-[calc(100%-73px)] bg-white border-l border-gray-200 z-10 flex flex-col shadow-lg">
                <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between">
                  <h3 className="font-medium">Message Templates</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowTemplates(false)}
                    className="p-1 h-auto hover:bg-[#064e46] text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {templates.map((template) => (
                    <div key={template.id} className="bg-gray-50 rounded-lg p-3 border hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-sm text-gray-900">
                            {template.name.replace(/_/g, ' ').toUpperCase()}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              template.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                              template.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {template.status}
                            </span>
                            <span className="text-xs text-gray-500">{template.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        {template.components.map((component, index) => (
                          <div key={index} className="text-xs">
                            {component.type === 'HEADER' && (
                              <div className="font-medium text-gray-900">{component.text}</div>
                            )}
                            {component.type === 'BODY' && (
                              <div className="text-gray-700 leading-relaxed">
                                {component.text?.replace(/\{\{(\d+)\}\}/g, (match, num) => {
                                  const param = component.parameters?.[parseInt(num) - 1];
                                  return param ? `[${param}]` : match;
                                }).substring(0, 80)}...
                              </div>
                            )}
                            {component.type === 'FOOTER' && (
                              <div className="text-xs text-gray-500 mt-1">{component.text}</div>
                            )}
                          </div>
                        ))}
                      </div>

                      <Button 
                        size="sm" 
                        className="w-full h-8 text-xs bg-[#075e54] hover:bg-[#064e46]"
                        disabled={template.status !== 'APPROVED'}
                        onClick={() => {
                          if (!selectedConversation && !phoneNumber) {
                            toast.error('Please select a conversation first');
                            return;
                          }
                          
                          // Generate appropriate variables based on template
                          let variables: string[] = [];
                          switch(template.name) {
                            case 'booking_confirmation':
                              variables = ['John Doe', 'Goa Beach Resort', '2025-08-15', 'AGM123456'];
                              break;
                            case 'payment_reminder':
                              variables = ['John Doe', '₹25,000', 'Goa Package', '2025-07-20'];
                              break;
                            case 'welcome_message':
                              variables = ['John Doe'];
                              break;
                            case 'trip_update':
                              variables = ['John Doe', 'Goa', '2025-08-15'];
                              break;
                            default:
                              variables = ['Valued Customer', 'Our Service', 'Today', 'REF123'];
                          }
                          
                          // Show preview instead of sending directly
                          showPreview(template, variables);
                        }}
                      >
                        Preview & Send
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Background Pattern */}
            <div 
              className="flex-1 bg-[#e5ddd5] relative overflow-hidden"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4d4d4' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              {/* Messages Container */}
              <div className="h-full overflow-y-auto p-4 space-y-2">
                {!selectedConversation && !phoneNumber ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500 bg-white/80 rounded-lg p-8">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="font-medium text-lg mb-2">Welcome to WhatsApp Business</h3>
                      <p className="text-sm mb-4">Send and receive messages from your customers</p>
                      <p className="text-xs">Select a conversation from the left or enter a phone number to start chatting</p>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#075e54] mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Loading conversation...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500 bg-white/80 rounded-lg p-6">
                      <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">No messages yet</p>
                      <p className="text-sm">Start a conversation!</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'} mb-2`}
                      >
                        <div
                          className={`max-w-[75%] lg:max-w-md px-3 py-2 rounded-lg relative ${
                            message.direction === 'outgoing'
                              ? 'bg-[#dcf8c6] ml-12'
                              : 'bg-white mr-12 shadow-sm'
                          }`}
                          style={{
                            borderRadius: message.direction === 'outgoing' 
                              ? '18px 18px 4px 18px' 
                              : '18px 18px 18px 4px'
                          }}
                        >
                          {/* Message tail */}
                          <div 
                            className={`absolute top-0 w-0 h-0 ${
                              message.direction === 'outgoing'
                                ? 'right-[-8px] border-l-[8px] border-l-[#dcf8c6] border-t-[8px] border-t-transparent'
                                : 'left-[-8px] border-r-[8px] border-r-white border-t-[8px] border-t-transparent'
                            }`}
                          />
                          
                          {message.mediaUrl && (
                            <div className="mb-2">
                              <img 
                                src={message.mediaUrl} 
                                alt="Shared media"
                                className="max-w-full h-auto rounded-lg"
                              />
                            </div>
                          )}
                          
                          <p className="text-sm text-gray-800 leading-relaxed">{message.body}</p>
                          
                          <div className={`flex items-center justify-between mt-1 text-xs gap-2 ${
                            message.direction === 'outgoing' ? 'text-gray-600' : 'text-gray-500'
                          }`}>
                            <span className="whitespace-nowrap">
                              {formatTimestamp(message.timestamp)}
                            </span>
                            {message.direction === 'outgoing' && (
                              <div className="flex items-center gap-1">
                                {getStatusIcon(message.status)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="bg-white border-t px-4 py-3">
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Preview"
                    className="max-w-32 h-auto rounded-lg border"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 text-xs"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    ×
                  </Button>
                </div>
              </div>
            )}

            {/* Message Input */}
            {(selectedConversation || phoneNumber) && (
              <div className="bg-[#f0f0f0] px-4 py-3">
                <div className="flex items-end gap-2">
                  {/* Attachment & Templates Buttons */}
                  <div className="flex flex-col gap-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-10 h-10 rounded-full p-0 text-gray-600 hover:bg-gray-200"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Templates Button */}
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowTemplates(!showTemplates)}
                      className={`w-10 h-10 rounded-full p-0 text-gray-600 hover:bg-gray-200 ${
                        showTemplates ? 'bg-gray-200' : ''
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Message Input */}
                  <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
                    <Textarea
                      placeholder="Type a message"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 border-0 bg-transparent resize-none focus:ring-0 focus:outline-none p-0 min-h-[24px] max-h-[120px] leading-6"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      rows={1}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-6 h-6 rounded-full p-0 text-gray-600 hover:bg-gray-200"
                    >
                      <Smile className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Send/Mic Button */}
                  <Button
                    size="sm"
                    onClick={sendMessage}
                    disabled={isSending || (!newMessage.trim() && !selectedImage)}
                    className="w-10 h-10 rounded-full p-0 bg-[#075e54] hover:bg-[#064e46] text-white"
                  >
                    {isSending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : newMessage.trim() || selectedImage ? (
                      <Send className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 border-t">
              <p>💡 Select country code (default: India +91) • Enter phone number • Press 📄 for templates • Press Enter to send</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
