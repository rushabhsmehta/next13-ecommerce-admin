'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'react-hot-toast';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Video,
  FileIcon,
  Phone,
  Link as LinkIcon,
  MessageSquare,
  Workflow,
  BarChart3,
  Filter,
  Download,
  Upload
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: any[];
  quality_score?: {
    score: number;
    status: 'high' | 'medium' | 'low';
  };
}

interface TemplateAnalytics {
  total: number;
  byStatus: { [key: string]: number };
  byCategory: { [key: string]: number };
  byQuality: { high: number; medium: number; low: number };
  averageAge: number;
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [analytics, setAnalytics] = useState<TemplateAnalytics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');

  useEffect(() => {
    fetchTemplates();
    fetchAnalytics();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/templates/manage?action=list');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/whatsapp/templates/manage?action=analytics');
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const searchTemplates = async (query: string) => {
    if (!query) {
      fetchTemplates();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/whatsapp/templates/manage?action=search&name=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Error searching templates:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(
        `/api/whatsapp/templates/manage?action=delete&id=${templateId}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      
      if (data.success) {
        toast.success('Template deleted successfully');
        fetchTemplates();
        fetchAnalytics();
        setShowDeleteDialog(false);
        setSelectedTemplate(null);
      } else {
        toast.error(data.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { variant: any; icon: any } } = {
      APPROVED: { variant: 'default', icon: CheckCircle },
      PENDING: { variant: 'secondary', icon: Clock },
      REJECTED: { variant: 'destructive', icon: XCircle },
    };

    const config = statusConfig[status] || { variant: 'outline', icon: AlertCircle };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getQualityBadge = (score?: { score: number; status: string }) => {
    if (!score || typeof score.score !== 'number') return null;

    const colors: { [key: string]: string } = {
      high: 'bg-green-500',
      medium: 'bg-yellow-500',
      low: 'bg-red-500',
    };

    return (
      <Badge className={`${colors[score.status]} text-white`}>
        {score.score.toFixed(1)} / 10
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: any } = {
      MARKETING: TrendingUp,
      UTILITY: FileText,
      AUTHENTICATION: Phone,
    };
    const Icon = icons[category] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesStatus = filterStatus === 'all' || template.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Template Manager</h1>
          <p className="text-muted-foreground">
            Manage WhatsApp message templates and flows
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="flows">Flows</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchTemplates(e.target.value);
                    }}
                    className="pl-9"
                  />
                </div>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="UTILITY">Utility</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Templates Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No templates found</p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  variant="outline"
                  className="mt-4"
                >
                  Create your first template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(template.category)}
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                      </div>
                      {getStatusBadge(template.status)}
                    </div>
                    <CardDescription className="flex items-center gap-2 text-xs">
                      {template.language}
                      {template.quality_score && (
                        <>
                          <span>•</span>
                          {getQualityBadge(template.quality_score)}
                        </>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Template Preview */}
                    <div className="bg-muted p-3 rounded text-sm line-clamp-3">
                      {template.components?.find((c) => c.type === 'BODY')?.text ||
                        'No body content'}
                    </div>

                    {/* Component Badges */}
                    <div className="flex flex-wrap gap-1">
                      {template.components?.map((component, idx) => {
                        const icons: { [key: string]: any } = {
                          HEADER: component.format === 'IMAGE' ? ImageIcon :
                                  component.format === 'VIDEO' ? Video :
                                  component.format === 'DOCUMENT' ? FileIcon : FileText,
                          BODY: MessageSquare,
                          FOOTER: FileText,
                          BUTTONS: component.buttons?.[0]?.type === 'URL' ? LinkIcon :
                                   component.buttons?.[0]?.type === 'PHONE_NUMBER' ? Phone :
                                   component.buttons?.[0]?.type === 'FLOW' ? Workflow : FileText,
                        };
                        const Icon = icons[component.type] || FileText;
                        
                        return (
                          <Badge key={idx} variant="outline" className="text-xs gap-1">
                            <Icon className="h-3 w-3" />
                            {component.type}
                          </Badge>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowPreviewDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.total}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Approved</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.byStatus.APPROVED || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.byStatus.PENDING || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Age</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.averageAge != null ? analytics.averageAge.toFixed(0) : '0'} days
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Templates by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analytics.byCategory).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(category)}
                          <span className="font-medium">{category}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quality Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Quality Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        High Quality
                      </span>
                      <Badge variant="secondary">{analytics.byQuality.high}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-yellow-500" />
                        Medium Quality
                      </span>
                      <Badge variant="secondary">{analytics.byQuality.medium}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        Low Quality
                      </span>
                      <Badge variant="secondary">{analytics.byQuality.low}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Flows Tab */}
        <TabsContent value="flows" className="space-y-4">
          <Alert>
            <Workflow className="h-4 w-4" />
            <AlertDescription>
              Flow management UI will be available in the Flow Builder component.
              Use the Flow Builder to create and manage WhatsApp Flows visually.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              Preview how this template will appear to users
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Name</Label>
                  <p className="font-medium">{selectedTemplate.name}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedTemplate.status)}</div>
                </div>
                <div>
                  <Label>Category</Label>
                  <p className="font-medium">{selectedTemplate.category}</p>
                </div>
                <div>
                  <Label>Language</Label>
                  <p className="font-medium">{selectedTemplate.language}</p>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
                {selectedTemplate.components?.map((component, idx) => (
                  <div key={idx} className="space-y-2">
                    <Badge variant="outline">{component.type}</Badge>
                    {component.type === 'HEADER' && component.format && (
                      <div className="bg-background p-3 rounded">
                        <p className="text-xs text-muted-foreground mb-1">
                          Format: {component.format}
                        </p>
                        {component.text && <p className="font-semibold">{component.text}</p>}
                      </div>
                    )}
                    {component.type === 'BODY' && (
                      <div className="bg-background p-3 rounded">
                        <p className="whitespace-pre-wrap">{component.text}</p>
                      </div>
                    )}
                    {component.type === 'FOOTER' && (
                      <div className="bg-background p-3 rounded">
                        <p className="text-sm text-muted-foreground">{component.text}</p>
                      </div>
                    )}
                    {component.type === 'BUTTONS' && component.buttons && (
                      <div className="space-y-1">
                        {component.buttons.map((button: any, btnIdx: number) => (
                          <div
                            key={btnIdx}
                            className="bg-background p-2 rounded text-center text-sm font-medium text-blue-600 border"
                          >
                            {button.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{selectedTemplate?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedTemplate && deleteTemplate(selectedTemplate.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
