"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { 
  Send, 
  Plus,
  Trash2,
  Edit,
  MessageSquare
} from 'lucide-react';

interface MessageTemplate {
  id: string;
  name: string;
  message: string;
  variables: string[];
}

const defaultTemplates: MessageTemplate[] = [
  {
    id: '1',
    name: 'Booking Confirmation',
    message: 'Hello {name}, your booking for {package} has been confirmed for {date}. Booking ID: {bookingId}. Thank you for choosing us!',
    variables: ['name', 'package', 'date', 'bookingId']
  },
  {
    id: '2',
    name: 'Payment Reminder',
    message: 'Dear {name}, this is a reminder for your pending payment of ₹{amount} for {package}. Due date: {dueDate}.',
    variables: ['name', 'amount', 'package', 'dueDate']
  },
  {
    id: '3',
    name: 'Welcome Message',
    message: 'Welcome {name}! Thank you for your inquiry about {destination}. Our travel expert will contact you shortly.',
    variables: ['name', 'destination']
  },
  {
    id: '4',
    name: 'Trip Reminder',
    message: 'Hi {name}, your trip to {destination} is scheduled for {date}. Please ensure all documents are ready. Have a great journey!',
    variables: ['name', 'destination', 'date']
  }
];

interface WhatsAppTemplatesProps {
  onSendTemplate?: (phoneNumber: string, message: string) => void;
}

export default function WhatsAppTemplates({ onSendTemplate }: WhatsAppTemplatesProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [templateVariables, setTemplateVariables] = useState<{ [key: string]: string }>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', message: '' });
  const [isSending, setIsSending] = useState(false);

  const extractVariables = (message: string): string[] => {
    const matches = message.match(/\{([^}]+)\}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  };

  const handleTemplateSelect = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    const variables: { [key: string]: string } = {};
    template.variables.forEach(variable => {
      variables[variable] = '';
    });
    setTemplateVariables(variables);
  };

  const handleVariableChange = (variable: string, value: string) => {
    setTemplateVariables(prev => ({
      ...prev,
      [variable]: value
    }));
  };

  const generateMessage = (): string => {
    if (!selectedTemplate) return '';
    
    let message = selectedTemplate.message;
    Object.entries(templateVariables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    return message;
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate || !phoneNumber) {
      toast.error('Please select a template and enter phone number');
      return;
    }

    const missingVariables = selectedTemplate.variables.filter(
      variable => !templateVariables[variable]?.trim()
    );

    if (missingVariables.length > 0) {
      toast.error(`Please fill in: ${missingVariables.join(', ')}`);
      return;
    }

    setIsSending(true);
    try {
      const message = generateMessage();
      
      if (onSendTemplate) {
        onSendTemplate(phoneNumber, message);
      } else {
        // Send directly via API
        const response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: phoneNumber,
            message: message
          }),
        });

        const data = await response.json();

        if (data.success) {
          toast.success('Template message sent successfully!');
          // Reset form
          setSelectedTemplate(null);
          setTemplateVariables({});
        } else {
          toast.error(data.error || 'Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error sending template message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.message.trim()) {
      toast.error('Please enter template name and message');
      return;
    }

    const variables = extractVariables(newTemplate.message);
    const template: MessageTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      message: newTemplate.message,
      variables
    };

    setTemplates(prev => [...prev, template]);
    setNewTemplate({ name: '', message: '' });
    setIsCreating(false);
    toast.success('Template created successfully!');
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
      setTemplateVariables({});
    }
    toast.success('Template deleted successfully!');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              Message Templates
            </CardTitle>
            <Button
              onClick={() => setIsCreating(true)}
              disabled={isCreating}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Templates List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Available Templates</h3>
              
              {/* Create New Template */}
              {isCreating && (
                <Card className="border-dashed border-2">
                  <CardContent className="p-4 space-y-3">
                    <Input
                      placeholder="Template name"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Template message (use {variable} for dynamic content)"
                      value={newTemplate.message}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, message: e.target.value }))}
                      className="min-h-[100px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreateTemplate}>
                        Create
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setIsCreating(false);
                          setNewTemplate({ name: '', message: '' });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    {newTemplate.message && (
                      <div className="text-xs text-gray-500">
                        Variables detected: {extractVariables(newTemplate.message).join(', ') || 'None'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Template Cards */}
              <div className="space-y-3">
                {templates.map((template) => (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {template.message}
                          </p>
                          {template.variables.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.variables.map((variable) => (
                                <Badge key={variable} variant="secondary" className="text-xs">
                                  {variable}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Template Form */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Send Template Message</h3>
              
              {selectedTemplate ? (
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">{selectedTemplate.name}</h4>
                      
                      {/* Phone Number */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Phone Number</label>
                        <Input
                          placeholder="e.g., +919876543210"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                      </div>

                      {/* Template Variables */}
                      {selectedTemplate.variables.length > 0 && (
                        <div className="space-y-3">
                          <label className="block text-sm font-medium">Template Variables</label>
                          {selectedTemplate.variables.map((variable) => (
                            <div key={variable}>
                              <label className="block text-xs text-gray-500 mb-1 capitalize">
                                {variable}
                              </label>
                              <Input
                                placeholder={`Enter ${variable}`}
                                value={templateVariables[variable] || ''}
                                onChange={(e) => handleVariableChange(variable, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Message Preview */}
                      <div className="bg-gray-50 p-3 rounded border">
                        <label className="block text-xs text-gray-500 mb-1">Message Preview</label>
                        <p className="text-sm whitespace-pre-wrap">{generateMessage()}</p>
                      </div>

                      {/* Send Button */}
                      <Button 
                        onClick={handleSendTemplate}
                        disabled={isSending}
                        className="w-full"
                      >
                        {isSending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Send Template Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500">Select a template to get started</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
