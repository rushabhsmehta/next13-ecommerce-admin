"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Megaphone, Send } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Broadcast {
  id: string;
  title: string;
  body: string;
  recipientCount: number;
  ticketOkCount: number;
  ticketErrorCount: number;
  createdAt: string;
}

interface MarketingPushPanelProps {
  initialActiveDeviceCount: number;
  initialBroadcasts: Broadcast[];
}

export function MarketingPushPanel({
  initialActiveDeviceCount,
  initialBroadcasts,
}: MarketingPushPanelProps) {
  const [activeDeviceCount, setActiveDeviceCount] = useState(initialActiveDeviceCount);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(initialBroadcasts);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkPath, setLinkPath] = useState("");
  const [sending, setSending] = useState(false);

  const refreshStats = useCallback(async () => {
    try {
      const res = await axios.get("/api/push/broadcast");
      setActiveDeviceCount(res.data.activeDeviceCount ?? 0);
      setBroadcasts(res.data.broadcasts ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (
      !confirm(
        `Send this notification to ${activeDeviceCount} installed device(s)? This cannot be undone.`,
      )
    ) {
      return;
    }

    setSending(true);
    try {
      const res = await axios.post("/api/push/broadcast", {
        title: title.trim(),
        body: body.trim(),
        ...(linkPath.trim() ? { linkPath: linkPath.trim() } : {}),
      });
      toast.success(
        `Sent to ${res.data.recipientCount} device(s) (${res.data.ticketOkCount} accepted by Expo)`,
      );
      setTitle("");
      setBody("");
      setLinkPath("");
      await refreshStats();
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Failed to send broadcast";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Megaphone className="h-5 w-5" />
          Marketing push notifications
        </CardTitle>
        <CardDescription>
          Broadcast to all Aagam Holidays installs with notifications enabled — signed in or
          not. Active devices: <strong>{activeDeviceCount}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer sale — 20% off Goa packages"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Deep link (optional)</label>
            <Input
              value={linkPath}
              onChange={(e) => setLinkPath(e.target.value)}
              placeholder="/packages/goa-beach-escape"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Message</label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Short marketing message shown in the notification tray"
            rows={3}
            maxLength={500}
          />
        </div>
        <Button onClick={handleSend} disabled={sending || activeDeviceCount === 0}>
          <Send className="mr-2 h-4 w-4" />
          {sending ? "Sending…" : "Send to all devices"}
        </Button>
        {activeDeviceCount === 0 && (
          <p className="text-sm text-muted-foreground">
            No devices registered yet. Users must open the Aagam Holidays app at least once and
            allow notifications.
          </p>
        )}

        {broadcasts.length > 0 && (
          <div className="pt-2">
            <h4 className="mb-2 text-sm font-semibold">Recent broadcasts</h4>
            <ul className="space-y-2 text-sm">
              {broadcasts.map((b) => (
                <li
                  key={b.id}
                  className="rounded-md border px-3 py-2 text-muted-foreground"
                >
                  <div className="font-medium text-foreground">{b.title}</div>
                  <div className="line-clamp-2">{b.body}</div>
                  <div className="mt-1 text-xs">
                    {format(new Date(b.createdAt), "dd MMM yyyy, HH:mm")} · {b.recipientCount}{" "}
                    recipients · {b.ticketOkCount} delivered
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
