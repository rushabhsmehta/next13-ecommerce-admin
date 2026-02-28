"use client";

import { useCallback, useEffect, useState } from "react";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Filter, 
  ArrowDownUp, 
  Eye, 
  MoreHorizontal, 
  Search,
  UserCircle,
  Calendar,
  FileText,
  MapPin
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";

// Define interfaces
interface AuditLog {
  id: string;
  entityId: string;
  entityType: string;
  action: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  before?: any;
  after?: any;
  metadata?: any;
  createdAt: string;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
}

// Function to get a badge color based on action type
const getActionBadgeColor = (action: string) => {
  switch (action) {
    case "CREATE":
      return "bg-green-500 hover:bg-green-600";
    case "UPDATE":
      return "bg-blue-500 hover:bg-blue-600";
    case "DELETE":
      return "bg-red-500 hover:bg-red-600";
    default:
      return "bg-gray-500 hover:bg-gray-600";
  }
};

// Format date for display
const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), "MMM dd, yyyy HH:mm:ss");
  } catch (error) {
    return dateString;
  }
};

// Compare objects and get a list of changes
const getChangedFields = (before: any, after: any) => {
  if (!before || !after) return [];
  
  const changedFields: { field: string; oldValue: any; newValue: any }[] = [];
  
  // Get all unique keys from both objects
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  allKeys.forEach(key => {
    // Skip certain fields
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return;
    
    // Skip nested objects with IDs (likely relations)
    if (typeof before[key] === 'object' && before[key]?.id) return;
    if (typeof after[key] === 'object' && after[key]?.id) return;
    
    // Check if the field value changed
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changedFields.push({
        field: key,
        oldValue: before[key],
        newValue: after[key]
      });
    }
  });
  
  return changedFields;
};

