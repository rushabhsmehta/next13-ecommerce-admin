"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Phone, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface WhatsAppMessage {
  sid: string;
  to: string;
  from: string;
  body: string;
  status: string;
  dateCreated: string;
  dateSent?: string;
}

export default function WhatsAppPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/messages');
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch messages",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !message) return;

    setSendingMessage(true);
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          body: message,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "WhatsApp message sent successfully!",
        });
        setMessage("");
        setPhoneNumber("");
        fetchMessages(); // Refresh messages
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send message",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Delivered</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800"><Send className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" />{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Business</h1>
          <p className="text-gray-600">Send messages and manage customer communications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Send Message Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Message
            </CardTitle>
            <CardDescription>
              Send a WhatsApp message to a customer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={sendMessage} className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    <Phone className="h-4 w-4" />
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="rounded-l-none"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Include country code (e.g., +1 for US)
                </p>
              </div>
              
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {message.length}/1600 characters
                </p>
              </div>
              
              <Button
                type="submit"
                disabled={sendingMessage || !phoneNumber || !message}
                className="w-full"
              >
                {sendingMessage ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Message History Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Messages
            </CardTitle>
            <CardDescription>
              View your recent WhatsApp message history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No messages sent yet</p>
                  <p className="text-sm">Send your first WhatsApp message to get started</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {messages.map((msg) => (
                    <div key={msg.sid} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">{msg.to}</span>
                        </div>
                        {getStatusBadge(msg.status)}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{msg.body}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(msg.dateCreated).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              <Button
                variant="outline"
                onClick={fetchMessages}
                className="w-full"
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh Messages"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Templates */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Message Templates</CardTitle>
          <CardDescription>
            Click to use pre-defined message templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                title: "Order Confirmation",
                template: "Hi! Your order has been confirmed and is being processed. We'll notify you once it's shipped. Thank you for choosing us!"
              },
              {
                title: "Shipping Update",
                template: "Great news! Your order has been shipped and is on its way. You can track your package using the tracking number we sent to your email."
              },
              {
                title: "Delivery Confirmation",
                template: "Your order has been delivered! We hope you love your purchase. Please let us know if you have any questions or feedback."
              }
            ].map((template, index) => (
              <Button
                key={index}
                variant="outline"
                className="text-left h-auto p-3"
                onClick={() => setMessage(template.template)}
              >
                <div>
                  <p className="font-medium text-sm">{template.title}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {template.template}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
