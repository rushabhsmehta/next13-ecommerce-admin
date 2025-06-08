"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Share2, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Users, 
  Eye, 
  Heart, 
  MessageCircle,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  Plus,
  Send,
  BarChart3,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  imageUrl?: string;
  status: 'scheduled' | 'posted' | 'failed';
  scheduledTime?: string;
  postedTime?: string;
  metrics: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
    engagementRate: number;
  };
}

interface PlatformConnection {
  platform: string;
  connected: boolean;
  accountName?: string;
  lastSync?: string;
}

const platformIcons = {
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: Facebook,
};

const platformColors = {
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  twitter: "bg-blue-500",
  linkedin: "bg-blue-600",
  facebook: "bg-blue-700",
};

export default function SocialMediaIntegrationPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({
    platform: "",
    content: "",
    imageUrl: "",
    scheduledTime: "",
  });

  useEffect(() => {
    fetchSocialMediaData();
  }, []);
  const fetchSocialMediaData = async () => {
    try {
      setLoading(true);
      console.log('Fetching social media data...');
      
      // Fetch posts
      const postsResponse = await fetch('/api/ai-image/social-media?action=get_posts');
      const postsData = await postsResponse.json();
      console.log('Posts data:', postsData);
      setPosts(postsData.posts || []);

      // Fetch connections
      const connectionsResponse = await fetch('/api/ai-image/social-media?action=get_connections');
      const connectionsData = await connectionsResponse.json();
      console.log('Connections data:', connectionsData);
      setConnections(connectionsData.connections || []);
    } catch (error) {
      console.error("Error fetching social media data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async () => {
    try {
      const response = await fetch('/api/ai-image/social-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: newPost.scheduledTime ? 'schedule_post' : 'post_now',
          ...newPost,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setIsPostDialogOpen(false);
        setNewPost({ platform: "", content: "", imageUrl: "", scheduledTime: "" });
        fetchSocialMediaData();
      }
    } catch (error) {
      console.error("Error posting to social media:", error);
    }
  };  const connectPlatform = async (platform: string) => {
    try {
      console.log(`Attempting to connect to ${platform}...`);
      setConnecting(platform);
      
      const response = await fetch('/api/ai-image/social-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'connect_platform',
          platform,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`Connection result:`, result);
      
      if (result.success) {
        console.log(`Successfully connected to ${platform}`);
        await fetchSocialMediaData();
      } else {
        console.error(`Failed to connect to ${platform}:`, result.message);
      }
    } catch (error) {
      console.error("Error connecting platform:", error);
    } finally {
      setConnecting(null);
    }
  };

  const disconnectPlatform = async (platform: string) => {
    try {
      const response = await fetch('/api/ai-image/social-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'disconnect_platform',
          platform,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        fetchSocialMediaData();
      }
    } catch (error) {
      console.error("Error disconnecting platform:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const totalMetrics = posts.reduce(
    (acc, post) => ({
      views: acc.views + post.metrics.views,
      likes: acc.likes + post.metrics.likes,
      shares: acc.shares + post.metrics.shares,
      comments: acc.comments + post.metrics.comments,
    }),
    { views: 0, likes: 0, shares: 0, comments: 0 }
  );

  const avgEngagementRate = posts.length > 0 
    ? posts.reduce((sum, post) => sum + post.metrics.engagementRate, 0) / posts.length 
    : 0;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Social Media Integration</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Social Media Post</DialogTitle>
                <DialogDescription>
                  Share your AI-generated image to social media platforms.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={newPost.platform} onValueChange={(value) => setNewPost({...newPost, platform: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {connections.filter(c => c.connected).map((connection) => (
                        <SelectItem key={connection.platform} value={connection.platform}>
                          {connection.platform.charAt(0).toUpperCase() + connection.platform.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Write your post content..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    placeholder="https://..."
                    value={newPost.imageUrl}
                    onChange={(e) => setNewPost({...newPost, imageUrl: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="scheduledTime">Schedule (Optional)</Label>
                  <Input
                    id="scheduledTime"
                    type="datetime-local"
                    value={newPost.scheduledTime}
                    onChange={(e) => setNewPost({...newPost, scheduledTime: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsPostDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePostSubmit} disabled={!newPost.platform || !newPost.content}>
                  <Send className="mr-2 h-4 w-4" />
                  {newPost.scheduledTime ? 'Schedule' : 'Post Now'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totalMetrics.views)}</div>
                <p className="text-xs text-muted-foreground">
                  Across all platforms
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totalMetrics.likes)}</div>
                <p className="text-xs text-muted-foreground">
                  Total engagement
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
                <Share2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totalMetrics.shares)}</div>
                <p className="text-xs text-muted-foreground">
                  Content shared
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgEngagementRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Engagement rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Posts</CardTitle>
              <CardDescription>Your latest social media posts</CardDescription>
            </CardHeader>
            <CardContent>
              {posts.slice(0, 5).map((post) => {
                const IconComponent = platformIcons[post.platform as keyof typeof platformIcons];
                return (
                  <div key={post.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${platformColors[post.platform as keyof typeof platformColors]}`}>
                        <IconComponent className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[300px]">{post.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {post.postedTime ? `Posted ${format(new Date(post.postedTime), 'MMM d, HH:mm')}` : 
                           post.scheduledTime ? `Scheduled for ${format(new Date(post.scheduledTime), 'MMM d, HH:mm')}` : 
                           'Draft'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(post.status)}>
                        {post.status}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {formatNumber(post.metrics.views)} views
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {['instagram', 'twitter', 'linkedin', 'facebook'].map((platform) => {
              const connection = connections.find(c => c.platform === platform);
              const IconComponent = platformIcons[platform as keyof typeof platformIcons];
              
              return (
                <Card key={platform}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`p-2 rounded-lg ${platformColors[platform as keyof typeof platformColors]}`}>
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>
                        <CardTitle className="text-lg capitalize">{platform}</CardTitle>
                      </div>
                      <Badge variant={connection?.connected ? "default" : "secondary"}>
                        {connection?.connected ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {connection?.connected ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{connection.accountName}</p>
                        <p className="text-xs text-muted-foreground">
                          Last sync: {connection.lastSync ? format(new Date(connection.lastSync), 'MMM d, HH:mm') : 'Never'}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => disconnectPlatform(platform)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    ) : (                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Connect your {platform} account to start posting
                        </p>                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => connectPlatform(platform)}
                          disabled={connecting === platform}
                        >
                          {connecting === platform ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            "Connect"
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          <div className="grid gap-4">
            {posts.map((post) => {
              const IconComponent = platformIcons[post.platform as keyof typeof platformIcons];
              return (
                <Card key={post.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${platformColors[post.platform as keyof typeof platformColors]}`}>
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}</CardTitle>
                          <CardDescription>
                            {post.postedTime ? `Posted ${format(new Date(post.postedTime), 'MMM d, yyyy HH:mm')}` : 
                             post.scheduledTime ? `Scheduled for ${format(new Date(post.scheduledTime), 'MMM d, yyyy HH:mm')}` : 
                             'Draft'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={getStatusColor(post.status)}>
                        {post.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">{post.content}</p>
                    
                    {post.imageUrl && (
                      <div className="w-full max-w-md">
                        <img 
                          src={post.imageUrl} 
                          alt="Post image" 
                          className="rounded-lg object-cover w-full h-48"
                        />
                      </div>
                    )}

                    {post.status === 'posted' && (
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span>{formatNumber(post.metrics.views)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="h-4 w-4 text-muted-foreground" />
                          <span>{formatNumber(post.metrics.likes)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Share2 className="h-4 w-4 text-muted-foreground" />
                          <span>{formatNumber(post.metrics.shares)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          <span>{formatNumber(post.metrics.comments)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Detailed analytics across all platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                <p>Detailed analytics coming soon...</p>
                <p className="text-sm">Track engagement, reach, and performance metrics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
