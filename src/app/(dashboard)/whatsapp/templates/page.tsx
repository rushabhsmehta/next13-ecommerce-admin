import WhatsAppTemplateManager from "../../../../components/whatsapp-template-manager";

export default function WhatsAppTemplatesPage() {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">WhatsApp Templates</h2>
        </div>
        <WhatsAppTemplateManager />
      </div>
    </div>
  );
}
