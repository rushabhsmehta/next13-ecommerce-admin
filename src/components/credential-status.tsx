import React from 'react';
import { AlertTriangle, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CredentialStatusProps {
  status: {
    configured: boolean;
    twilio: boolean;
    whatsappApi: boolean;
    missing: string[];
  } | null;
}

export function CredentialStatus({ status }: CredentialStatusProps) {
  if (!status) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h3 className="font-medium text-gray-900">WhatsApp Integration Status</h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {status.twilio ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm">
            Twilio WhatsApp (Template Creation & Messaging)
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {status.whatsappApi ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm">
            WhatsApp Business API (Optional - Direct Meta Integration)
          </span>
        </div>
      </div>
      
      {!status.configured && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm text-orange-800">
                <strong>Setup Required:</strong> Configure Twilio credentials for WhatsApp functionality.
              </p>
              
              {status.missing.length > 0 && (
                <div>
                  <p className="text-xs text-orange-700 mb-1">Missing environment variables:</p>
                  <ul className="text-xs text-orange-700 space-y-0.5">
                    {status.missing
                      .filter(variable => variable.includes('twilio') || variable.includes('TWILIO'))
                      .map((variable) => (
                        <li key={variable} className="ml-2">• {variable}</li>
                      ))}
                  </ul>
                </div>
              )}
              
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open('/TWILIO_WHATSAPP_SETUP.md', '_blank')}
                  className="text-xs h-7"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Twilio Setup Guide
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {status.configured && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800 font-medium">
              Twilio WhatsApp is configured and ready to use!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
