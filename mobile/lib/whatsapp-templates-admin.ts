import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export interface TemplateButton {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phone_number?: string;
}

export interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT";
  text?: string;
  buttons?: TemplateButton[];
  example?: Record<string, any>;
}

export interface CreateTemplateInput {
  name: string;
  language: string;
  category: TemplateCategory;
  components: TemplateComponent[];
  allow_category_change?: boolean;
}

export interface CreateTemplateResponse {
  success: boolean;
  data: { id?: string };
  message?: string;
}

export interface TemplatePreviewInput {
  templateName: string;
  parameters?: {
    header?: string | string[];
    body?: string[];
    buttons?: Record<number, string[]>;
  };
}

export interface TemplatePreviewResponse {
  template: {
    id: string;
    name: string;
    language: string;
    status: string;
    category: string;
  };
  preview: string;
  required: { header?: string[]; body?: string[]; buttons?: any };
  validation: { valid: boolean; errors?: string[] } | null;
}

export function createWhatsAppTemplatesAdminClient(authRequest: AuthenticatedRequest) {
  return {
    create(input: CreateTemplateInput): Promise<CreateTemplateResponse> {
      return authRequest<CreateTemplateResponse>("/api/mobile/whatsapp/templates", {
        method: "POST",
        body: input,
      });
    },

    delete(name: string, id?: string) {
      const qs = id ? `?id=${encodeURIComponent(id)}` : "";
      return authRequest<{ success: boolean }>(
        `/api/mobile/whatsapp/templates/${encodeURIComponent(name)}${qs}`,
        { method: "DELETE" }
      );
    },

    preview(input: TemplatePreviewInput): Promise<TemplatePreviewResponse> {
      return authRequest<TemplatePreviewResponse>(
        "/api/mobile/whatsapp/templates/preview",
        { method: "POST", body: input }
      );
    },
  };
}

export type WhatsAppTemplatesAdminClient = ReturnType<
  typeof createWhatsAppTemplatesAdminClient
>;
