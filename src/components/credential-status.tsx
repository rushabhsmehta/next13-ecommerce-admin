import React from 'react';
import { AlertTriangle, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CredentialStatusProps {
  status: {
    configured: boolean;
    cloudApi: boolean;
    missing: string[];
  } | null;
}

export function CredentialStatus({ status }: CredentialStatusProps) {
  if (!status) return null;

  return (
    <div className="bg-card rounded-lg border p-4 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <h3 className="font-medium text-foreground">WhatsApp Integration Status</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {status.cloudApi ? (
            <CheckCircle className="w-4 h-4 text-success" />
          ) : (
            <XCircle className="w-4 h-4 text-destructive" />
          )}
          <span className="text-sm">WhatsApp Cloud API (Meta)</span>
        </div>
      </div>

      {!status.configured && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm text-warning-foreground">
                <strong>Setup Required:</strong> Configure WhatsApp Cloud API credentials for messaging functionality.
              </p>

              {status.missing.length > 0 && (
                <div>
                  <p className="text-xs text-warning mb-1">Missing environment variables:</p>
                  <ul className="text-xs text-warning space-y-0.5">
                    {status.missing.map((variable) => (
                      <li key={variable} className="ml-2">• {variable}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => window.open('https://developers.facebook.com/docs/whatsapp/cloud-api', '_blank')} className="text-xs h-7">
                  <ExternalLink className="w-3 h-3 mr-1" /> Cloud API Guide
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {status.configured && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-sm text-success font-medium">WhatsApp Cloud API is configured and ready to use!</span>
          </div>
        </div>
      )}
    </div>
  );
}
