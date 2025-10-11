'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Workflow,
  CheckCircle,
  Play,
  Eye,
  Download,
  Upload,
  Sparkles
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Flow {
  id: string;
  name: string;
  status: string;
  categories: string[];
}

interface FlowField {
  name: string;
  label: string;
  type: 'TextInput' | 'TextArea' | 'CheckboxGroup' | 'RadioButtonsGroup' | 'Dropdown' | 'DatePicker';
  required?: boolean;
  description?: string;
  options?: Array<{ id: string; title: string }>;
}

type FlowTemplateType = 'signup' | 'appointment' | 'survey' | 'lead_generation';

export default function FlowBuilder({ onComplete }: { onComplete?: () => void }) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);

  // New flow creation state
  const [flowName, setFlowName] = useState('');
  const [flowType, setFlowType] = useState<FlowTemplateType>('signup');
  const [customFields, setCustomFields] = useState<FlowField[]>([
    { name: 'name', label: 'Full Name', type: 'TextInput', required: true }
  ]);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/flows/manage?action=list');
      const data = await response.json();
      if (data.success) {
        setFlows(data.flows || []);
      }
    } catch (error) {
      console.error('Error fetching flows:', error);
      toast.error('Failed to load flows');
    } finally {
      setLoading(false);
    }
  };

  const createFlowFromTemplate = async () => {
    if (!flowName.trim()) {
      toast.error('Flow name is required');
      return;
    }

    setLoading(true);
    try {
      const options: any = {
        flowName,
      };

      // Build options based on flow type
      if (flowType === 'signup' || flowType === 'lead_generation') {
        options.fields = customFields;
      } else if (flowType === 'appointment') {
        options.services = customFields.map(f => ({
          id: f.name,
          title: f.label
        }));
      } else if (flowType === 'survey') {
        options.questions = customFields.map(f => ({
          id: f.name,
          question: f.label,
          type: f.type === 'RadioButtonsGroup' ? 'radio' : 'text'
        }));
      }

      const response = await fetch('/api/whatsapp/flows/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: flowType,
          options,
          autoPublish: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Flow created successfully!');
        setFlowName('');
        setCustomFields([{ name: 'name', label: 'Full Name', type: 'TextInput', required: true }]);
        setShowCreateDialog(false);
        fetchFlows();
        if (onComplete) onComplete();
      } else {
        toast.error(data.error || 'Failed to create flow');
      }
    } catch (error) {
      console.error('Error creating flow:', error);
      toast.error('Failed to create flow');
    } finally {
      setLoading(false);
    }
  };

  const publishFlow = async (flowId: string) => {
    try {
      const response = await fetch('/api/whatsapp/flows/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', flowId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Flow published successfully!');
        fetchFlows();
      } else {
        toast.error(data.error || 'Failed to publish flow');
      }
    } catch (error) {
      console.error('Error publishing flow:', error);
      toast.error('Failed to publish flow');
    }
  };

  const deleteFlow = async (flowId: string) => {
    if (!confirm('Are you sure you want to delete this flow?')) return;

    try {
      const response = await fetch(
        `/api/whatsapp/flows/manage?action=delete&flowId=${flowId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Flow deleted successfully!');
        fetchFlows();
      } else {
        toast.error(data.error || 'Failed to delete flow');
      }
    } catch (error) {
      console.error('Error deleting flow:', error);
      toast.error('Failed to delete flow');
    }
  };

  const addField = () => {
    setCustomFields([
      ...customFields,
      { name: `field_${customFields.length}`, label: '', type: 'TextInput', required: false }
    ]);
  };

  const updateField = (index: number, updates: Partial<FlowField>) => {
    const newFields = [...customFields];
    newFields[index] = { ...newFields[index], ...updates };
    setCustomFields(newFields);
  };

  const removeField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; icon: any } } = {
      DRAFT: { color: 'bg-gray-500', icon: Eye },
      PUBLISHED: { color: 'bg-green-500', icon: CheckCircle },
      DEPRECATED: { color: 'bg-orange-500', icon: Eye },
    };

    const config = statusConfig[status] || { color: 'bg-gray-500', icon: Eye };
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getFlowTypeDescription = (type: FlowTemplateType) => {
    const descriptions = {
      signup: 'Collect user information for registration',
      appointment: 'Book appointments with service selection',
      survey: 'Gather customer feedback and insights',
      lead_generation: 'Capture leads with contact information',
    };
    return descriptions[type];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Flow Builder</h2>
          <p className="text-muted-foreground">
            Create and manage WhatsApp Flows for interactive experiences
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(!showCreateDialog)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Flow
        </Button>
      </div>

      {/* Create Flow Section */}
      {showCreateDialog && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create New Flow from Template
            </CardTitle>
            <CardDescription>
              Choose a pre-built template and customize it for your needs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="flow-name">Flow Name *</Label>
                <Input
                  id="flow-name"
                  placeholder="e.g., User Registration"
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="flow-type">Flow Type *</Label>
                <Select value={flowType} onValueChange={(value) => setFlowType(value as FlowTemplateType)}>
                  <SelectTrigger id="flow-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="signup">Sign Up Form</SelectItem>
                    <SelectItem value="appointment">Appointment Booking</SelectItem>
                    <SelectItem value="survey">Customer Survey</SelectItem>
                    <SelectItem value="lead_generation">Lead Generation</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {getFlowTypeDescription(flowType)}
                </p>
              </div>
            </div>

            {/* Custom Fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  {flowType === 'appointment' ? 'Services' : 
                   flowType === 'survey' ? 'Questions' : 'Form Fields'}
                </Label>
                <Button size="sm" variant="outline" onClick={addField}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add {flowType === 'appointment' ? 'Service' : 
                       flowType === 'survey' ? 'Question' : 'Field'}
                </Button>
              </div>

              <div className="space-y-3">
                {customFields.map((field, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">
                        {flowType === 'appointment' ? 'Service' : 
                         flowType === 'survey' ? 'Question' : 'Field'} #{idx + 1}
                      </Badge>
                      {customFields.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeField(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Field Name</Label>
                        <Input
                          placeholder="field_name"
                          value={field.name}
                          onChange={(e) => updateField(idx, { name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">
                          {flowType === 'survey' ? 'Question' : 'Label'}
                        </Label>
                        <Input
                          placeholder={flowType === 'survey' ? 'What is your question?' : 'Field Label'}
                          value={field.label}
                          onChange={(e) => updateField(idx, { label: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Field Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value) => updateField(idx, { type: value as FlowField['type'] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TextInput">Text Input</SelectItem>
                            <SelectItem value="TextArea">Text Area</SelectItem>
                            <SelectItem value="RadioButtonsGroup">Radio Buttons</SelectItem>
                            <SelectItem value="CheckboxGroup">Checkboxes</SelectItem>
                            <SelectItem value="Dropdown">Dropdown</SelectItem>
                            <SelectItem value="DatePicker">Date Picker</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={field.required || false}
                            onChange={(e) => updateField(idx, { required: e.target.checked })}
                            className="rounded"
                          />
                          Required Field
                        </Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setFlowName('');
                  setCustomFields([{ name: 'name', label: 'Full Name', type: 'TextInput', required: true }]);
                }}
              >
                Cancel
              </Button>
              <Button onClick={createFlowFromTemplate} disabled={loading}>
                {loading ? 'Creating...' : 'Create Flow'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flows List */}
      {loading && !showCreateDialog ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : flows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Workflow className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No flows found</p>
            <Button onClick={() => setShowCreateDialog(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create your first flow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <Card key={flow.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">{flow.name}</CardTitle>
                  </div>
                  {getStatusBadge(flow.status)}
                </div>
                <CardDescription className="flex flex-wrap gap-1 mt-2">
                  {flow.categories?.map((category) => (
                    <Badge key={category} variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Flow ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{flow.id}</code>
                </div>

                <div className="flex gap-2">
                  {flow.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => publishFlow(flow.id)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Publish
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteFlow(flow.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Pro Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Flows must be published before they can be used in templates</li>
            <li>Test your flows in WhatsApp Business App before going live</li>
            <li>Use clear and concise labels for better user experience</li>
            <li>Keep forms short - users prefer quick interactions</li>
            <li>You&rsquo;ll need the Flow ID to create a template with a FLOW button</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
