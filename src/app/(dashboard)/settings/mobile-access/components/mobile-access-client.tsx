"use client";

import { Smartphone, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TokenRecord {
  userId: string;
  userName: string | null;
  pushToken: string | null;
  updatedAt: Date;
}

interface Props {
  tokenRecord: TokenRecord | null;
}

function timeAgo(date: Date | null) {
  if (!date) return "Never";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export const MobileAccessClient = ({ tokenRecord }: Props) => {
  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile App Status
          </CardTitle>
          <CardDescription>
            Sign in to the Aagam Holidays mobile app using your CRM Google account to access
            WhatsApp live chat on your phone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!tokenRecord ? (
            <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                No mobile session registered yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Open the Aagam Holidays app, tap <strong>Admin? Sign in with Google</strong>, and
                authenticate with your CRM email to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Admin</p>
                <p className="font-medium">{tokenRecord.userName ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last active</p>
                <p className="font-medium">{timeAgo(tokenRecord.updatedAt)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground mb-1">Push notifications</p>
                <Badge
                  variant={tokenRecord.pushToken ? "default" : "secondary"}
                >
                  {tokenRecord.pushToken ? (
                    <span className="flex items-center gap-1">
                      <Wifi className="h-3 w-3" /> Active — push alerts enabled
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <WifiOff className="h-3 w-3" /> Not registered — open the app to enable
                    </span>
                  )}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to log in</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Open the <strong>Aagam Holidays</strong> Android app.</li>
            <li>On the login screen, tap <strong>&quot;Admin? Sign in with Google&quot;</strong>.</li>
            <li>Select your CRM Google account — the same email you use here.</li>
            <li>The WhatsApp tab will appear automatically in the bottom navigation.</li>
            <li>Allow push notifications when prompted to receive alerts for new messages.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