const AuditLogsPage = () => {
  const router = useRouter();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>({ total: 0, limit: 10, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    // Fetch audit logs - wrapped in useCallback to prevent recreation on every render
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (entityTypeFilter) params.append('entityType', entityTypeFilter);
      if (actionFilter) params.append('action', actionFilter);
      params.append('limit', paginationInfo.limit.toString());
      params.append('offset', paginationInfo.offset.toString());
      
      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      
      const data = await response.json();
      
      // Filter logs by user role if selected
      let filteredLogs = data.auditLogs;
      if (userRoleFilter) {
        filteredLogs = filteredLogs.filter((log: AuditLog) => log.userRole === userRoleFilter);
      }
      
      // Filter logs by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredLogs = filteredLogs.filter((log: AuditLog) => 
          log.entityId.toLowerCase().includes(query) ||
          log.userName.toLowerCase().includes(query) ||
          log.userEmail.toLowerCase().includes(query) ||
          (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(query))
        );
      }
      
      setAuditLogs(filteredLogs);
      setPaginationInfo(data.pagination);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [entityTypeFilter, actionFilter, userRoleFilter, searchQuery, paginationInfo.limit, paginationInfo.offset]);
    // Initial fetch and fetch when filters change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, entityTypeFilter, actionFilter, userRoleFilter, paginationInfo.offset, paginationInfo.limit]);
  
  // Handle search
  const handleSearch = () => {
    fetchLogs();
  };
  
  // View original entity
  const viewEntity = (entityId: string, entityType: string) => {
    if (entityType === 'Inquiry') {
      router.push(`/inquiries/${entityId}`);
    }
    // Add more entity types as needed
  };
  
  // View log details
  const viewDetails = (log: AuditLog) => {
    setSelectedLog(log);
  };
  
  // Close details modal
  const closeDetails = () => {
    setSelectedLog(null);
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <div className="flex items-center justify-between">
          <Heading title="Audit Logs" description="Track changes to your data" />
        </div>
        <Separator />
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Entity Types</SelectItem>
                <SelectItem value="Inquiry">Inquiries</SelectItem>
                {/* Add more entity types as needed */}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="User Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="ASSOCIATE">Associate Partner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[220px]"
            />
            <Button onClick={handleSearch} size="sm">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
        
        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity History</CardTitle>
            <CardDescription>
              Track all changes made to your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.userName}</span>
                          <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.userRole === "ASSOCIATE" ? "destructive" : "default"}>
                          {log.userRole}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionBadgeColor(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.entityType}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {log.entityId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.metadata && (
                          <div className="text-sm">
                            {log.action === "UPDATE" && log.before && log.after ? (
                              <span>
                                {getChangedFields(log.before, log.after).length} field(s) changed
                              </span>
                            ) : log.action === "CREATE" ? (
                              <span>New {log.entityType.toLowerCase()} created</span>
                            ) : log.action === "DELETE" ? (
                              <span>{log.entityType} deleted</span>
                            ) : (
                              <span>View details</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => viewDetails(log)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {(log.action !== "DELETE") && (
                                <DropdownMenuItem onClick={() => viewEntity(log.entityId, log.entityType)}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  View {log.entityType}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {!loading && auditLogs.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {paginationInfo.offset + 1} to {Math.min(paginationInfo.offset + auditLogs.length, paginationInfo.total)} of {paginationInfo.total} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginationInfo.offset === 0}
                    onClick={() => setPaginationInfo(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginationInfo.offset + paginationInfo.limit >= paginationInfo.total}
                    onClick={() => setPaginationInfo(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Audit Log Details Dialog */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      <Badge className={`mr-2 ${getActionBadgeColor(selectedLog.action)}`}>
                        {selectedLog.action}
                      </Badge>
                      {selectedLog.entityType} Activity Details
                    </CardTitle>
                    <CardDescription>
                      {formatDate(selectedLog.createdAt)} by {selectedLog.userName} ({selectedLog.userRole})
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={closeDetails}>
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(80vh-150px)]">
                  <div className="space-y-6">
                    {/* User Information */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold flex items-center">
                        <UserCircle className="mr-2 h-5 w-5" />
                        User Information
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Name</p>
                          <p className="text-sm">{selectedLog.userName}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-sm">{selectedLog.userEmail}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Role</p>
                          <Badge variant={selectedLog.userRole === "ASSOCIATE" ? "destructive" : "default"}>
                            {selectedLog.userRole}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">User ID</p>
                          <p className="text-sm">{selectedLog.userId}</p>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Entity Information */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold flex items-center">
                        <FileText className="mr-2 h-5 w-5" />
                        Entity Information
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Type</p>
                          <p className="text-sm">{selectedLog.entityType}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">ID</p>
                          <p className="text-sm break-all">{selectedLog.entityId}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Action</p>
                          <Badge className={getActionBadgeColor(selectedLog.action)}>
                            {selectedLog.action}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Timestamp</p>
                          <p className="text-sm">{formatDate(selectedLog.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Metadata */}
                    {selectedLog.metadata && (
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Additional Information</h3>
                        <div className="bg-muted p-3 rounded-md">
                          <pre className="text-xs overflow-auto whitespace-pre-wrap">
                            {JSON.stringify(selectedLog.metadata, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {/* Changed Fields (for updates) */}
                    {selectedLog.action === "UPDATE" && selectedLog.before && selectedLog.after && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold">Changed Fields</h3>
                          <Tabs defaultValue="table" className="w-full">
                            <TabsList className="mb-2">
                              <TabsTrigger value="table">Table View</TabsTrigger>
                              <TabsTrigger value="json">JSON View</TabsTrigger>
                            </TabsList>
                            <TabsContent value="table">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Field</TableHead>
                                    <TableHead>Previous Value</TableHead>
                                    <TableHead>New Value</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {getChangedFields(selectedLog.before, selectedLog.after).map((change, i) => (
                                    <TableRow key={i}>
                                      <TableCell className="font-medium">
                                        {change.field}
                                      </TableCell>
                                      <TableCell className="max-w-[200px] break-words">
                                        {change.oldValue === null ? (
                                          <span className="text-muted-foreground italic">null</span>
                                        ) : typeof change.oldValue === 'object' ? (
                                          JSON.stringify(change.oldValue)
                                        ) : (
                                          String(change.oldValue)
                                        )}
                                      </TableCell>
                                      <TableCell className="max-w-[200px] break-words">
                                        {change.newValue === null ? (
                                          <span className="text-muted-foreground italic">null</span>
                                        ) : typeof change.newValue === 'object' ? (
                                          JSON.stringify(change.newValue)
                                        ) : (
                                          String(change.newValue)
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TabsContent>
                            <TabsContent value="json">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Previous State:</h4>
                                  <div className="bg-muted p-3 rounded-md">
                                    <pre className="text-xs overflow-auto max-h-[400px] whitespace-pre-wrap">
                                      {JSON.stringify(selectedLog.before, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium mb-2">New State:</h4>
                                  <div className="bg-muted p-3 rounded-md">
                                    <pre className="text-xs overflow-auto max-h-[400px] whitespace-pre-wrap">
                                      {JSON.stringify(selectedLog.after, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      </>
                    )}
                    
                    {/* Entity Data (for create/delete) */}
                    {selectedLog.action === "CREATE" && selectedLog.after && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">Created Entity Data</h3>
                          <div className="bg-muted p-3 rounded-md">
                            <pre className="text-xs overflow-auto max-h-[400px] whitespace-pre-wrap">
                              {JSON.stringify(selectedLog.after, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {selectedLog.action === "DELETE" && selectedLog.before && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">Deleted Entity Data</h3>
                          <div className="bg-muted p-3 rounded-md">
                            <pre className="text-xs overflow-auto max-h-[400px] whitespace-pre-wrap">
                              {JSON.stringify(selectedLog.before, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;