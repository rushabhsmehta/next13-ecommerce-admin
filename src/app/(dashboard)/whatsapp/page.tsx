import Link from 'next/link';
import WhatsAppChat from '@/components/whatsapp-chat';
import { Button } from '@/components/ui/button';
import { MessageSquare, Settings } from 'lucide-react';

export default function WhatsAppPage() {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">WhatsApp Business</h2>
          <Link href="/whatsapp/templates">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Manage Templates
            </Button>
          </Link>
        </div>
        <WhatsAppChat />
      </div>
    </div>
  );
}
