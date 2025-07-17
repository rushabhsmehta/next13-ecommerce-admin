"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
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
  X,
  Plus,
  Save,
  Eye,
  Upload,
  Trash2,
  Info,
  CheckCircle2,
  AlertTriangle
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
  variableNames?: string[]; // Store actual variable names like 'first_name', 'booking_id'
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
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [credentialStatus, setCredentialStatus] = useState<{
    configured: boolean;
    twilio: boolean;
    whatsappApi: boolean;
    missing: string[];
  } | null>(null);
  const [createTemplateData, setCreateTemplateData] = useState({
    name: '',
    category: 'TRANSACTIONAL',
    language: 'en',
    headerType: 'TEXT',
    headerText: '',
    bodyText: '',
    footerText: '',
    variables: [] as string[],
    buttons: [] as { type: string; text: string; url?: string }[]
  });
  
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

  // Get full phone number with country code
  const getFullPhoneNumber = useCallback(() => {
    return countryCode + phoneNumber;
  }, [countryCode, phoneNumber]);

  // Load sample templates (fallback)
  const loadSampleTemplates = useCallback(() => {
    // Sample templates - fallback if API fails
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
  }, []);

  // Load templates from API
  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/twilio/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      
      // Convert Twilio templates to our format
      const convertedTemplates: WhatsAppTemplate[] = data.templates?.map((template: any) => {
        console.log('Processing template:', template); // Debug log
        
        // Extract template body from different content types
        let bodyText = '';
        let variableNames: string[] = [];
        
        if (template.types?.['twilio/text']?.body) {
          bodyText = template.types['twilio/text'].body;
        } else if (template.types?.['twilio/list-picker']?.body) {
          bodyText = template.types['twilio/list-picker'].body;
        } else if (template.types?.['twilio/call-to-action']?.body) {
          bodyText = template.types['twilio/call-to-action'].body;
        } else if (template.types?.['twilio/quick-reply']?.body) {
          bodyText = template.types['twilio/quick-reply'].body;
        }
        
        // Extract variable names from template body (like {{first_name}}, {{booking_id}})
        if (bodyText) {
          const matches = bodyText.match(/\{\{([^}]+)\}\}/g);
          if (matches) {
            variableNames = matches.map(match => match.replace(/[{}]/g, ''));
          }
        }
        
        // Ensure template has a valid name
        const templateName = template.friendlyName || template.sid || `template_${Date.now()}`;
        console.log('Template name resolved to:', templateName); // Debug log
        
        return {
          id: template.sid || `temp_${Date.now()}`,
          name: templateName,
          category: 'UTILITY', // Default category since Twilio doesn't provide this
          language: template.language || 'en',
          status: 'APPROVED', // Assume approved since they're fetched
          components: [
            {
              type: 'BODY',
              text: bodyText,
              parameters: variableNames
            }
          ],
          variableNames: variableNames // Store actual variable names
        };
      }).filter((template: any) => template && template.name) || []; // Filter out any invalid templates
      
      setTemplates(convertedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      // Fallback to sample templates if API fails
      loadSampleTemplates();
    }
  }, [loadSampleTemplates]);

  // Check credential status
  const checkCredentialStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/whatsapp/credentials');
      if (response.ok) {
        const data = await response.json();
        setCredentialStatus({
          configured: data.status.allConfigured,
          twilio: data.status.twilioConfigured,
          whatsappApi: data.status.whatsappApiConfigured,
          missing: data.status.missing
        });
      }
    } catch (error) {
      console.error('Error checking credentials:', error);
    }
  }, []);

  // Load all conversations
  const loadAllConversations = useCallback(async () => {
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
  }, []);

  // Initialize data on component mount
  useEffect(() => {
    loadAllConversations();
    loadTemplates();
    checkCredentialStatus();
  }, [loadAllConversations, loadTemplates, checkCredentialStatus]);

  // Extract parameters from template text for preview
  const extractParametersFromText = (text: string): string[] => {
    const matches = text.match(/\{\{(\d+)\}\}/g);
    if (!matches) return [];
    
    const variableNumbers = matches.map(match => parseInt(match.replace(/[{}]/g, '')));
    const maxVariable = Math.max(...variableNumbers);
    
    return Array.from({ length: maxVariable }, (_, i) => `Variable ${i + 1}`);
  };

  const loadConversationHistory = useCallback(async () => {
    const targetNumber = selectedConversation || (phoneNumber ? getFullPhoneNumber() : '');
    if (!targetNumber) {
      console.log('No target number available for conversation history');
      return;
    }
    
    console.log('Loading conversation history for:', targetNumber);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/conversations?phoneNumber=${encodeURIComponent(targetNumber)}&limit=50`);
      const data = await response.json();
      
      console.log('Conversation history response:', data);
      
      if (data.success) {
        setMessages(data.messages || []);
        console.log('Loaded messages:', data.messages?.length || 0);
      } else {
        console.error('Failed to load conversation history:', data.error);
        // Don't show error toast for new conversations - just log it
        if (data.error && !data.error.includes('No messages found')) {
          toast.error('Failed to load conversation history');
        }
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      toast.error('Failed to load conversation history');
    } finally {
      setIsLoading(false);
    }
  }, [selectedConversation, phoneNumber, getFullPhoneNumber]);

  useEffect(() => {
    console.log('Checking conversation load trigger:', { 
      selectedConversation, 
      phoneNumber, 
      phoneNumberLength: phoneNumber?.length,
      isValidPhone: phoneNumber && phoneNumber.length >= 10 
    });
    
    if (selectedConversation || (phoneNumber && phoneNumber.length >= 10)) {
      console.log('Triggering conversation history load');
      loadConversationHistory();
    }
  }, [selectedConversation, phoneNumber, countryCode, loadConversationHistory]);

  // Auto-select conversation when phone number is entered
  useEffect(() => {
    console.log('Auto-select check:', { 
      phoneNumber, 
      phoneNumberLength: phoneNumber?.length, 
      selectedConversation,
      hasSelection: !!selectedConversation 
    });
    
    if (phoneNumber && phoneNumber.length >= 10) {
      const fullNumber = getFullPhoneNumber();
      console.log('Auto-selecting conversation for:', fullNumber);
      
      // Always set the selection to ensure conversation loads
      if (selectedConversation !== fullNumber) {
        setSelectedConversation(fullNumber);
      }
      
      // Clear previous messages when switching to a new number
      if (selectedConversation && selectedConversation !== fullNumber) {
        setMessages([]);
      }
    } else if (!phoneNumber || phoneNumber.length === 0) {
      // Clear selection when phone number is cleared
      console.log('Clearing conversation selection');
      setSelectedConversation('');
      setMessages([]);
    }
  }, [phoneNumber, countryCode, selectedConversation, getFullPhoneNumber]);

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

  const sendTemplateMessage = async (template: WhatsAppTemplate, variables: string[] | Record<string, string> = []) => {
    const targetNumber = selectedConversation || getFullPhoneNumber();
    if (!targetNumber.trim()) {
      toast.error('Please select a conversation or enter a phone number');
      return;
    }

    setIsSending(true);
    try {
      // Build content variables object from variables
      let contentVariables: Record<string, string> = {};
      
      if (Array.isArray(variables)) {
        // Handle numbered variables (legacy support)
        variables.forEach((value, index) => {
          contentVariables[(index + 1).toString()] = value;
        });
      } else {
        // Handle named variables
        contentVariables = variables;
      }

      const response = await fetch('/api/twilio/send-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: targetNumber,
          contentSid: template.id,
          contentVariables: Object.keys(contentVariables).length > 0 ? contentVariables : undefined
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Template message sent successfully!');
        
        // Add message to local state
        const sentMessage: WhatsAppMessage = {
          id: data.messageId || 'msg_' + Date.now(),
          from: data.from || 'Business',
          to: targetNumber,
          body: generateTemplatePreview(template, variables),
          status: 'sent',
          timestamp: new Date(),
          direction: 'outgoing'
        };
        
        setMessages(prev => [...prev, sentMessage]);
        setSelectedTemplate(null);
        
        // Load conversation history to get the actual sent message
        await loadConversationHistory();
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
  const generateTemplatePreview = (template: WhatsAppTemplate, variables: Record<string, string> | string[]): string => {
    // For Twilio templates, use the body text directly and replace variables
    const bodyComponent = template.components?.find(comp => comp.type === 'BODY');
    if (bodyComponent && bodyComponent.text) {
      let preview = bodyComponent.text;
      
      if (Array.isArray(variables)) {
        // Handle numbered variables like {{1}}, {{2}}, etc.
        variables.forEach((variable, index) => {
          const placeholder = `{{${index + 1}}}`;
          const replacement = variable && variable.trim() !== '' ? variable : `[Variable ${index + 1}]`;
          preview = preview.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacement);
        });
      } else {
        // Handle named variables like {{first_name}}, {{booking_id}}, etc.
        Object.entries(variables).forEach(([varName, varValue]) => {
          const placeholder = `{{${varName}}}`;
          const replacement = varValue && varValue.trim() !== '' ? varValue : `[${varName}]`;
          preview = preview.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacement);
        });
      }
      
      return preview;
    }
    
    // Fallback: if no body component found, return the template name formatted nicely
    return template.name && typeof template.name === 'string' ? template.name.replace(/_/g, ' ') : 'Template Preview Not Available';
  };

  // Show template preview
  const showPreview = (template: WhatsAppTemplate) => {
    setPreviewTemplate(template);
    
    // Initialize variables with empty values
    const initialVariables: Record<string, string> = {};
    
    // Try to get variables from the template components first
    const bodyComponent = template.components?.find(comp => comp.type === 'BODY');
    if (bodyComponent && bodyComponent.parameters) {
      bodyComponent.parameters.forEach(param => {
        initialVariables[param] = '';
      });
    } else if (template.variableNames) {
      // Fallback to stored variable names
      template.variableNames.forEach(varName => {
        initialVariables[varName] = '';
      });
    } else if (bodyComponent && bodyComponent.text) {
      // Extract variables from template text as last resort
      const matches = bodyComponent.text.match(/\{\{([^}]+)\}\}/g);
      if (matches) {
        matches.forEach(match => {
          const varName = match.replace(/[{}]/g, '');
          initialVariables[varName] = '';
        });
      }
    }
    
    setPreviewVariables(initialVariables);
    setShowTemplatePreview(true);
  };

  // Send template after preview confirmation
  const confirmAndSendTemplate = async () => {
    if (!previewTemplate || Object.keys(previewVariables).length === 0) return;
    
    setShowTemplatePreview(false);
    await sendTemplateMessage(previewTemplate, previewVariables);
    setShowTemplates(false);
  };

  // Check if all required variables are filled
  const areAllVariablesFilled = () => {
    if (!previewTemplate || Object.keys(previewVariables).length === 0) {
      return true; // No variables needed
    }
    
    return Object.values(previewVariables).every(value => value.trim() !== '');
  };

  // Update preview variables
  const updatePreviewVariable = (varName: string, value: string) => {
    setPreviewVariables(prev => ({
      ...prev,
      [varName]: value
    }));
  };

  // Reset create template form
  const resetCreateTemplateForm = () => {
    setCreateTemplateData({
      name: '',
      category: 'TRANSACTIONAL',
      language: 'en',
      headerType: 'TEXT',
      headerText: '',
      bodyText: '',
      footerText: '',
      variables: [],
      buttons: []
    });
  };

  // Extract variables from body text
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\d+)\}\}/g);
    if (!matches) return [];
    
    const variableNumbers = matches.map(match => parseInt(match.replace(/[{}]/g, '')));
    const maxVariable = Math.max(...variableNumbers);
    
    return Array.from({ length: maxVariable }, (_, i) => `Variable ${i + 1}`);
  };

  // Update variables when body text changes
  const updateBodyText = (text: string) => {
    setCreateTemplateData(prev => ({
      ...prev,
      bodyText: text,
      variables: extractVariables(text)
    }));
  };

  // Add button to template
  const addTemplateButton = () => {
    if (createTemplateData.buttons.length >= 3) {
      toast.error('Maximum 3 buttons allowed per template');
      return;
    }
    
    setCreateTemplateData(prev => ({
      ...prev,
      buttons: [...prev.buttons, { type: 'QUICK_REPLY', text: '' }]
    }));
  };

  // Remove button from template
  const removeTemplateButton = (index: number) => {
    setCreateTemplateData(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  // Update button data
  const updateTemplateButton = (index: number, field: string, value: string) => {
    setCreateTemplateData(prev => ({
      ...prev,
      buttons: prev.buttons.map((button, i) => 
        i === index ? { ...button, [field]: value } : button
      )
    }));
  };

  // Validate template data
  const validateTemplateData = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!createTemplateData.name.trim()) {
      errors.push('Template name is required');
    } else if (!/^[a-z0-9_]+$/.test(createTemplateData.name)) {
      errors.push('Template name can only contain lowercase letters, numbers, and underscores');
    }
    
    if (!createTemplateData.bodyText.trim()) {
      errors.push('Body text is required');
    }
    
    if (createTemplateData.bodyText.length > 1024) {
      errors.push('Body text cannot exceed 1024 characters');
    }
    
    if (createTemplateData.headerText && createTemplateData.headerText.length > 60) {
      errors.push('Header text cannot exceed 60 characters');
    }
    
    if (createTemplateData.footerText && createTemplateData.footerText.length > 60) {
      errors.push('Footer text cannot exceed 60 characters');
    }
    
    // Check for duplicate template name
    if (templates.some(t => t.name && t.name === createTemplateData.name)) {
      errors.push('Template name already exists');
    }
    
    // Validate buttons
    createTemplateData.buttons.forEach((button, index) => {
      if (!button.text.trim()) {
        errors.push(`Button ${index + 1} text is required`);
      }
      if (button.type === 'URL' && !button.url) {
        errors.push(`Button ${index + 1} URL is required`);
      }
      if (button.type === 'PHONE_NUMBER' && !button.url) {
        errors.push(`Button ${index + 1} phone number is required`);
      }
    });
    
    return { isValid: errors.length === 0, errors };
  };

  // Submit template for approval
  const submitTemplateForApproval = async () => {
    const validation = validateTemplateData();
    
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    // Check if Twilio credentials are configured for template creation
    if (credentialStatus && !credentialStatus.twilio) {
      toast.error('Twilio credentials not configured. Please check your .env.local file.');
      return;
    }
    
    try {
      setIsSending(true);
      
      // Prepare template components
      const components: any[] = [];
      
      // Header component
      if (createTemplateData.headerText) {
        components.push({
          type: 'HEADER',
          format: createTemplateData.headerType,
          text: createTemplateData.headerText
        });
      }
      
      // Body component (required)
      components.push({
        type: 'BODY',
        text: createTemplateData.bodyText,
        ...(createTemplateData.variables.length > 0 && {
          example: {
            body_text: [createTemplateData.variables.map((_, i) => `Sample ${i + 1}`)]
          }
        })
      });
      
      // Footer component
      if (createTemplateData.footerText) {
        components.push({
          type: 'FOOTER',
          text: createTemplateData.footerText
        });
      }
      
      // Buttons component
      if (createTemplateData.buttons.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: createTemplateData.buttons.map(button => ({
            type: button.type,
            text: button.text,
            ...(button.url && { url: button.url })
          }))
        });
      }
      
      // Submit to Meta API (via your backend)
      const response = await fetch('/api/whatsapp/templates/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: createTemplateData.name,
          category: createTemplateData.category,
          language: createTemplateData.language,
          components: components
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Template created successfully with Twilio! It\'s ready to use immediately.');
        
        // Add template to local state with APPROVED status since Twilio templates are immediately available
        const newTemplate: WhatsAppTemplate = {
          id: data.templateId || `temp_${Date.now()}`,
          name: createTemplateData.name,
          category: createTemplateData.category,
          language: createTemplateData.language,
          status: 'APPROVED', // Twilio templates are immediately available
          components: components.map(comp => ({
            type: comp.type,
            text: comp.text,
            format: comp.format,
            parameters: createTemplateData.variables
          }))
        };
        
        setTemplates(prev => [...prev, newTemplate]);
        setShowCreateTemplate(false);
        resetCreateTemplateForm();
      } else {
        console.error('Template submission error:', data);
        
        if (data.details && data.details.setup_guide) {
          toast.error(`${data.error}. Please configure Twilio credentials in .env.local`);
        } else if (data.details && data.details.message) {
          toast.error(`${data.error}: ${data.details.message}`);
        } else {
          toast.error(data.error || 'Failed to submit template for approval');
        }
      }
    } catch (error) {
      console.error('Error submitting template:', error);
      toast.error('Failed to submit template. Please check your internet connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Generate template preview for creation
  const generateCreateTemplatePreview = (): string => {
    let preview = '';
    
    if (createTemplateData.headerText) {
      preview += `*${createTemplateData.headerText}*\n\n`;
    }
    
    let bodyWithVariables = createTemplateData.bodyText;
    createTemplateData.variables.forEach((variable, index) => {
      bodyWithVariables = bodyWithVariables.replace(
        new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'),
        `[${variable}]`
      );
    });
    preview += bodyWithVariables;
    
    if (createTemplateData.footerText) {
      preview += `\n\n_${createTemplateData.footerText}_`;
    }
    
    if (createTemplateData.buttons.length > 0) {
      preview += '\n\n';
      createTemplateData.buttons.forEach((button, index) => {
        preview += `🔘 ${button.text}`;
        if (button.type === 'URL' && button.url) {
          preview += ` (${button.url})`;
        }
        if (index < createTemplateData.buttons.length - 1) {
          preview += '\n';
        }
      });
    }
    
    return preview;
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
                    {previewTemplate.name && typeof previewTemplate.name === 'string' ? previewTemplate.name.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN TEMPLATE'}
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
              {Object.keys(previewVariables).length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <h4 className="font-medium text-sm text-gray-800 mb-2 flex items-center gap-2">
                    <span>📝</span>
                    Edit Variables (Required)
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(previewVariables).map(([varName, varValue]) => (
                      <div key={varName} className="flex items-center gap-2">
                        <label className="text-xs text-gray-600 w-24 truncate">
                          {varName}:
                        </label>
                        <Input
                          value={varValue}
                          onChange={(e) => updatePreviewVariable(varName, e.target.value)}
                          className="text-sm h-8 flex-1"
                          placeholder={`Enter ${varName}`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Changes will update the preview above automatically
                  </p>
                </div>
              )}

              {/* Warning for missing variables */}
              {Object.keys(previewVariables).length > 0 && !areAllVariablesFilled() && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <span>⚠️</span>
                    <span className="text-sm font-medium">
                      Please fill in all variables before sending
                    </span>
                  </div>
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
                  disabled={isSending || !areAllVariablesFilled()}
                  className="flex-1 bg-[#075e54] hover:bg-[#064e46] disabled:bg-gray-400 disabled:cursor-not-allowed"
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

      {/* Create Template Modal */}
      {showCreateTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
            <div className="bg-[#075e54] text-white px-6 py-4 rounded-t-lg sticky top-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">Create WhatsApp Template</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateTemplate(false);
                    resetCreateTemplateForm();
                  }}
                  className="p-1 h-auto hover:bg-[#064e46] text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-sm text-gray-200 mt-1">
                Create reusable message templates - approved by Meta for bulk messaging
              </p>
              <div className="mt-2 bg-blue-900 bg-opacity-50 rounded px-3 py-2">
                <p className="text-xs text-blue-100">
                  💡 <strong>Note:</strong> To send messages to specific contacts, use the phone number field in the main chat area (left sidebar). 
                  Templates are for creating reusable message formats.
                </p>
              </div>
              
              {/* Credential Status Warning */}
              {credentialStatus && !credentialStatus.twilio && (
                <div className="mt-3 bg-red-600 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Twilio Configuration Required</span>
                  </div>
                  <p className="text-xs mt-1">
                    Please configure your Twilio credentials in .env.local to create templates. 
                    You need TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex h-[80vh]">
              {/* Form Section */}
              <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
                <div className="space-y-6">
                  {/* Template Info Section */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Template Guidelines</h4>
                    </div>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Templates must be pre-approved by Meta</li>
                      <li>• Review process takes 24-48 hours</li>
                      <li>• Use variables (&#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;) for dynamic content</li>
                      <li>• Follow WhatsApp Business policies</li>
                      <li>• Maximum 1024 characters for body text</li>
                    </ul>
                  </div>

                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Basic Information</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Template Name *
                      </label>
                      <Input
                        value={createTemplateData.name}
                        onChange={(e) => {
                          const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                          setCreateTemplateData(prev => ({ ...prev, name: value }));
                        }}
                        placeholder="e.g., booking_confirmation"
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Only lowercase letters, numbers, and underscores allowed
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category *
                        </label>
                        <Select 
                          value={createTemplateData.category} 
                          onValueChange={(value) => setCreateTemplateData(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TRANSACTIONAL">Transactional</SelectItem>
                            <SelectItem value="MARKETING">Marketing</SelectItem>
                            <SelectItem value="UTILITY">Utility</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Language *
                        </label>
                        <Select 
                          value={createTemplateData.language} 
                          onValueChange={(value) => setCreateTemplateData(prev => ({ ...prev, language: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="hi">Hindi</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="ar">Arabic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Header Section */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Header (Optional)</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Header Type
                      </label>
                      <Select 
                        value={createTemplateData.headerType} 
                        onValueChange={(value) => setCreateTemplateData(prev => ({ ...prev, headerType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TEXT">Text</SelectItem>
                          <SelectItem value="IMAGE">Image</SelectItem>
                          <SelectItem value="VIDEO">Video</SelectItem>
                          <SelectItem value="DOCUMENT">Document</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {createTemplateData.headerType === 'TEXT' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Header Text
                        </label>
                        <Input
                          value={createTemplateData.headerText}
                          onChange={(e) => setCreateTemplateData(prev => ({ ...prev, headerText: e.target.value }))}
                          placeholder="e.g., Booking Confirmation"
                          maxLength={60}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {createTemplateData.headerText.length}/60 characters
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Body Section */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Body Text *</h4>
                    
                    <div>
                      <Textarea
                        value={createTemplateData.bodyText}
                        onChange={(e) => updateBodyText(e.target.value)}
                        placeholder="Hello {{1}}, your booking for {{2}} has been confirmed..."
                        rows={6}
                        maxLength={1024}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {createTemplateData.bodyText.length}/1024 characters
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        💡 Use &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;, etc. for dynamic variables
                      </p>
                    </div>

                    {/* Variables Preview */}
                    {createTemplateData.variables.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h5 className="font-medium text-sm text-gray-800 mb-2">
                          Detected Variables ({createTemplateData.variables.length})
                        </h5>
                        <div className="space-y-2">
                          {createTemplateData.variables.map((variable, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 w-16">&#123;&#123;{index + 1}&#125;&#125;:</span>
                              <Input
                                value={variable}
                                onChange={(e) => {
                                  const newVariables = [...createTemplateData.variables];
                                  newVariables[index] = e.target.value;
                                  setCreateTemplateData(prev => ({ ...prev, variables: newVariables }));
                                }}
                                placeholder={`Variable ${index + 1} name`}
                                className="text-sm h-8 flex-1"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Section */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Footer (Optional)</h4>
                    
                    <div>
                      <Input
                        value={createTemplateData.footerText}
                        onChange={(e) => setCreateTemplateData(prev => ({ ...prev, footerText: e.target.value }))}
                        placeholder="e.g., Aagam Holidays - Your Travel Partner"
                        maxLength={60}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {createTemplateData.footerText.length}/60 characters
                      </p>
                    </div>
                  </div>

                  {/* Buttons Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Buttons (Optional)</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addTemplateButton}
                        disabled={createTemplateData.buttons.length >= 3}
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Button
                      </Button>
                    </div>

                    {createTemplateData.buttons.map((button, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Button {index + 1}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeTemplateButton(index)}
                            className="text-red-600 hover:text-red-800 p-1 h-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Button Type
                            </label>
                            <Select 
                              value={button.type} 
                              onValueChange={(value) => updateTemplateButton(index, 'type', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                                <SelectItem value="URL">URL</SelectItem>
                                <SelectItem value="PHONE_NUMBER">Phone</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Button Text
                            </label>
                            <Input
                              value={button.text}
                              onChange={(e) => updateTemplateButton(index, 'text', e.target.value)}
                              placeholder="Button text"
                              className="h-8 text-sm"
                              maxLength={20}
                            />
                          </div>
                        </div>

                        {button.type === 'URL' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              URL
                            </label>
                            <Input
                              value={button.url || ''}
                              onChange={(e) => updateTemplateButton(index, 'url', e.target.value)}
                              placeholder="https://example.com"
                              className="h-8 text-sm"
                            />
                          </div>
                        )}

                        {button.type === 'PHONE_NUMBER' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Phone Number
                            </label>
                            <Input
                              value={button.url || ''}
                              onChange={(e) => updateTemplateButton(index, 'url', e.target.value)}
                              placeholder="+919876543210"
                              className="h-8 text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Include country code (e.g., +91 for India)
                            </p>
                          </div>
                        )}
                      </div>
                    ))}

                    {createTemplateData.buttons.length >= 3 && (
                      <p className="text-xs text-orange-600">
                        Maximum 3 buttons allowed per template
                      </p>
                    )}
                  </div>

                  {/* Submission Section */}
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <h5 className="font-medium text-yellow-900">Approval Process</h5>
                    </div>
                    <div className="text-xs text-yellow-800 space-y-1">
                      <p>1. Template will be submitted to Meta for review</p>
                      <p>2. Review typically takes 24-48 hours</p>
                      <p>3. You&apos;ll receive approval/rejection notification</p>
                      <p>4. Only approved templates can send messages</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateTemplate(false);
                        resetCreateTemplateForm();
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={submitTemplateForApproval}
                      disabled={isSending || !createTemplateData.name || !createTemplateData.bodyText}
                      className="flex-1 bg-[#075e54] hover:bg-[#064e46]"
                    >
                      {isSending ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Submitting...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          Submit for Approval
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="w-1/2 p-6 bg-gray-50">
                <div className="sticky top-6">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Live Preview
                  </h4>
                  
                  {/* WhatsApp Message Preview */}
                  <div className="bg-[#e5ddd5] p-4 rounded-lg">
                    <div className="flex justify-end">
                      <div
                        className="max-w-[85%] px-3 py-2 rounded-lg bg-[#dcf8c6] relative"
                        style={{ borderRadius: '18px 18px 4px 18px' }}
                      >
                        {/* Message tail */}
                        <div className="absolute top-0 right-[-8px] w-0 h-0 border-l-[8px] border-l-[#dcf8c6] border-t-[8px] border-t-transparent" />
                        
                        <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                          {generateCreateTemplatePreview() || "Start typing to see preview..."}
                        </div>
                        
                        <div className="flex items-center justify-end mt-1 text-xs text-gray-600 gap-1">
                          <span>Preview</span>
                          <CheckCircle className="w-3 h-3 text-blue-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Template Status Info */}
                  <div className="mt-4 bg-white rounded-lg p-3 border">
                    <h5 className="font-medium text-sm text-gray-800 mb-2">Template Status</h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-mono bg-gray-100 px-1 rounded">
                          {createTemplateData.name || 'template_name'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Category:</span>
                        <span className="text-gray-800">{createTemplateData.category}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Language:</span>
                        <span className="text-gray-800">{createTemplateData.language}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Variables:</span>
                        <span className="text-gray-800">{createTemplateData.variables.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Buttons:</span>
                        <span className="text-gray-800">{createTemplateData.buttons.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">
                          DRAFT
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Validation Status */}
                  <div className="mt-4">
                    {(() => {
                      const validation = validateTemplateData();
                      return (
                        <div className={`p-3 rounded-lg border ${
                          validation.isValid 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            {validation.isValid ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">Ready to Submit</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <span className="text-sm font-medium text-red-800">Validation Issues</span>
                              </>
                            )}
                          </div>
                          {!validation.isValid && (
                            <ul className="text-xs text-red-700 space-y-1">
                              {validation.errors.map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
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
            <div className="p-3 border-b bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-800">Start New Chat</span>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Enter phone number here
                </span>
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
                  placeholder="Enter 10+ digit phone number"
                  value={phoneNumber}
                  onChange={(e) => {
                    // Only allow numbers and limit length based on country
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    // Limit to 15 digits (international standard)
                    if (value.length <= 15) {
                      setPhoneNumber(value);
                    }
                  }}
                  className="flex-1 text-sm border-green-200 focus:border-green-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && phoneNumber.trim().length >= 10) {
                      setSelectedConversation(getFullPhoneNumber());
                    }
                  }}
                  maxLength={15}
                />
                
                {/* Start Chat Button */}
                {phoneNumber.length >= 10 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const fullNumber = getFullPhoneNumber();
                      setSelectedConversation(fullNumber);
                      // Add to conversations list if not already present
                      if (!conversations.includes(fullNumber)) {
                        setConversations(prev => [fullNumber, ...prev]);
                      }
                    }}
                    className="px-3 h-8 text-xs bg-[#075e54] hover:bg-[#064e46] text-white"
                  >
                    Start Chat
                  </Button>
                )}
              </div>
              
              {/* Helpful tip */}
              <div className="mt-2 text-xs text-gray-600">
                💡 Enter the recipient&apos;s phone number here to start chatting or send templates
              </div>
              
              {/* Preview of full number and validation */}
              {phoneNumber && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span>Full number:</span>
                    <code className="bg-gray-100 px-1 rounded text-green-600 font-mono">
                      {getFullPhoneNumber()}
                    </code>
                    {phoneNumber.length >= 10 && (
                      <span className="text-green-600 ml-1">✓ Ready</span>
                    )}
                  </div>
                  {phoneNumber.length < 10 ? (
                    <div className="text-xs text-orange-600 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>Need {10 - phoneNumber.length} more digits (minimum 10)</span>
                    </div>
                  ) : (
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <span>✅</span>
                      <span>Ready to start conversation • Press Enter or click &quot;Start Chat&quot;</span>
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
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowCreateTemplate(true)}
                      className="p-1 h-auto hover:bg-[#064e46] text-white"
                      title="Create New Template"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowTemplates(false)}
                      className="p-1 h-auto hover:bg-[#064e46] text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {/* Create Template CTA */}
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Create Custom Template</span>
                    </div>
                    <p className="text-xs text-blue-800 mb-3">
                      Design your own WhatsApp message templates with custom variables and buttons
                    </p>
                    <Button 
                      size="sm" 
                      className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700"
                      onClick={() => setShowCreateTemplate(true)}
                    >
                      Create New Template
                    </Button>
                  </div>

                  {/* Templates List */}
                  {templates.map((template) => (
                    <div key={template.id} className="bg-gray-50 rounded-lg p-3 border hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-sm text-gray-900">
                            {template.name && typeof template.name === 'string' ? template.name.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN TEMPLATE'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${
                              template.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                              template.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {template.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                              {template.status === 'PENDING' && <Clock className="w-3 h-3" />}
                              {template.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                              {template.status}
                            </span>
                            <span className="text-xs text-gray-500">{template.category}</span>
                          </div>
                          
                          {/* Approval Status Info */}
                          {template.status === 'PENDING' && (
                            <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1">
                              ⏳ Under review by Meta (24-48 hours)
                            </div>
                          )}
                          {template.status === 'REJECTED' && (
                            <div className="mt-2 text-xs text-red-700 bg-red-50 rounded px-2 py-1">
                              ❌ Rejected - Review guidelines and resubmit
                            </div>
                          )}
                          {template.status === 'APPROVED' && (
                            <div className="mt-2 text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                              ✅ Ready to use
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        {template.components?.map((component, index) => (
                          <div key={index} className="text-xs">
                            {component.type === 'HEADER' && (
                              <div className="font-medium text-gray-900">{component.text}</div>
                            )}
                            {component.type === 'BODY' && (
                              <div className="text-gray-700 leading-relaxed">
                                {component.text ? (
                                  component.text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
                                    return `[${varName}]`;
                                  })
                                ) : (
                                  <span className="italic text-gray-500">
                                    Template content: {template.name && typeof template.name === 'string' ? template.name.replace(/_/g, ' ') : 'Unknown Template'}
                                  </span>
                                )}
                              </div>
                            )}
                            {component.type === 'FOOTER' && (
                              <div className="text-xs text-gray-500 mt-1">{component.text}</div>
                            )}
                          </div>
                        )) || (
                          <div className="text-xs text-gray-500 italic">
                            No template components available
                          </div>
                        )}
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
                          
                          // Show preview modal for variable input
                          showPreview(template);
                        }}
                      >
                        Preview & Send
                      </Button>
                    </div>
                  ))}
                  
                  {/* Template Guidelines */}
                  <div className="bg-gray-50 rounded-lg p-3 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-800">Template Guidelines</span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>• Templates require Meta approval before use</p>
                      <p>• Review process: 24-48 hours</p>
                      <p>• Follow WhatsApp Business Policy</p>
                      <p>• Use variables (&#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;) for dynamic content</p>
                      <p>• Maximum 3 buttons per template</p>
                      <p>• Transactional templates have higher approval rates</p>
                    </div>
                  </div>

                  {/* Template Status Legend */}
                  <div className="bg-white rounded-lg p-3 border">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Status Legend</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          APPROVED
                        </span>
                        <span className="text-gray-600">Ready to send messages</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          PENDING
                        </span>
                        <span className="text-gray-600">Under Meta review</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          REJECTED
                        </span>
                        <span className="text-gray-600">Needs modification</span>
                      </div>
                    </div>
                  </div>
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
                              <Image 
                                src={message.mediaUrl} 
                                alt="Shared media"
                                width={300}
                                height={200}
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
                  <Image 
                    src={imagePreview} 
                    alt="Preview"
                    width={128}
                    height={128}
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
                    <div className="relative">
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
                      {/* Create Template Quick Access */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowCreateTemplate(true)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 bg-[#075e54] text-white hover:bg-[#064e46]"
                        title="Create New Template"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
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
              <p>💡 Enter 10+ digit phone number • Press Enter or &quot;Start Chat&quot; • Use 📄 for templates • Press Enter to send messages</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
