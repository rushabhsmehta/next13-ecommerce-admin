"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  FileText,
  Loader2,
  MapPin,
  Megaphone,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatSender = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type ChatMessage = {
  id: string;
  content: string | null;
  messageType: string;
  createdAt: string;
  senderId: string;
  sender: ChatSender | null;
  fileUrl?: string | null;
  fileName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  tourPackageId?: string | null;
  isDeleted?: boolean;
  isAnnouncement?: boolean;
  isImportant?: boolean;
};

interface ChatRoomClientProps {
  groupId: string;
  groupName: string;
  myUserId: string;
  chatListPath: string;
  packagesPath: string;
}

function formatMessageTime(iso: string) {
  try {
    return format(new Date(iso), "h:mm a");
  } catch {
    return "";
  }
}

function MessageBubble({
  msg,
  isMine,
  showSender,
  packagesPath,
}: {
  msg: ChatMessage;
  isMine: boolean;
  showSender: boolean;
  packagesPath: string;
}) {
  if (msg.isDeleted) {
    return (
      <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
        <div className="rounded-2xl bg-gray-100 px-4 py-2 text-sm italic text-gray-400">
          Message deleted
        </div>
      </div>
    );
  }

  let body: React.ReactNode = (
    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
  );

  switch (msg.messageType) {
    case "IMAGE":
      body = msg.fileUrl ? (
        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={msg.fileUrl}
            alt="Shared image"
            className="max-w-full rounded-lg max-h-64 object-cover"
          />
        </a>
      ) : (
        <p className="text-sm">Photo</p>
      );
      break;
    case "PDF":
    case "FILE":
      body = (
        <a
          href={msg.fileUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 text-sm underline-offset-2 hover:underline",
            isMine ? "text-white" : "text-orange-700"
          )}
        >
          <FileText className="w-4 h-4 shrink-0" />
          {msg.fileName || (msg.messageType === "PDF" ? "PDF document" : "File")}
        </a>
      );
      break;
    case "LOCATION":
      body =
        msg.latitude != null && msg.longitude != null ? (
          <a
            href={`https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 text-sm underline-offset-2 hover:underline",
              isMine ? "text-white" : "text-orange-700"
            )}
          >
            <MapPin className="w-4 h-4 shrink-0" />
            View on map
          </a>
        ) : (
          <p className="text-sm">Location</p>
        );
      break;
    case "TOUR_LINK":
      body = (
        <Link
          href={
            msg.tourPackageId
              ? `${packagesPath}/${msg.tourPackageId}`
              : packagesPath
          }
          className={cn(
            "text-sm font-medium underline-offset-2 hover:underline",
            isMine ? "text-white" : "text-orange-700"
          )}
        >
          View tour package →
        </Link>
      );
      break;
    default:
      break;
  }

  return (
    <div className={cn("flex flex-col gap-1", isMine ? "items-end" : "items-start")}>
      {showSender && !isMine && msg.sender?.name && (
        <span className="text-xs font-medium text-gray-500 px-1">{msg.sender.name}</span>
      )}
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
          isMine
            ? "bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-br-md"
            : "bg-white border border-gray-100 text-gray-900 rounded-bl-md",
          msg.isAnnouncement && "ring-2 ring-amber-300 bg-amber-50 text-amber-950",
          msg.isImportant && !isMine && "ring-2 ring-orange-200"
        )}
      >
        {msg.isAnnouncement && (
          <p className="flex items-center gap-1 text-xs font-semibold text-amber-700 mb-1">
            <Megaphone className="w-3 h-3" />
            Announcement
          </p>
        )}
        {body}
        <p
          className={cn(
            "text-[10px] mt-1 text-right",
            isMine && !msg.isAnnouncement ? "text-white/70" : "text-gray-400"
          )}
        >
          {formatMessageTime(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

export function ChatRoomClient({
  groupId,
  groupName,
  myUserId,
  chatListPath,
  packagesPath,
}: ChatRoomClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const markAsRead = useCallback(
    async (items: ChatMessage[]) => {
      const unreadIds = items
        .filter((m) => m.senderId !== myUserId && !m.isDeleted)
        .map((m) => m.id);
      if (!unreadIds.length) return;
      await fetch(`/api/chat/groups/${groupId}/messages/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: unreadIds }),
      }).catch(() => null);
    },
    [groupId, myUserId]
  );

  const fetchMessages = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const res = await fetch(`/api/chat/groups/${groupId}/messages?limit=80`);
        if (!res.ok) {
          throw new Error("Failed to load messages");
        }
        const data = await res.json();
        const items: ChatMessage[] = data.messages ?? [];
        setMessages(items);
        setError(null);
        void markAsRead(items);
        if (!opts?.silent) {
          requestAnimationFrame(() => scrollToBottom(false));
        }
      } catch {
        if (!opts?.silent) {
          setError("Could not load messages. Please try again.");
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [groupId, markAsRead, scrollToBottom]
  );

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    function startPolling() {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          void fetchMessages({ silent: true });
        }
      }, 5000);
    }

    startPolling();
    function onVisibility() {
      if (document.visibilityState === "visible") {
        void fetchMessages({ silent: true });
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchMessages]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom(true);
    }
  }, [loading, messages.length, scrollToBottom]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageType: "TEXT", content: text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to send message");
      }
      setDraft("");
      await fetchMessages({ silent: true });
      scrollToBottom(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  let lastSenderId: string | null = null;

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] max-w-3xl mx-auto">
      <header className="sticky top-16 z-40 flex items-center gap-3 border-b border-gray-100 bg-white/95 backdrop-blur px-4 py-3">
        <Link
          href={chatListPath}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-orange-50 text-gray-600 hover:text-orange-600 transition-colors"
          aria-label="Back to chats"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 truncate">{groupName}</h1>
          <p className="text-xs text-gray-400">Trip group chat</p>
        </div>
      </header>

      <div
        ref={bottomRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-orange-50/30 to-white"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <p className="text-gray-600 font-medium">No messages yet</p>
            <p className="text-sm text-gray-400">
              Say hello to your trip coordinator or fellow travellers.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === myUserId;
            const showSender = msg.senderId !== lastSenderId;
            lastSenderId = msg.senderId;
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMine={isMine}
                showSender={showSender}
                packagesPath={packagesPath}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <p className="px-4 py-2 text-sm text-red-600 bg-red-50 border-t border-red-100">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSend}
        className="sticky bottom-0 border-t border-gray-100 bg-white px-4 py-3 flex items-end gap-2"
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          rows={1}
          className="min-h-[44px] max-h-32 resize-none rounded-2xl"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend(e);
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!draft.trim() || sending}
          className="shrink-0 rounded-full h-11 w-11 bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          aria-label="Send message"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
