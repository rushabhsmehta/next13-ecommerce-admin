"use client";

import { InquiryColumn } from "./columns";
import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Phone, Calendar as CalendarIcon, MapPin, MessageCircle, UserRound } from "lucide-react";
import { parseISO, format, isSameDay } from 'date-fns';
import { CellAction } from "./cell-action";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as UiCalendar } from '@/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { toast } from "react-hot-toast";
import { CompactStaffAssignment } from "@/components/compact-staff-assignment";
import { useAssociatePartner } from "@/hooks/use-associate-partner";

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "HOT_QUERY", label: "Hot Query" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "QUERY_SENT", label: "Query Sent" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-100 text-green-800 hover:bg-green-200";
    case "CANCELLED":
      return "bg-red-100 text-red-800 hover:bg-red-200";
    case "HOT_QUERY":
      return "bg-orange-100 text-orange-800 hover:bg-orange-200";
    case "QUERY_SENT":
      return "bg-blue-100 text-blue-800 hover:bg-blue-200";
    default:
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
  }
};

interface MobileInquiryCardProps {
  data: InquiryColumn[];
  isAssociateUser?: boolean;
}

export const MobileInquiryCard: React.FC<MobileInquiryCardProps> = ({ data, isAssociateUser = false }) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const { user } = useUser();
  const { associatePartner } = useAssociatePartner();

  useEffect(() => {
    // nothing heavy here; kept for parity with older behavior
  }, [associatePartner]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const onStatusChange = async (inquiryId: string, newStatus: string) => {
    try {
      await axios.patch(`/api/inquiries/${inquiryId}/status`, { status: newStatus });
      toast.success("Status updated");
      window.location.reload();
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const openWhatsApp = (phoneNumber: string, customerName: string) => {
    const formatted = phoneNumber.replace(/\D/g, "");
    const msg = `Hello ${customerName}, this is regarding your travel inquiry with Aagam Holidays.`;
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!data || data.length === 0) {
    return <div className="text-center p-6 text-gray-500">No inquiries found. Create a new inquiry to get started.</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback>{user?.firstName?.charAt(0) ?? 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-col">
                  <span className="font-medium text-xs">{associatePartner?.name ?? `${user?.firstName ?? 'User'} ${user?.lastName ?? ''}`}</span>
                  <span className="text-xs text-muted-foreground">{isAssociateUser ? 'Associate Portal' : 'Admin Dashboard'}</span>
                </div>
              </div>
            </div>
            {!isAssociateUser && <NotificationBell />}
          </div>
        </CardContent>
      </Card>

      {data.map((inquiry) => {
        // compute display and whether next follow-up is today
        const iso = (inquiry as any).nextFollowUpDateIso as string | undefined;
        let nextDisplay = (inquiry as any).nextFollowUpDate as string | undefined;
        let isFollowUpToday = false;
        if (!nextDisplay && iso) {
          try {
            const d = parseISO(iso);
            nextDisplay = format(d, 'dd MMM yyyy');
            isFollowUpToday = isSameDay(d, new Date());
          } catch (e) {
            nextDisplay = new Date(iso).toLocaleDateString();
          }
        } else if (nextDisplay && iso) {
          try { isFollowUpToday = isSameDay(parseISO(iso), new Date()); } catch {}
        }

        return (
          <Card key={inquiry.id} className="overflow-hidden rounded-lg shadow-sm border">
            <CardContent className="p-0">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 ring-1 ring-slate-100 shadow-sm">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="text-xs">{inquiry.customerName?.charAt(0) ?? 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-base leading-tight mb-1">{inquiry.customerName}</h3>
                      <div className="flex items-center text-sm text-gray-500 gap-3">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-slate-700">{inquiry.customerMobileNumber}</span>
                        </div>
                        {inquiry.customerMobileNumber && isAssociateUser && (
                          <Button variant="ghost" size="sm" onClick={() => openWhatsApp(inquiry.customerMobileNumber, inquiry.customerName)} className="h-7 px-2 py-0 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-1"><path d="M17.472 14.382..."/></svg>
                            Chat
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ml-2">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                      {inquiry.status === 'PENDING' ? 'Pending' : inquiry.status === 'HOT_QUERY' ? 'Hot Query' : inquiry.status === 'CONFIRMED' ? 'Confirmed' : inquiry.status === 'QUERY_SENT' ? 'Query Sent' : 'Cancelled'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 items-start">
                  <div className="flex flex-col text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <span className="truncate text-sm text-slate-700">{inquiry.location}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <CalendarIcon className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-slate-700">{inquiry.journeyDate}</span>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Next Follow-up</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm mt-1 ${isFollowUpToday ? 'text-red-600' : ''}`}>{nextDisplay ?? 'Not set'}</span>

                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-[11px] px-2 py-1 rounded border bg-white">Change</button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-auto">
                          <div className="p-3">
                            <UiCalendar
                              mode="single"
                              selected={iso ? (() => { try { return parseISO(iso); } catch { return undefined } })() : undefined}
                              onSelect={(d: Date | undefined) => {
                                if (!d) return;
                                const apiDateOnly = format(d, 'yyyy-MM-dd');
                                fetch(`/api/inquiries/${inquiry.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ nextFollowUpDate: apiDateOnly })
                                }).then(res => {
                                  if (res.ok) window.location.reload(); else toast.error('Failed to update follow-up');
                                }).catch(() => toast.error('Failed to update follow-up'))
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 mt-4">
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-sm">{inquiry.associatePartner}</Badge>
                  <div className="flex items-center gap-2">
                    {inquiry.assignedStaffName && <span className="text-xs text-gray-600 mr-1 flex items-center"><UserRound className="h-3 w-3 mr-1 text-gray-600" />{inquiry.assignedStaffName}</span>}
                    <CompactStaffAssignment inquiryId={inquiry.id} assignedStaffId={inquiry.assignedToStaffId} onAssignmentComplete={() => { toast.success('Staff assignment updated'); window.location.reload(); }} />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="ml-2 p-1 rounded hover:bg-slate-100">⋯</button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => window.open(`/inquiries/${inquiry.id}/edit`, '_blank')}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => { if (!confirm('Delete this inquiry?')) return; fetch(`/api/inquiries/${inquiry.id}`, { method: 'DELETE' }).then(r => { if (r.ok) window.location.reload(); else toast.error('Delete failed') }).catch(() => toast.error('Delete failed')) }}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {expandedRows[inquiry.id] && (
                <div className="p-4 bg-gray-50">
                  {inquiry.assignedToStaffId && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium mb-2">Staff Assignment</h4>
                      <div className="text-xs p-2 bg-blue-50 border-l-2 border-blue-500 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="font-medium flex items-center"><UserRound className="h-3 w-3 mr-1" />{inquiry.assignedStaffName}</span>
                          {inquiry.assignedStaffAt && <span className="text-muted-foreground">Assigned: {new Date(inquiry.assignedStaffAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-2">Recent Actions</h4>
                    {inquiry.actionHistory && inquiry.actionHistory.length > 0 ? (
                      <div className="space-y-2">{inquiry.actionHistory.slice(0,2).map((action, idx) => (
                        <div key={idx} className={`text-xs rounded-md p-2 border-l-2 ${action.type === 'CALL' ? 'border-green-500 bg-green-50' : action.type === 'MESSAGE' ? 'border-blue-500 bg-blue-50' : action.type === 'EMAIL' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-500 bg-gray-50'}`}>
                          <div className="flex items-center justify-between gap-2"><span className="font-medium">{action.type}</span><span className="text-muted-foreground text-xs">{new Date(action.timestamp).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>
                          {action.remarks && <div className="text-muted-foreground mt-1 truncate">{action.remarks}</div>}
                        </div>
                      ))}</div>
                    ) : <div className="text-sm text-gray-500">No actions recorded</div>}
                  </div>

                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-2">Tour Package Queries</h4>
                    {inquiry.tourPackageQueries && inquiry.tourPackageQueries.length > 0 ? (
                      <ol className="list-decimal pl-4 text-sm">{inquiry.tourPackageQueries.map(q => <li key={q.id} className="my-1"><a href={`/tourPackageQuery/${q.id}`} className="text-blue-600 hover:underline truncate block">{q.tourPackageQueryName ?? 'Unnamed Package Query'}</a></li>)}</ol>
                    ) : <div className="text-sm text-gray-500">No queries created</div>}
                  </div>
                </div>
              )}

            </CardContent>

            <CardFooter className="flex justify-between px-4 py-2 bg-gray-100">
              <Button variant="ghost" size="sm" onClick={() => toggleRow(inquiry.id)} className="text-xs flex items-center gap-1">
                {expandedRows[inquiry.id] ? (<><span>Less info</span><ChevronUp className="h-3 w-3"/></>) : (<><span>More info</span><ChevronDown className="h-3 w-3"/></>)}
              </Button>

              <div className="flex items-center gap-2">
                <Select defaultValue={inquiry.status} onValueChange={(v)=> onStatusChange(inquiry.id, v)}>
                  <SelectTrigger className={`h-8 text-xs ${getStatusColor(inquiry.status)}`} style={{ minWidth: 110 }}><SelectValue placeholder="Change status"/></SelectTrigger>
                  <SelectContent>{statusOptions.map(s => <SelectItem key={s.value} value={s.value} className={s.value === 'CONFIRMED' ? 'text-green-600' : s.value === 'CANCELLED' ? 'text-red-600' : s.value === 'HOT_QUERY' ? 'text-orange-600' : s.value === 'QUERY_SENT' ? 'text-blue-600' : 'text-yellow-600'}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
                <CellAction data={inquiry} />
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};