"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Image as ImageIcon,
  MapPin,
  User as UserIcon,
  FileText,
  Paperclip,
  ArrowLeft,
  Users,
  Smile,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  Phone,
} from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";

interface TravelUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface ChatMessage {
  id: string;
  chatGroupId: string;
  senderId: string;
  messageType: string;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  latitude: number | null;
  longitude: number | null;
  contactName: string | null;
  contactPhone: string | null;
  tourPackageId: string | null;
  createdAt: string;
  sender: TravelUser;
}

interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  tourStartDate: string | null;
  tourEndDate: string | null;
  myRole: string;
  members: {
    role: string;
    travelAppUser: TravelUser;
  }[];
  lastMessage: {
    content: string | null;
    messageType: string;
    createdAt: string;
    sender: { name: string };
  } | null;
}

export default function ChatPage() {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isMobileGroupList, setIsMobileGroupList] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch groups and extract current user ID from membership data
  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
        // Derive current user ID from the first group's membership
        if (data.groups.length > 0 && !currentUserId) {
          const meRes = await fetch("/api/chat/me");
          if (meRes.ok) {
            const meData = await meRes.json();
            setCurrentUserId(meData.userId);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Fetch messages for a group
  const fetchMessages = useCallback(async (groupId: string) => {
    try {
      const res = await fetch(`/api/chat/groups/${groupId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Poll for new messages when a group is active
  useEffect(() => {
    if (activeGroup) {
      fetchMessages(activeGroup.id);

      // Poll every 3 seconds
      pollingRef.current = setInterval(() => {
        fetchMessages(activeGroup.id);
      }, 3000);

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [activeGroup, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectGroup = (group: ChatGroup) => {
    setActiveGroup(group);
    setIsMobileGroupList(false);
    setMessages([]);
  };

  const handleSendMessage = async (
    messageType = "TEXT",
    extra: Record<string, any> = {}
  ) => {
    if (messageType === "TEXT" && !newMessage.trim()) return;
    if (!activeGroup) return;

    setSendingMessage(true);
    try {
      const body: Record<string, any> = {
        messageType,
        content: messageType === "TEXT" ? newMessage.trim() : extra.content,
        ...extra,
      };

      const res = await fetch(`/api/chat/groups/${activeGroup.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setNewMessage("");
        setShowAttachments(false);
        messageInputRef.current?.focus();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleSendMessage("LOCATION", {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          content: `📍 Location shared`,
        });
      },
      (err) => console.error("Geolocation error:", err)
    );
  };

  const getMessagePreview = (msg: ChatGroup["lastMessage"]) => {
    if (!msg) return "No messages yet";
    switch (msg.messageType) {
      case "IMAGE":
        return "📷 Photo";
      case "LOCATION":
        return "📍 Location";
      case "CONTACT":
        return "👤 Contact";
      case "TOUR_LINK":
        return "🔗 Tour Package";
      case "PDF":
        return "📄 Document";
      case "FILE":
        return "📎 File";
      default:
        return msg.content || "Message";
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    switch (msg.messageType) {
      case "IMAGE":
        return (
          <div className="space-y-1">
            {msg.content && (
              <p className="text-sm mb-2">{msg.content}</p>
            )}
            {msg.fileUrl && (
              <div className="relative w-64 h-48 rounded-lg overflow-hidden">
                <Image src={msg.fileUrl} alt="" fill className="object-cover" />
              </div>
            )}
          </div>
        );

      case "LOCATION":
        return (
          <div className="space-y-1">
            <p className="text-sm">📍 Location shared</p>
            {msg.latitude && msg.longitude && (
              <a
                href={`https://maps.google.com/?q=${msg.latitude},${msg.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 underline"
              >
                Open in Google Maps
              </a>
            )}
          </div>
        );

      case "CONTACT":
        return (
          <div className="bg-white/10 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              <span className="font-medium text-sm">{msg.contactName}</span>
            </div>
            {msg.contactPhone && (
              <p className="text-xs opacity-80">{msg.contactPhone}</p>
            )}
          </div>
        );

      case "TOUR_LINK":
        return (
          <div className="space-y-1">
            <p className="text-sm">🔗 Tour Package Link</p>
            {msg.tourPackageId && (
              <a
                href={`/travel/packages/${msg.tourPackageId}`}
                className="text-xs text-emerald-600 underline"
              >
                View Tour Package
              </a>
            )}
            {msg.content && <p className="text-sm">{msg.content}</p>}
          </div>
        );

      case "PDF":
      case "FILE":
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">
                {msg.fileName || "File"}
              </span>
            </div>
            {msg.fileUrl && (
              <a
                href={msg.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 underline"
              >
                Download
              </a>
            )}
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading your chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-gray-50">
      <div className="h-[calc(100vh-64px)] flex">
        {/* Group List Sidebar */}
        <div
          className={`${
            isMobileGroupList ? "flex" : "hidden"
          } md:flex flex-col w-full md:w-80 lg:w-96 bg-white border-r border-gray-200`}
        >
          {/* Groups Header */}
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-500" />
              Trip Chats
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Stay connected with your travel groups
            </p>
          </div>

          {/* Group List */}
          <div className="flex-1 overflow-y-auto">
            {groups.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-gray-700 font-medium mb-1">No chats yet</h3>
                <p className="text-gray-400 text-sm">
                  Chat groups will appear here when you&apos;re added to a tour group
                  by our team.
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleSelectGroup(group)}
                  className={`w-full flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                    activeGroup?.id === group.id ? "bg-emerald-50" : ""
                  }`}
                >
                  {/* Group Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                    {group.imageUrl ? (
                      <Image
                        src={group.imageUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {group.name}
                      </h3>
                      {group.lastMessage && (
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {format(new Date(group.lastMessage.createdAt), "HH:mm")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {group.lastMessage
                        ? `${group.lastMessage.sender.name}: ${getMessagePreview(group.lastMessage)}`
                        : "No messages yet"}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {group.members.length} members
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div
          className={`${
            !isMobileGroupList ? "flex" : "hidden"
          } md:flex flex-col flex-1`}
        >
          {activeGroup ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-200 shadow-sm">
                <button
                  onClick={() => setIsMobileGroupList(true)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-full"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">
                    {activeGroup.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {activeGroup.members.length} members •{" "}
                    <span className="capitalize">{activeGroup.myRole.toLowerCase()}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                  title="View Members"
                >
                  <Users className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Members Panel */}
              {showMembers && (
                <div className="bg-white border-b border-gray-200 p-4 max-h-48 overflow-y-auto">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Group Members</h4>
                  <div className="space-y-2">
                    {activeGroup.members.map((member) => (
                      <div key={member.travelAppUser.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          {member.travelAppUser.avatarUrl ? (
                            <Image
                              src={member.travelAppUser.avatarUrl}
                              alt=""
                              width={32}
                              height={32}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {member.travelAppUser.name}
                          </p>
                          <p className="text-xs text-gray-400 capitalize">
                            {member.role.toLowerCase()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-400">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const isOwn = currentUserId === msg.senderId;
                  const showSenderName =
                    idx === 0 || messages[idx - 1].senderId !== msg.senderId;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                        {showSenderName && !isOwn && (
                          <p className="text-xs text-gray-500 mb-1 ml-1">
                            {msg.sender.name}
                          </p>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2.5 ${
                            isOwn
                              ? "bg-emerald-500 text-white rounded-br-md"
                              : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md"
                          }`}
                        >
                          {renderMessage(msg)}
                          <p
                            className={`text-[10px] mt-1 ${
                              isOwn ? "text-emerald-100" : "text-gray-400"
                            }`}
                          >
                            {format(new Date(msg.createdAt), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Options */}
              {showAttachments && (
                <div className="bg-white border-t border-gray-100 p-3">
                  <div className="flex justify-center gap-6">
                    <button
                      onClick={handleShareLocation}
                      className="flex flex-col items-center gap-1 text-gray-600 hover:text-emerald-600"
                    >
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className="text-xs">Location</span>
                    </button>
                    <button
                      onClick={() => {
                        const name = prompt("Contact Name:");
                        const phone = prompt("Phone Number:");
                        if (name) {
                          handleSendMessage("CONTACT", {
                            contactName: name,
                            contactPhone: phone,
                            content: `👤 ${name}`,
                          });
                        }
                      }}
                      className="flex flex-col items-center gap-1 text-gray-600 hover:text-emerald-600"
                    >
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <Phone className="w-6 h-6 text-purple-600" />
                      </div>
                      <span className="text-xs">Contact</span>
                    </button>
                    <button
                      onClick={() => {
                        const pkgId = prompt("Tour Package ID or URL:");
                        if (pkgId) {
                          handleSendMessage("TOUR_LINK", {
                            tourPackageId: pkgId,
                            content: `🔗 Tour Package`,
                          });
                        }
                      }}
                      className="flex flex-col items-center gap-1 text-gray-600 hover:text-emerald-600"
                    >
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <LinkIcon className="w-6 h-6 text-emerald-600" />
                      </div>
                      <span className="text-xs">Tour Link</span>
                    </button>
                    <button
                      onClick={() => {
                        const url = prompt("File/Image URL:");
                        const name = prompt("File name (optional):") || "File";
                        if (url) {
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                          handleSendMessage(isImage ? "IMAGE" : "FILE", {
                            fileUrl: url,
                            fileName: name,
                            content: isImage ? "📷 Photo" : `📎 ${name}`,
                          });
                        }
                      }}
                      className="flex flex-col items-center gap-1 text-gray-600 hover:text-emerald-600"
                    >
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <Paperclip className="w-6 h-6 text-orange-600" />
                      </div>
                      <span className="text-xs">File</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-3">
                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                  <button
                    onClick={() => setShowAttachments(!showAttachments)}
                    className={`p-2.5 rounded-full transition-colors ${
                      showAttachments
                        ? "bg-emerald-100 text-emerald-600"
                        : "hover:bg-gray-100 text-gray-500"
                    }`}
                    title="Attachments"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <div className="flex-1 relative">
                    <textarea
                      ref={messageInputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-2.5 bg-gray-100 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                      style={{ maxHeight: "120px" }}
                    />
                  </div>
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={sendingMessage || !newMessage.trim()}
                    className="p-2.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send"
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-emerald-50">
              <div className="text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Trip Chat
                </h3>
                <p className="text-gray-500 max-w-sm">
                  Select a chat group to start messaging with your tour group and
                  operations team.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
