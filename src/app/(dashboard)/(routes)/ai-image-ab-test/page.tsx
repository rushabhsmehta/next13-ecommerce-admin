"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import axios from "axios";
import { 
  Plus,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  Share2,
  Zap,
  Clock,
  Target,
  Award,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  variants: ABTestVariant[];
  targetSampleSize: number;
  currentSampleSize: number;
  confidenceLevel: number;
  winner?: string;
  recommendations?: string[];
}

interface ABTestVariant {
  id: string;
  name: string;
  prompt: string;
  imageUrl?: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  engagementRate: number;
  conversionRate: number;
}

const ABTestPage = () => {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Create test form state
  const [newTest, setNewTest] = useState({
    name: '',
    description: '',
    targetSampleSize: 1000,
    confidenceLevel: 95,
    variants: [
      { name: 'Variant A', prompt: '' },
      { name: 'Variant B', prompt: '' }
    ]
  });

  useEffect(() => {
    fetchTests();
  }, [selectedTest, statusFilter]);

  const fetchTests = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/ai-image/ab-test', {
        params: { 
          testId: selectedTest !== 'all' ? selectedTest : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined
        }
      });
      setTests(Array.isArray(response.data) ? response.data : [response.data].filter(Boolean));
    } catch (error) {
      console.error('Error fetching A/B tests:', error);
      setTests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createTest = async () => {
    try {
      await axios.post('/api/ai-image/ab-test', newTest);
      setIsCreateDialogOpen(false);
      setNewTest({
        name: '',
        description: '',
        targetSampleSize: 1000,
        confidenceLevel: 95,
        variants: [
          { name: 'Variant A', prompt: '' },
          { name: 'Variant B', prompt: '' }
        ]
      });
      fetchTests();
    } catch (error) {
      console.error('Error creating A/B test:', error);
    }
  };

  const updateTestStatus = async (testId: string, action: 'start' | 'pause' | 'complete') => {
    try {
      await axios.patch(`/api/ai-image/ab-test`, { testId, action });
      fetchTests();
    } catch (error) {
      console.error(`Error ${action}ing test:`, error);
    }
  };

  const addVariant = () => {
    setNewTest(prev => ({
      ...prev,
      variants: [...prev.variants, { name: `Variant ${String.fromCharCode(65 + prev.variants.length)}`, prompt: '' }]
    }));
  };

  const removeVariant = (index: number) => {
    if (newTest.variants.length > 2) {
      setNewTest(prev => ({
        ...prev,
        variants: prev.variants.filter((_, i) => i !== index)
      }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'default';
      case 'completed': return 'outline';
      case 'paused': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return Play;
      case 'completed': return CheckCircle;
      case 'paused': return Pause;
      default: return Clock;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <Heading title="A/B Testing" description="Optimize your AI image generation with data-driven experiments" />
          <Separator />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading title="A/B Testing" description="Optimize your AI image generation with data-driven experiments" />
          <div className="flex space-x-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchTests} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New A/B Test
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New A/B Test</DialogTitle>
                  <DialogDescription>
                    Set up a new experiment to compare different AI image generation prompts and optimize for engagement.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Test Name</Label>
                      <Input
                        id="name"
                        value={newTest.name}
                        onChange={(e) => setNewTest(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Product Image Style Test"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetSampleSize">Target Sample Size</Label>
                      <Input
                        id="targetSampleSize"
                        type="number"
                        value={newTest.targetSampleSize}
                        onChange={(e) => setNewTest(prev => ({ ...prev, targetSampleSize: parseInt(e.target.value) || 1000 }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newTest.description}
                      onChange={(e) => setNewTest(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what you're testing and your hypothesis..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confidence Level</Label>
                    <Select 
                      value={newTest.confidenceLevel.toString()} 
                      onValueChange={(value) => setNewTest(prev => ({ ...prev, confidenceLevel: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90">90%</SelectItem>
                        <SelectItem value="95">95%</SelectItem>
                        <SelectItem value="99">99%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Test Variants</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Variant
                      </Button>
                    </div>
                    {newTest.variants.map((variant, index) => (
                      <div key={index} className="space-y-2 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <Input
                            value={variant.name}
                            onChange={(e) => {
                              const newVariants = [...newTest.variants];
                              newVariants[index].name = e.target.value;
                              setNewTest(prev => ({ ...prev, variants: newVariants }));
                            }}
                            placeholder="Variant name"
                            className="max-w-xs"
                          />
                          {newTest.variants.length > 2 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeVariant(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <Textarea
                          value={variant.prompt}
                          onChange={(e) => {
                            const newVariants = [...newTest.variants];
                            newVariants[index].prompt = e.target.value;
                            setNewTest(prev => ({ ...prev, variants: newVariants }));
                          }}
                          placeholder="Enter the AI image generation prompt for this variant..."
                          rows={3}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createTest} disabled={!newTest.name || !newTest.variants.every(v => v.prompt)}>
                    Create Test
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Separator />

        {tests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Zap className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No A/B Tests Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first A/B test to start optimizing your AI image generation with data-driven insights.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Test
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Test Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tests.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {tests.filter(t => t.status === 'running').length} running
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Tests</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tests.filter(t => t.status === 'completed').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tests.filter(t => t.winner).length} with clear winners
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sample Size</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(tests.reduce((sum, test) => sum + test.currentSampleSize, 0))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all experiments
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tests.length > 0 ? 
                      (tests.reduce((sum, test) => sum + test.confidenceLevel, 0) / tests.length).toFixed(0) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Statistical significance
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Test Details */}
            <div className="space-y-4">
              {tests.map((test) => (
                <Card key={test.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>{test.name}</span>
                          <Badge variant={getStatusColor(test.status)}>
                            {React.createElement(getStatusIcon(test.status), { className: "w-3 h-3 mr-1" })}
                            {test.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {test.description}
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        {test.status === 'draft' && (
                          <Button size="sm" onClick={() => updateTestStatus(test.id, 'start')}>
                            <Play className="w-4 h-4 mr-2" />
                            Start
                          </Button>
                        )}
                        {test.status === 'running' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateTestStatus(test.id, 'pause')}>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </Button>
                            <Button size="sm" onClick={() => updateTestStatus(test.id, 'complete')}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Complete
                            </Button>
                          </>
                        )}
                        {test.status === 'paused' && (
                          <Button size="sm" onClick={() => updateTestStatus(test.id, 'start')}>
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="results" className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="results">Results</TabsTrigger>
                        <TabsTrigger value="variants">Variants</TabsTrigger>
                        <TabsTrigger value="insights">Insights</TabsTrigger>
                      </TabsList>

                      <TabsContent value="results" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Progress</Label>
                            <Progress 
                              value={(test.currentSampleSize / test.targetSampleSize) * 100} 
                              className="h-2" 
                            />
                            <p className="text-xs text-muted-foreground">
                              {test.currentSampleSize.toLocaleString()} of {test.targetSampleSize.toLocaleString()} samples
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Confidence Level</Label>
                            <div className="text-lg font-semibold">{test.confidenceLevel}%</div>
                            <p className="text-xs text-muted-foreground">Statistical significance</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Duration</Label>
                            <div className="text-lg font-semibold">
                              {test.startedAt ? 
                                Math.ceil((new Date().getTime() - new Date(test.startedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0} days
                            </div>
                            <p className="text-xs text-muted-foreground">Since started</p>
                          </div>
                        </div>

                        {test.winner && (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <Award className="w-5 h-5 text-green-600" />
                              <h4 className="font-medium text-green-800">Winner Identified</h4>
                            </div>
                            <p className="text-sm text-green-700">
                              {test.variants.find(v => v.id === test.winner)?.name} is performing significantly better with {test.confidenceLevel}% confidence.
                            </p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="variants" className="space-y-4">
                        <div className="grid gap-4">
                          {test.variants.map((variant, index) => (
                            <div key={variant.id} className={`p-4 border rounded-lg ${test.winner === variant.id ? 'border-green-500 bg-green-50' : ''}`}>
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium">{variant.name}</h4>
                                  {test.winner === variant.id && (
                                    <Badge variant="default">
                                      <Award className="w-3 h-3 mr-1" />
                                      Winner
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold">
                                    {(variant.engagementRate * 100).toFixed(2)}%
                                  </div>
                                  <p className="text-xs text-muted-foreground">Engagement Rate</p>
                                </div>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-3 font-mono bg-gray-50 p-2 rounded">
                                {variant.prompt}
                              </p>

                              {variant.imageUrl && (
                                <div className="relative w-full h-32 mb-3 rounded-lg overflow-hidden">
                                  <Image
                                    src={variant.imageUrl}
                                    alt={variant.name}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                  />
                                </div>
                              )}

                              <div className="grid grid-cols-4 gap-4 text-center">
                                <div>
                                  <div className="font-medium">{formatNumber(variant.views)}</div>
                                  <p className="text-xs text-muted-foreground">Views</p>
                                </div>
                                <div>
                                  <div className="font-medium">{formatNumber(variant.likes)}</div>
                                  <p className="text-xs text-muted-foreground">Likes</p>
                                </div>
                                <div>
                                  <div className="font-medium">{formatNumber(variant.shares)}</div>
                                  <p className="text-xs text-muted-foreground">Shares</p>
                                </div>
                                <div>
                                  <div className="font-medium">{(variant.conversionRate * 100).toFixed(1)}%</div>
                                  <p className="text-xs text-muted-foreground">Conversion</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="insights" className="space-y-4">
                        {test.recommendations && test.recommendations.length > 0 ? (
                          <div className="space-y-3">
                            <h4 className="font-medium">Recommendations</h4>
                            {test.recommendations.map((recommendation, index) => (
                              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-blue-800">{recommendation}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h4 className="font-medium mb-2">Insights Coming Soon</h4>
                            <p className="text-sm text-muted-foreground">
                              More data needed to generate actionable insights. Keep the test running!
                            </p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ABTestPage;
