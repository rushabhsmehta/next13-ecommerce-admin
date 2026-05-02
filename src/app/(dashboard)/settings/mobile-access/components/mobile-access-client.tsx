"use client";

import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Copy, RefreshCw, Smartphone, Trash2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TokenRecord {
  id: string;
  label: string | null;
  userName: string | null;
  pushToken: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

interface Props {
  tokenRecord: TokenRecord | null;
}

function maskToken(token: string) {
  if (token.length <= 12) return "••••••••••••";
  return token.slice(0, 6) + "••••••••••••••••••••••••••" + token.slice(-6);
}

function timeAgo(date: Date | null) {
  if (!date) return "Never";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export const MobileAccessClient = ({ tokenRecord: initial }: Props) => {
  const [tokenRecord, setTokenRecord] = useState<TokenRecord | null>(initial);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateToken = async () => {
    try {
      setLoading(true);
      const res = await axios.post("/api/mobile/token", { label: "Mobile Admin" });
      const { token } = res.data;
      setRevealedToken(token);
      // Refresh token record
      const updated = await axios.get("/api/mobile/token");
      setTokenRecord(updated.data);
      toast.success("New token generated. Copy it now — it won't be shown again.");
    } catch {
      toast.error("Failed to generate token.");
    } finally {
      setLoading(false);
    }
  };

  const revokeToken = async () => {
    try {
      setLoading(true);
      await axios.delete("/api/mobile/token");
      setTokenRecord(null);
      setRevealedToken(null);
      toast.success("Token revoked. Mobile app will require re-login.");
    } catch {
      toast.error("Failed to revoke token.");
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (!revealedToken) return;
    navigator.clipboard.writeText(revealedToken);
    toast.success("Token copied to clipboard.");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Admin Mobile Token
          </CardTitle>
          <CardDescription>
            Use this token to log in to the Travel Android app as an admin. You will get
            access to the WhatsApp live chat tab on your phone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!tokenRecord ? (
            <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No token generated yet.</p>
              <Button onClick={generateToken} disabled={loading}>
                {loading ? "Generating…" : "Generate Token"}
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-muted p-4 font-mono text-sm break-all">
                {revealedToken ? revealedToken : maskToken("placeholder-for-display")}
              </div>

              {revealedToken && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={copyToken}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Token
                  </Button>
                  <p className="text-xs text-amber-600 font-medium">
                    Copy now — this token won&apos;t be shown again after you leave this page.
                  </p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Admin</p>
                  <p className="font-medium">{tokenRecord.userName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last used</p>
                  <p className="font-medium">{timeAgo(tokenRecord.lastUsedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Generated</p>
                  <p className="font-medium">{timeAgo(tokenRecord.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Push notifications</p>
                  <Badge
                    variant={tokenRecord.pushToken ? "default" : "secondary"}
                    className="mt-1"
                  >
                    {tokenRecord.pushToken ? (
                      <span className="flex items-center gap-1">
                        <Wifi className="h-3 w-3" /> Registered
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <WifiOff className="h-3 w-3" /> Not registered
                      </span>
                    )}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateToken}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={revokeToken}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Revoke
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to use</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Click <strong>Generate Token</strong> above and copy the token immediately.</li>
            <li>Open the <strong>Aagam Holidays</strong> Android app.</li>
            <li>On the login screen, switch to <strong>Admin Login</strong>.</li>
            <li>Enter your mobile number and paste the token into the Access Token field.</li>
            <li>Tap <strong>Sign In</strong> — a WhatsApp tab will appear in the bottom navigation.</li>
            <li>Allow push notifications when prompted to receive alerts for new messages.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
