import WhatsAppChat from '@/components/whatsapp-chat';

export default function WhatsAppPage() {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">WhatsApp Business</h2>
        </div>
        <WhatsAppChat />
      </div>
    </div>
  );
}
