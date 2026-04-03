import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { prepareCampaignForDispatch } from "@/lib/whatsapp-campaign-worker";
import {
  checkWhatsAppMessagingWindow,
  sendWhatsAppMessage as sendWhatsAppMessageViaLib,
  sendWhatsAppTemplate as sendWhatsAppTemplateViaLib,
  sendInteractiveMessage,
  uploadWhatsAppMedia,
  uploadTemplateMediaHandle,
} from "@/lib/whatsapp";
import {
  createTourPackage,
  updateTourPackage,
  deleteTourPackage,
  syncTourPackageToMeta,
  syncPendingTourPackages,
  ensureCatalogReady,
  listTourPackages,
  type TourPackageInput,
  type TourPackageVariantInput,
} from "@/lib/whatsapp-catalog";
import { createTemplate as createWhatsAppTemplateViaLib, deleteTemplate as deleteWhatsAppTemplateViaLib, listTemplates as listWhatsAppTemplatesViaLib, type CreateTemplateRequest } from "@/lib/whatsapp-templates";
import {
  extractTemplateParameters,
  previewTemplate,
  searchTemplates,
  validateTemplateParameters,
  type WhatsAppTemplate,
} from "@/lib/whatsapp-templates";
import { z } from "zod";
import { McpError, NotFoundError } from "../lib/errors";
import type { ToolHandlerMap } from "../lib/schemas";

const SupportedMediaTypeSchema = z.enum(["image", "video", "audio", "document"]);

const MediaPayloadSchema = z
  .object({
    type: SupportedMediaTypeSchema,
    url: z.string().url().optional(),
    id: z.string().min(1).optional(),
    caption: z.string().optional(),
    filename: z.string().optional(),
  })
  .refine((value) => Boolean(value.url || value.id), {
    message: "Media requires either a URL or WhatsApp media id",
    path: ["url"],
  });

const SendWhatsAppMessageSchema = z
  .object({
    phoneNumber: z.string().min(1),
    message: z.string().optional(),
    checkWindow: z.boolean().optional().default(true),
    media: MediaPayloadSchema.optional(),
  })
  .refine((value) => Boolean((value.message && value.message.trim()) || value.media), {
    message: "Provide either a message or a media payload",
    path: ["message"],
  });

const SendWhatsAppMediaSchema = z.object({
  phoneNumber: z.string().min(1),
  mediaId: z.string().min(1),
  type: SupportedMediaTypeSchema,
  caption: z.string().optional(),
  filename: z.string().optional(),
  checkWindow: z.boolean().optional().default(true),
});

const TemplateHeaderParamsSchema = z
  .object({
    type: z.enum(["text", "image", "video", "document", "location"]),
    text: z.string().optional(),
    image: z.object({ link: z.string().url() }).optional(),
    video: z.object({ link: z.string().url() }).optional(),
    document: z
      .object({
        link: z.string().url(),
        filename: z.string().optional(),
      })
      .optional(),
    location: z
      .object({
        latitude: z.string(),
        longitude: z.string(),
        name: z.string().optional(),
        address: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "text" && !value.text?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Text headers require a non-empty text value",
        path: ["text"],
      });
    }

    if (value.type === "image" && !value.image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Image headers require an image.link",
        path: ["image"],
      });
    }

    if (value.type === "video" && !value.video) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Video headers require a video.link",
        path: ["video"],
      });
    }

    if (value.type === "document" && !value.document) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Document headers require a document.link",
        path: ["document"],
      });
    }

    if (value.type === "location" && !value.location) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Location headers require a location object with latitude and longitude",
        path: ["location"],
      });
    }
  });

const SendWhatsAppTemplateSchema = z.object({
  phoneNumber: z.string().min(1),
  templateName: z.string().min(1),
  languageCode: z.string().optional().default("en_US"),
  parameters: z.array(z.string()).optional(),
  headerParams: TemplateHeaderParamsSchema.optional(),
});

const UploadWhatsAppMediaSchema = z.object({
  url: z.string().url(),
  type: SupportedMediaTypeSchema,
  caption: z.string().optional(),
  fileName: z.string().optional(),
});

const TemplateCategorySchema = z.enum(["AUTHENTICATION", "MARKETING", "UTILITY"]);
const TemplateParameterFormatSchema = z.enum(["named", "positional"]);
const TemplateHeaderFormatSchema = z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION", "GIF"]);

const TemplateHeaderExampleSchema = z
  .object({
    header_text: z.array(z.string()).optional(),
    header_text_named_params: z
      .array(
        z.object({
          param_name: z.string().min(1),
          example: z.string().min(1),
        })
      )
      .optional(),
    header_handle: z.array(z.string()).optional(),
  })
  .partial()
  .passthrough()
  .optional();

const TemplateBodyExampleSchema = z
  .object({
    body_text: z.array(z.array(z.string())).optional(),
    body_text_named_params: z
      .array(
        z.object({
          param_name: z.string().min(1),
          example: z.string().min(1),
        })
      )
      .optional(),
  })
  .partial()
  .passthrough()
  .optional();

const TemplateHeaderComponentSchema = z.object({
  type: z.literal("HEADER"),
  format: TemplateHeaderFormatSchema,
  text: z.string().optional(),
  example: TemplateHeaderExampleSchema,
});

const TemplateBodyComponentSchema = z.object({
  type: z.literal("BODY"),
  text: z.string().min(1),
  example: TemplateBodyExampleSchema,
});

const TemplateFooterComponentSchema = z.object({
  type: z.literal("FOOTER"),
  text: z.string().optional(),
  code_expiration_minutes: z.number().int().min(1).max(90).optional(),
});

const TemplateAuthBodyComponentSchema = z.object({
  type: z.literal("BODY"),
  add_security_recommendation: z.boolean().optional(),
});

const TemplateButtonSchema = z.union([
  z.object({
    type: z.literal("QUICK_REPLY"),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal("PHONE_NUMBER"),
    text: z.string().min(1),
    phone_number: z.string().min(1),
  }),
  z.object({
    type: z.literal("URL"),
    text: z.string().min(1),
    url: z.string().min(1),
    example: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("COPY_CODE"),
    example: z.string().min(1),
  }),
  z.object({
    type: z.literal("FLOW"),
    text: z.string().min(1),
    flow_id: z.string().optional(),
    flow_name: z.string().optional(),
    flow_json: z.any().optional(),
    flow_action: z.enum(["navigate", "data_exchange"]).optional(),
    navigate_screen: z.string().optional(),
    icon: z.enum(["PROMOTION", "FEEDBACK", "SUPPORT"]).optional(),
  }),
  z.object({
    type: z.literal("OTP"),
    otp_type: z.enum(["COPY_CODE", "ONE_TAP", "ZERO_TAP"]),
    text: z.string().min(1),
    autofill_text: z.string().optional(),
    package_name: z.string().optional(),
    signature_hash: z.string().optional(),
  }),
  z.object({
    type: z.literal("VOICE_CALL"),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal("MPM"),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal("SPM"),
    text: z.string().min(1),
  }),
]);

const TemplateButtonsComponentSchema = z.object({
  type: z.literal("BUTTONS"),
  buttons: z.array(TemplateButtonSchema).min(1),
});

const TemplateComponentSchema = z.union([
  TemplateHeaderComponentSchema,
  TemplateBodyComponentSchema,
  TemplateAuthBodyComponentSchema,
  TemplateFooterComponentSchema,
  TemplateButtonsComponentSchema,
]);

const CreateWhatsAppTemplateSchema = z
  .object({
    name: z.string().regex(/^[a-z0-9_]+$/, {
      message: "Template name must contain only lowercase alphanumeric characters and underscores",
    }),
    language: z.string().min(1),
    category: TemplateCategorySchema,
    parameterFormat: TemplateParameterFormatSchema.optional(),
    parameter_format: TemplateParameterFormatSchema.optional(),
    allowCategoryChange: z.boolean().optional(),
    allow_category_change: z.boolean().optional(),
    components: z.array(TemplateComponentSchema).min(1),
  })
  .superRefine((value, ctx) => {
    if (!value.components.some((component) => component.type === "BODY")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Template must include a BODY component",
        path: ["components"],
      });
    }

    value.components.forEach((component, index) => {
      if (component.type === "HEADER" && ["IMAGE", "VIDEO", "DOCUMENT"].includes(component.format)) {
        const handleCount = component.example?.header_handle?.length ?? 0;
        if (!handleCount) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${component.format} header requires an example.header_handle value`,
            path: ["components", index, "example", "header_handle"],
          });
        }
      }
    });
  })
  .transform((value): CreateTemplateRequest => ({
    name: value.name,
    language: value.language,
    category: value.category,
    parameter_format: value.parameterFormat ?? value.parameter_format,
    allow_category_change: value.allowCategoryChange ?? value.allow_category_change,
    components: value.components as CreateTemplateRequest["components"],
  }));

const TemplatePreviewParametersSchema = z
  .object({
    header: z.union([z.string(), z.record(z.any())]).optional(),
    body: z.array(z.union([z.string(), z.number(), z.record(z.any())])).optional(),
    buttons: z.record(z.array(z.string())).optional(),
  })
  .optional();

const PreviewWhatsAppTemplateSchema = z.object({
  templateId: z.string().optional(),
  templateName: z.string().optional(),
  parameters: TemplatePreviewParametersSchema,
});

const PreviewWhatsAppTemplateFromComponentsShape = {
  name: z.string().regex(/^[a-z0-9_]+$/, {
    message: "Template name must contain only lowercase alphanumeric characters and underscores",
  }),
  language: z.string().min(1),
  category: TemplateCategorySchema,
  parameterFormat: TemplateParameterFormatSchema.optional(),
  parameter_format: TemplateParameterFormatSchema.optional(),
  allowCategoryChange: z.boolean().optional(),
  allow_category_change: z.boolean().optional(),
  components: z.array(TemplateComponentSchema).min(1),
  parameters: TemplatePreviewParametersSchema,
};

const ValidateWhatsAppTemplateShape = {
  name: PreviewWhatsAppTemplateFromComponentsShape.name,
  language: PreviewWhatsAppTemplateFromComponentsShape.language,
  category: PreviewWhatsAppTemplateFromComponentsShape.category,
  parameterFormat: PreviewWhatsAppTemplateFromComponentsShape.parameterFormat,
  parameter_format: PreviewWhatsAppTemplateFromComponentsShape.parameter_format,
  allowCategoryChange: PreviewWhatsAppTemplateFromComponentsShape.allowCategoryChange,
  allow_category_change: PreviewWhatsAppTemplateFromComponentsShape.allow_category_change,
  components: PreviewWhatsAppTemplateFromComponentsShape.components,
};

const PreviewWhatsAppTemplateFromComponentsSchema = z
  .object(PreviewWhatsAppTemplateFromComponentsShape)
  .superRefine((value, ctx) => {
    if (!value.components.some((component) => component.type === "BODY")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Template must include a BODY component",
        path: ["components"],
      });
    }

    value.components.forEach((component, index) => {
      if (component.type === "HEADER" && ["IMAGE", "VIDEO", "DOCUMENT"].includes(component.format)) {
        const handleCount = component.example?.header_handle?.length ?? 0;
        if (!handleCount) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${component.format} header requires an example.header_handle value`,
            path: ["components", index, "example", "header_handle"],
          });
        }
      }
    });
  });

const GenerateWhatsAppTemplateExampleShape = {
  name: PreviewWhatsAppTemplateFromComponentsShape.name,
  language: PreviewWhatsAppTemplateFromComponentsShape.language,
  category: PreviewWhatsAppTemplateFromComponentsShape.category,
  parameterFormat: PreviewWhatsAppTemplateFromComponentsShape.parameterFormat,
  parameter_format: PreviewWhatsAppTemplateFromComponentsShape.parameter_format,
  allowCategoryChange: PreviewWhatsAppTemplateFromComponentsShape.allowCategoryChange,
  allow_category_change: PreviewWhatsAppTemplateFromComponentsShape.allow_category_change,
  components: PreviewWhatsAppTemplateFromComponentsShape.components,
};

const GenerateWhatsAppTemplateExampleSchema = z.object(GenerateWhatsAppTemplateExampleShape).superRefine((value, ctx) => {
  if (!value.components.some((component) => component.type === "BODY")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Template must include a BODY component",
      path: ["components"],
    });
  }

  value.components.forEach((component, index) => {
    if (component.type === "HEADER" && ["IMAGE", "VIDEO", "DOCUMENT"].includes(component.format)) {
      const handleCount = component.example?.header_handle?.length ?? 0;
      if (!handleCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${component.format} header requires an example.header_handle value`,
          path: ["components", index, "example", "header_handle"],
        });
      }
    }
  });
});

const ValidateWhatsAppTemplateSchema = z.object(ValidateWhatsAppTemplateShape).superRefine((value, ctx) => {
  if (!value.components.some((component) => component.type === "BODY")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Template must include a BODY component",
      path: ["components"],
    });
  }

  value.components.forEach((component, index) => {
    if (component.type === "HEADER" && ["IMAGE", "VIDEO", "DOCUMENT"].includes(component.format)) {
      const handleCount = component.example?.header_handle?.length ?? 0;
      if (!handleCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${component.format} header requires an example.header_handle value`,
          path: ["components", index, "example", "header_handle"],
        });
      }
    }
  });
});

function formatTemplateDraftPreview(
  components: CreateTemplateRequest["components"],
  parameters?: {
    header?: string | Record<string, any>;
    body?: Array<string | number | Record<string, any>>;
    buttons?: Record<number, string[]>;
  }
) {
  const lines: string[] = [];

  for (const component of components) {
    if (component.type === "HEADER") {
      if ("text" in component && component.format === "TEXT") {
        let headerText = component.text;
        if (typeof parameters?.header === "string") {
          headerText = headerText.replace(/\{\{[^}]+\}\}/g, parameters.header);
        } else if (parameters?.header && typeof parameters.header === "object" && "text" in parameters.header) {
          headerText = headerText.replace(/\{\{[^}]+\}\}/g, String(parameters.header.text ?? ""));
        }
        lines.push(`[${headerText}]`, "");
      } else {
        const headerValue =
          typeof parameters?.header === "string"
            ? parameters.header
            : parameters?.header && typeof parameters.header === "object"
              ? JSON.stringify(parameters.header)
              : null;
        lines.push(
          `[${component.format} HEADER${headerValue ? `: ${headerValue}` : ""}]`,
          ""
        );
      }
      continue;
    }

    if (component.type === "BODY") {
      let bodyText = component.text;
      if (parameters?.body?.length) {
        parameters.body.forEach((value, index) => {
          const replacement = typeof value === "object" ? JSON.stringify(value) : String(value);
          bodyText = bodyText.replace(`{{${index + 1}}}`, replacement);
          bodyText = bodyText.replace(/\{\{([a-zA-Z0-9_]+)\}\}/, replacement);
        });
      }
      lines.push(bodyText, "");
      continue;
    }

    if (component.type === "FOOTER") {
      lines.push(`[${component.text}]`, "");
      continue;
    }

    if (component.type === "BUTTONS") {
      lines.push("Buttons:");
      component.buttons.forEach((button, index) => {
        if (button.type === "QUICK_REPLY") {
          lines.push(`  [${button.text}]`);
          return;
        }

        if (button.type === "PHONE_NUMBER") {
          lines.push(`  PHONE ${button.text}: ${button.phone_number}`);
          return;
        }

        if (button.type === "URL") {
          let url = button.url;
          if (parameters?.buttons?.[index]) {
            parameters.buttons[index].forEach((value) => {
              url = url.replace(/\{\{[^}]+\}\}/, value);
            });
          }
          lines.push(`  URL ${button.text}: ${url}`);
          return;
        }

        if (button.type === "COPY_CODE") {
          lines.push("  COPY_CODE");
          return;
        }

        if (button.type === "FLOW") {
          lines.push(`  FLOW ${button.text}`);
          return;
        }

        if (button.type === "OTP") {
          lines.push(`  OTP: ${button.text} (${button.otp_type})`);
          return;
        }

        if (button.type === "VOICE_CALL") {
          lines.push(`  VOICE_CALL: ${button.text}`);
          return;
        }

        if (button.type === "MPM") {
          lines.push(`  MPM: ${button.text} (Multi-Product)`);
          return;
        }

        if (button.type === "SPM") {
          lines.push(`  SPM: ${button.text} (Single-Product)`);
        }
      });
    }
  }

  return lines.join("\n").trim();
}

function generateTemplateExampleValues(components: CreateTemplateRequest["components"]) {
  const header: string | undefined = (() => {
    const headerComponent = components.find((component) => component.type === "HEADER");
    if (!headerComponent || headerComponent.type !== "HEADER") {
      return undefined;
    }

    if ("text" in headerComponent && headerComponent.format === "TEXT") {
      const matches = headerComponent.text.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g);
      const values = Array.from(matches, (match) => match[1]);
      return values[0] ?? "Sample";
    }

    if ("format" in headerComponent && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComponent.format)) {
      return "https://example.com/media";
    }

    return undefined;
  })();

  const body: string[] = [];
  const bodyComponent = components.find((component) => component.type === "BODY");
  if (bodyComponent && bodyComponent.type === "BODY") {
    const matches = Array.from(bodyComponent.text.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g), (match) => match[1]);
    const exampleFromComponent = bodyComponent.example?.body_text?.[0] ?? [];
    matches.forEach((paramName, index) => {
      body.push(exampleFromComponent[index] ?? `Sample ${paramName}`);
    });
  }

  const buttons: Record<number, string[]> = {};
  components.forEach((component) => {
    if (component.type !== "BUTTONS") {
      return;
    }

    component.buttons.forEach((button, index) => {
      if (button.type === "URL") {
        const matches = Array.from(button.url.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g), (match) => match[1]);
        if (matches.length > 0) {
          buttons[index] = matches.map((paramName) => `sample-${paramName.toLowerCase()}`);
        } else if (button.example?.length) {
          buttons[index] = [...button.example];
        }
      }
    });
  });

  return {
    ...(header ? { header } : {}),
    ...(body.length ? { body } : {}),
    ...(Object.keys(buttons).length ? { buttons } : {}),
  };
}

function formatLastInboundMessage(lastInboundMessage: any) {
  if (!lastInboundMessage) {
    return null;
  }

  return {
    id: lastInboundMessage.id,
    createdAt: lastInboundMessage.createdAt,
    message: lastInboundMessage.message,
    direction: lastInboundMessage.direction,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string | null | undefined, query: string) {
  if (!text) {
    return text ?? null;
  }

  const escaped = escapeRegExp(query);
  if (!escaped) {
    return text;
  }

  const regex = new RegExp(`(${escaped})`, "ig");
  return text.replace(regex, "**$1**");
}

function extractMessageAttachments(message: any) {
  const metadata = message?.metadata ?? {};
  const payload = message?.payload ?? {};
  const rawMessage = metadata.rawMessage ?? metadata.raw_message ?? payload?.messages?.[0] ?? payload;
  const attachments: Array<{
    type: string;
    mediaId: string | null;
    mediaUrl: string | null;
    caption: string | null;
    filename: string | null;
    mimeType: string | null;
    sha256: string | null;
  }> = [];

  const pushAttachment = (type: string, source: any, fallback: any = {}) => {
    if (!source && !fallback) {
      return;
    }

    const mediaId = source?.id ?? fallback?.id ?? null;
    const mediaUrl = source?.link ?? source?.url ?? fallback?.link ?? fallback?.url ?? null;
    const caption = source?.caption ?? fallback?.caption ?? null;
    const filename = source?.filename ?? fallback?.filename ?? null;
    const mimeType = source?.mime_type ?? source?.mimeType ?? fallback?.mime_type ?? fallback?.mimeType ?? null;
    const sha256 = source?.sha256 ?? fallback?.sha256 ?? null;

    if (!mediaId && !mediaUrl && !caption && !filename && !mimeType && !sha256) {
      return;
    }

    attachments.push({
      type,
      mediaId,
      mediaUrl,
      caption,
      filename,
      mimeType,
      sha256,
    });
  };

  pushAttachment("image", payload.image ?? rawMessage.image, metadata.media);
  pushAttachment("video", payload.video ?? rawMessage.video, metadata.media);
  pushAttachment("audio", payload.audio ?? rawMessage.audio, metadata.media);
  pushAttachment("document", payload.document ?? rawMessage.document, metadata.media);
  pushAttachment("sticker", payload.sticker ?? rawMessage.sticker, metadata.media);

  if (!attachments.length && metadata.media) {
    attachments.push({
      type: metadata.whatsappType || "media",
      mediaId: metadata.media.id ?? null,
      mediaUrl: metadata.media.url ?? null,
      caption: metadata.media.caption ?? null,
      filename: metadata.media.filename ?? null,
      mimeType: metadata.media.mimeType ?? null,
      sha256: metadata.media.sha256 ?? null,
    });
  }

  return attachments;
}

function formatAttachmentLabel(attachments: ReturnType<typeof extractMessageAttachments>) {
  if (!attachments.length) {
    return "";
  }

  return attachments
    .map((attachment) => {
      const parts = [attachment.type];
      if (attachment.filename) {
        parts.push(attachment.filename);
      }
      if (attachment.mediaUrl) {
        parts.push(attachment.mediaUrl);
      }
      return parts.join(": ");
    })
    .join(", ");
}

function formatConversationTranscript(messages: Array<{ direction: string; message: string | null; createdAt: Date; metadata?: any; payload?: any }>) {
  return messages
    .map((message) => {
      const timestamp = new Date(message.createdAt).toISOString();
      const label = message.direction === "inbound" ? "User" : "Business";
      const attachments = extractMessageAttachments(message);
      const attachmentLabel = formatAttachmentLabel(attachments);
      const baseBody = message.message?.trim() || "[no text]";
      const body = attachmentLabel ? `${baseBody} [${attachmentLabel}]` : baseBody;
      return `${timestamp} | ${label}: ${body}`;
    })
    .join("\n");
}

async function sendWhatsAppMessage(rawParams: unknown) {
  const { phoneNumber, message, media, checkWindow } = SendWhatsAppMessageSchema.parse(rawParams);

  if (checkWindow !== false) {
    const windowCheck = await checkWhatsAppMessagingWindow(phoneNumber);
    if (!windowCheck.canMessage) {
      throw new McpError(
        "Cannot send free-form WhatsApp messages outside the 24-hour window. Use a template instead.",
        "WHATSAPP_WINDOW_CLOSED",
        403,
        {
          canMessage: false,
          hoursRemaining: windowCheck.hoursRemaining ?? 0,
          lastInboundMessage: formatLastInboundMessage(windowCheck.lastInboundMessage),
          requiresTemplate: true,
        }
      );
    }
  }

  return sendWhatsAppMessageViaLib({
    to: phoneNumber,
    ...(message && message.trim() ? { message: message.trim() } : {}),
    ...(media
      ? {
          media: {
            type: media.type,
            url: media.url,
            id: media.id,
            caption: media.caption,
            filename: media.filename,
          },
        }
      : {}),
    saveToDb: true,
  });
}

async function sendWhatsAppMedia(rawParams: unknown) {
  const { phoneNumber, mediaId, type, caption, filename, checkWindow } = SendWhatsAppMediaSchema.parse(rawParams);

  if (checkWindow !== false) {
    const windowCheck = await checkWhatsAppMessagingWindow(phoneNumber);
    if (!windowCheck.canMessage) {
      throw new McpError(
        "Cannot send free-form WhatsApp messages outside the 24-hour window. Use a template instead.",
        "WHATSAPP_WINDOW_CLOSED",
        403,
        {
          canMessage: false,
          hoursRemaining: windowCheck.hoursRemaining ?? 0,
          lastInboundMessage: formatLastInboundMessage(windowCheck.lastInboundMessage),
          requiresTemplate: true,
        }
      );
    }
  }

  return sendWhatsAppMessageViaLib({
    to: phoneNumber,
    media: {
      id: mediaId,
      type,
      caption,
      filename,
    },
    saveToDb: true,
  });
}

async function sendWhatsAppTemplate(rawParams: unknown) {
  const { phoneNumber, templateName, languageCode, parameters, headerParams } =
    SendWhatsAppTemplateSchema.parse(rawParams);

  return sendWhatsAppTemplateViaLib({
    to: phoneNumber,
    templateName,
    languageCode,
    bodyParams: parameters,
    headerParams: headerParams as any,
    saveToDb: true,
  });
}

async function uploadWhatsAppMediaHandler(rawParams: unknown) {
  const { url, type, caption, fileName } = UploadWhatsAppMediaSchema.parse(rawParams);
  const data = await uploadWhatsAppMedia({
    url,
    type,
    caption,
    fileName,
  });

  return {
    success: true,
    mediaId: data.id,
    type,
    url,
    fileName: fileName ?? null,
  };
}

async function uploadWhatsAppTemplateMediaHandler(rawParams: unknown) {
  const schema = z.object({
    url: z.string().url(),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
  });
  const { url, fileName, mimeType } = schema.parse(rawParams);

  // Fetch the file from the public URL
  const response = await fetch(url);
  if (!response.ok) {
    throw new McpError(`Failed to fetch media from URL: ${response.status} ${response.statusText}`, "FETCH_ERROR", 400);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await uploadTemplateMediaHandle({
    buffer,
    fileName,
    mimeType,
  });

  return {
    success: true,
    handle: result.handle,
    fileName,
    mimeType,
    sizeBytes: buffer.length,
    usage: `Use this handle in template creation: { "type": "HEADER", "format": "DOCUMENT", "example": { "header_handle": ["${result.handle}"] } }`,
  };
}

async function sendWhatsAppProductMessageHandler(rawParams: unknown) {
  const schema = z.object({
    phoneNumber: z.string().min(1),
    body: z.string().min(1),
    catalogId: z.string().optional(),
    productRetailerId: z.string().min(1),
    footer: z.string().optional(),
  });
  const { phoneNumber, body, catalogId, productRetailerId, footer } = schema.parse(rawParams);

  const resolvedCatalogId = catalogId || process.env.WHATSAPP_CATALOG_ID;
  if (!resolvedCatalogId) {
    throw new McpError("No catalog ID provided and WHATSAPP_CATALOG_ID is not configured", "VALIDATION_ERROR", 422);
  }

  return sendInteractiveMessage({
    to: phoneNumber,
    interactive: {
      type: "product",
      body,
      footer,
      catalogId: resolvedCatalogId,
      productRetailerId,
    },
    saveToDb: true,
  });
}

async function sendWhatsAppProductListHandler(rawParams: unknown) {
  const schema = z.object({
    phoneNumber: z.string().min(1),
    body: z.string().min(1),
    headerText: z.string().optional(),
    catalogId: z.string().optional(),
    sections: z
      .array(
        z.object({
          title: z.string().min(1),
          productRetailerIds: z.array(z.string().min(1)).min(1),
        })
      )
      .min(1),
    footer: z.string().optional(),
  });
  const { phoneNumber, body, headerText, catalogId, sections, footer } = schema.parse(rawParams);

  const resolvedCatalogId = catalogId || process.env.WHATSAPP_CATALOG_ID;
  if (!resolvedCatalogId) {
    throw new McpError("No catalog ID provided and WHATSAPP_CATALOG_ID is not configured", "VALIDATION_ERROR", 422);
  }

  return sendInteractiveMessage({
    to: phoneNumber,
    interactive: {
      type: "product_list",
      body,
      footer,
      header: headerText ? { type: "text", text: headerText } : undefined,
      catalogId: resolvedCatalogId,
      sections: sections.map((section) => ({
        title: section.title,
        productItems: section.productRetailerIds.map((id) => ({
          productRetailerId: id,
        })),
      })),
    },
    saveToDb: true,
  });
}

async function createWhatsAppTemplateHandler(rawParams: unknown) {
  const parsed = CreateWhatsAppTemplateSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw new McpError("Invalid WhatsApp template payload", "VALIDATION_ERROR", 422, parsed.error.flatten());
  }

  const result = await createWhatsAppTemplateViaLib(parsed.data);
  return {
    success: true,
    message: "Template created successfully and submitted for review",
    data: result,
  };
}

async function previewWhatsAppTemplateHandler(rawParams: unknown) {
  const parsed = PreviewWhatsAppTemplateSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw new McpError("Invalid WhatsApp template preview payload", "VALIDATION_ERROR", 422, parsed.error.flatten());
  }

  const { templateId, templateName, parameters } = parsed.data;
  if (!templateId && !templateName) {
    throw new McpError('Provide either "templateId" or "templateName"', "VALIDATION_ERROR", 422);
  }

  let template: WhatsAppTemplate;
  if (templateId) {
    const maybeTemplate = await whatsappPrisma.whatsAppTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, name: true, language: true, status: true, category: true, components: true, quality_score: true } as any,
    });
    if (!maybeTemplate) {
      throw new NotFoundError(`Template not found: ${templateId}`);
    }
    template = maybeTemplate as unknown as WhatsAppTemplate;
  } else {
    const results = await searchTemplates({ name: templateName! });
    if (!results.length) {
      throw new NotFoundError(`Template not found: ${templateName}`);
    }
    template = results[0] as unknown as WhatsAppTemplate;
  }

  const required = extractTemplateParameters(template);
  if (parameters) {
    const validation = validateTemplateParameters(template, parameters as any);
    if (!validation.valid) {
      throw new McpError("Invalid parameters", "VALIDATION_ERROR", 422, { validation, required });
    }
  }

  const preview = previewTemplate(template, parameters as any);
  return {
    success: true,
    template: {
      id: template.id,
      name: template.name,
      language: template.language,
      status: template.status,
      category: template.category,
      quality: template.quality_score ?? null,
    },
    required,
    preview,
    components: template.components,
    sendPayload: {
      messaging_product: "whatsapp",
      to: "+1234567890",
      type: "template",
      template: {
        name: template.name,
        language: {
          code: template.language,
        },
      },
    },
  };
}

async function previewWhatsAppTemplateFromSavedHandler(rawParams: unknown) {
  return previewWhatsAppTemplateHandler(rawParams);
}

async function previewWhatsAppTemplateFromComponentsHandler(rawParams: unknown) {
  const parsed = PreviewWhatsAppTemplateFromComponentsSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw new McpError("Invalid WhatsApp template draft payload", "VALIDATION_ERROR", 422, parsed.error.flatten());
  }

  const { parameters, parameterFormat, parameter_format, allowCategoryChange, allow_category_change, ...templateInput } =
    parsed.data;
  const normalized = {
    ...templateInput,
    parameter_format: parameterFormat ?? parameter_format,
    allow_category_change: allowCategoryChange ?? allow_category_change,
  };

  const validatedTemplate = CreateWhatsAppTemplateSchema.parse(normalized);
  const template: WhatsAppTemplate = {
    id: "draft-preview",
    name: validatedTemplate.name,
    language: validatedTemplate.language,
    status: "PENDING",
    category: validatedTemplate.category,
    components: validatedTemplate.components as WhatsAppTemplate["components"],
    quality_score: undefined,
  };

  const required = extractTemplateParameters(template);
  if (parameters) {
    const validation = validateTemplateParameters(template, parameters as any);
    if (!validation.valid) {
      throw new McpError("Invalid parameters", "VALIDATION_ERROR", 422, { validation, required });
    }
  }

  return {
    success: true,
    template: {
      id: "draft-preview",
      name: template.name,
      language: template.language,
      status: "PENDING",
      category: template.category,
      quality: null,
    },
    required,
    preview: formatTemplateDraftPreview(template.components, parameters),
    components: template.components,
    sendPayload: {
      messaging_product: "whatsapp",
      to: "+1234567890",
      type: "template",
      template: {
        name: template.name,
        language: {
          code: template.language,
        },
      },
    },
  };
}

async function generateWhatsAppTemplateExampleHandler(rawParams: unknown) {
  const parsed = GenerateWhatsAppTemplateExampleSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw new McpError("Invalid WhatsApp template example payload", "VALIDATION_ERROR", 422, parsed.error.flatten());
  }

  const { parameters: _ignored, ...templateInput } = parsed.data as any;
  const template = {
    ...templateInput,
    id: "draft-example",
    status: "PENDING",
  } as WhatsAppTemplate;

  const required = extractTemplateParameters(template);
  const generated = generateTemplateExampleValues(template.components as CreateTemplateRequest["components"]);
  const preview = formatTemplateDraftPreview(template.components as CreateTemplateRequest["components"], generated);

  return {
    success: true,
    template: {
      name: template.name,
      language: template.language,
      category: template.category,
    },
    required,
    generated,
    preview,
    components: template.components,
  };
}

async function validateWhatsAppTemplateHandler(rawParams: unknown) {
  const parsed = ValidateWhatsAppTemplateSchema.safeParse(rawParams);
  if (!parsed.success) {
    return {
      success: true,
      valid: false,
      errors: parsed.error.flatten(),
    };
  }

  const templateRequest = CreateWhatsAppTemplateSchema.parse(parsed.data);
  const template: WhatsAppTemplate = {
    id: "draft-validation",
    name: templateRequest.name,
    language: templateRequest.language,
    status: "PENDING",
    category: templateRequest.category,
    components: templateRequest.components as WhatsAppTemplate["components"],
    quality_score: undefined,
  };

  const required = extractTemplateParameters(template);
  return {
    success: true,
    valid: true,
    errors: [],
    required,
    template: {
      name: template.name,
      language: template.language,
      category: template.category,
      components: template.components,
    },
    normalized: templateRequest,
  };
}

async function listWhatsAppTemplateSchemaHandler() {
  return {
    success: true,
    name: "WhatsApp Template Create Schema",
    required: ["name", "language", "category", "components"],
    allowedCategories: ["AUTHENTICATION", "MARKETING", "UTILITY"],
    allowedHeaderFormats: ["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION", "GIF"],
    allowedButtonTypes: [
      "QUICK_REPLY",
      "PHONE_NUMBER",
      "URL",
      "COPY_CODE",
      "FLOW",
      "OTP",
      "VOICE_CALL",
      "MPM",
      "SPM",
    ],
    parameterFormat: ["named", "positional"],
    rules: [
      "Template name must use lowercase letters, numbers, and underscores only.",
      "A template must include at least one BODY component.",
      "Media headers require example.header_handle.",
      "FLOW and OTP buttons are supported.",
    ],
    componentReference: {
      HEADER: {
        format: ["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"],
        example: {
          TEXT: { header_text: ["Example"] },
          IMAGE: { header_handle: ["https://example.com/image.jpg"] },
          VIDEO: { header_handle: ["https://example.com/video.mp4"] },
          DOCUMENT: { header_handle: ["https://example.com/file.pdf"] },
        },
      },
      BODY: {
        text: "Body text with {{1}} or named placeholders",
        example: { body_text: [["John", "99.99"]] },
      },
      FOOTER: {
        text: "Optional footer text",
      },
      BUTTONS: {
        types: ["QUICK_REPLY", "PHONE_NUMBER", "URL", "COPY_CODE", "FLOW", "OTP", "VOICE_CALL", "MPM", "SPM"],
      },
    },
    examples: {
      simple_text: {
        name: "hello_world",
        language: "en_US",
        category: "UTILITY",
        components: [{ type: "BODY", text: "Hello! Welcome." }],
      },
      media_header: {
        name: "trip_confirmation",
        language: "en_US",
        category: "UTILITY",
        components: [
          {
            type: "HEADER",
            format: "IMAGE",
            example: {
              header_handle: ["https://example.com/image.jpg"],
            },
          },
          {
            type: "BODY",
            text: "Your trip to {{1}} is confirmed.",
            example: {
              body_text: [["Goa"]],
            },
          },
        ],
      },
      flow_button: {
        name: "booking_flow",
        language: "en_US",
        category: "UTILITY",
        components: [
          { type: "BODY", text: "Book your appointment now!" },
          {
            type: "BUTTONS",
            buttons: [
              {
                type: "FLOW",
                text: "Book Now",
                flow_action: "navigate",
                navigate_screen: "BOOKING_SCREEN",
              },
            ],
          },
        ],
      },
    },
  };
}

const ListWhatsAppCampaignsSchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

const GetWhatsAppCampaignSchema = z.object({
  campaignId: z.string().min(1),
});

const GetWhatsAppCampaignStatsSchema = z.object({
  campaignId: z.string().min(1),
});

const SendWhatsAppCampaignSchema = z.object({
  campaignId: z.string().min(1),
});

const ListWhatsAppCustomersSchema = z.object({
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
  tag: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

const ListWhatsAppTemplatesSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
});

const DeleteWhatsAppTemplateSchema = z.object({
  name: z.string().min(1).describe("Template name to delete"),
  hsm_id: z.string().optional().describe("Optional template ID for deleting a specific template version"),
});

const ListWhatsAppMessagesSchema = z.object({
  phoneNumber: z.string().optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  skip: z.number().int().min(0).optional().default(0),
});

const GetWhatsAppConversationSchema = z.object({
  phoneNumber: z.string().min(1),
  limit: z.number().int().min(1).max(200).optional().default(100),
  skip: z.number().int().min(0).optional().default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const GetWhatsAppConversationSummarySchema = z.object({
  phoneNumber: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional().default(10),
  transcriptFormat: z.enum(["lines", "bullets", "markdown"]).optional().default("lines"),
  sinceDate: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const SearchWhatsAppMessagesSchema = z.object({
  query: z.string().min(1),
  phoneNumber: z.string().optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  limit: z.number().int().min(1).max(100).optional().default(25),
  skip: z.number().int().min(0).optional().default(0),
});

async function listWhatsAppCampaigns(rawParams: unknown) {
  const { status, limit } = ListWhatsAppCampaignsSchema.parse(rawParams);
  return whatsappPrisma.whatsAppCampaign.findMany({
    where: {
      ...(status && { status }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      templateName: true,
      status: true,
      scheduledFor: true,
      startedAt: true,
      completedAt: true,
      totalRecipients: true,
      sentCount: true,
      deliveredCount: true,
      readCount: true,
      failedCount: true,
      respondedCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function getWhatsAppCampaign(rawParams: unknown) {
  const { campaignId } = GetWhatsAppCampaignSchema.parse(rawParams);
  const campaign = await whatsappPrisma.whatsAppCampaign.findUnique({
    where: { id: campaignId },
    include: {
      recipients: {
        select: {
          id: true,
          phoneNumber: true,
          name: true,
          status: true,
          sentAt: true,
          deliveredAt: true,
          readAt: true,
          failedAt: true,
          errorMessage: true,
          respondedAt: true,
          responseMessage: true,
        },
        take: 100,
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!campaign) throw new NotFoundError(`Campaign ${campaignId} not found`);
  return campaign;
}

function getCampaignErrorDescription(code: string): string {
  const errorMap: Record<string, string> = {
    "131049": "Per-user marketing limit reached",
    "131050": "User stopped marketing messages",
    "131047": "24-hour messaging window expired",
    "131026": "Message undeliverable",
    "100": "Invalid template or parameters",
    "130472": "User number is part of an experiment",
    "131051": "Unsupported message type",
    "133010": "Message failed to send",
  };

  return errorMap[code] || "Unknown error";
}

async function getWhatsAppCampaignStats(rawParams: unknown) {
  const { campaignId } = GetWhatsAppCampaignStatsSchema.parse(rawParams);

  const campaign = await whatsappPrisma.whatsAppCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    throw new NotFoundError(`Campaign ${campaignId} not found`);
  }

  const recipientStats = await whatsappPrisma.whatsAppCampaignRecipient.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: true,
  });

  const stats = {
    pending: 0,
    sending: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    opted_out: 0,
    responded: 0,
    retry: 0,
  };

  recipientStats.forEach((stat: any) => {
    stats[stat.status as keyof typeof stats] = stat._count;
  });

  const errorBreakdown = await whatsappPrisma.whatsAppCampaignRecipient.groupBy({
    by: ["errorCode"],
    where: {
      campaignId,
      status: "failed",
    },
    _count: true,
  });

  const errors = errorBreakdown
    .filter((item: any) => item.errorCode)
    .map((item: any) => ({
      code: item.errorCode,
      count: item._count,
      description: getCampaignErrorDescription(item.errorCode!),
    }));

  const total = campaign.totalRecipients;
  const sent = stats.sent + stats.delivered + stats.read + stats.responded;
  const delivered = stats.delivered + stats.read + stats.responded;
  const read = stats.read + stats.responded;

  const deliveryRate = total > 0 && sent > 0 ? ((delivered / sent) * 100).toFixed(2) : "0.00";
  const readRate = delivered > 0 ? ((read / delivered) * 100).toFixed(2) : "0.00";
  const responseRate = read > 0 ? ((stats.responded / read) * 100).toFixed(2) : "0.00";
  const failureRate = total > 0 ? ((stats.failed / total) * 100).toFixed(2) : "0.00";

  const sentOverTime = await whatsappPrisma.whatsAppCampaignRecipient.groupBy({
    by: ["sentAt"],
    where: {
      campaignId,
      status: { in: ["sent", "delivered", "read", "responded"] },
    },
    _count: true,
    orderBy: { sentAt: "asc" },
  });

  let duration: string | null = null;
  if (campaign.startedAt) {
    const endTime = campaign.completedAt || new Date();
    const durationMs = endTime.getTime() - campaign.startedAt.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    duration = `${hours}h ${minutes}m`;
  }

  const failedRecipients = await whatsappPrisma.whatsAppCampaignRecipient.findMany({
    where: {
      campaignId,
      status: "failed",
    },
    take: 10,
    select: {
      phoneNumber: true,
      errorCode: true,
      errorMessage: true,
      failedAt: true,
    },
    orderBy: { failedAt: "desc" },
  });

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      templateName: campaign.templateName,
      scheduledFor: campaign.scheduledFor,
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
      duration,
    },
    stats: {
      total,
      ...stats,
    },
    metrics: {
      deliveryRate: `${deliveryRate}%`,
      readRate: `${readRate}%`,
      responseRate: `${responseRate}%`,
      failureRate: `${failureRate}%`,
    },
    errors,
    failedRecipients,
    timeline: sentOverTime.map((item: any) => ({
      timestamp: item.sentAt,
      count: item._count,
    })),
  };
}

async function sendWhatsAppCampaign(rawParams: unknown) {
  const { campaignId } = SendWhatsAppCampaignSchema.parse(rawParams);

  try {
    const prepared = await prepareCampaignForDispatch(campaignId);

    return {
      success: true,
      campaignId: prepared.campaignId,
      recipientsCount: prepared.recipientsCount,
      mode: prepared.mode,
      queued: true,
      message: "Campaign queued for WhatsApp worker processing",
    };
  } catch (error: any) {
    const message = error?.message || "Failed to queue campaign";
    const statusHint =
      message === "Campaign not found"
        ? 404
        : message === "Campaign cannot be sent in current status" ||
          message === "Campaign has no recipients to send"
        ? 400
        : 500;

    throw new McpError(message, "WHATSAPP_CAMPAIGN_QUEUE_FAILED", statusHint);
  }
}

async function listWhatsAppCustomers(rawParams: unknown) {
  const { name, phoneNumber, tag, limit } = ListWhatsAppCustomersSchema.parse(rawParams);
  return whatsappPrisma.whatsAppCustomer.findMany({
    where: {
      ...(name && {
        OR: [
          { firstName: { contains: name, mode: "insensitive" as const } },
          { lastName: { contains: name, mode: "insensitive" as const } },
        ],
      }),
      ...(phoneNumber && { phoneNumber: { contains: phoneNumber } }),
      ...(tag && { tags: { has: tag } }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      email: true,
      tags: true,
      isOptedIn: true,
      lastContactedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function listWhatsAppTemplates(rawParams: unknown) {
  const { limit } = ListWhatsAppTemplatesSchema.parse(rawParams);
  const result = await listWhatsAppTemplatesViaLib({ limit });
  return {
    success: true,
    count: result.data.length,
    templates: result.data.map((t) => ({
      id: t.id,
      name: t.name,
      language: t.language,
      status: t.status,
      category: t.category,
      components: t.components,
      rejected_reason: t.rejected_reason,
      quality_score: t.quality_score,
      last_updated_time: t.last_updated_time,
    })),
  };
}

async function deleteWhatsAppTemplate(rawParams: unknown) {
  const { name, hsm_id } = DeleteWhatsAppTemplateSchema.parse(rawParams);
  const result = await deleteWhatsAppTemplateViaLib(name, hsm_id);
  return { success: result.success, message: `Template "${name}" deleted successfully` };
}

async function listWhatsAppMessages(rawParams: unknown) {
  const { phoneNumber, direction, startDate, endDate, limit, skip } = ListWhatsAppMessagesSchema.parse(rawParams);

  const phoneDigits = phoneNumber ? phoneNumber.replace(/\D/g, "") : null;
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const messages = await whatsappPrisma.whatsAppMessage.findMany({
    where: {
      ...(direction ? { direction } : {}),
      ...(phoneDigits
        ? {
            OR: [
              { to: { contains: phoneDigits } },
              { from: { contains: phoneDigits } },
              { messageSid: { contains: phoneDigits } },
            ],
          }
        : {}),
      ...(start || end
        ? {
            createdAt: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {}),
            },
          }
        : {}),
    },
    include: {
      session: true,
      whatsappCustomer: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip,
  });

  return {
    success: true,
    count: messages.length,
    messages: messages.map((message) => ({
      ...message,
      attachments: extractMessageAttachments(message),
    })),
  };
}

async function getWhatsAppConversation(rawParams: unknown) {
  const { phoneNumber, limit, skip, startDate, endDate } = GetWhatsAppConversationSchema.parse(rawParams);
  const phoneDigits = phoneNumber.replace(/\D/g, "");
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const messages = await whatsappPrisma.whatsAppMessage.findMany({
    where: {
      OR: [
        { to: { contains: phoneDigits } },
        { from: { contains: phoneDigits } },
      ],
      ...(start || end
        ? {
            createdAt: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {}),
            },
          }
        : {}),
    },
    include: {
      session: true,
      whatsappCustomer: true,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    skip,
  });

  const inboundCount = messages.filter((message) => message.direction === "inbound").length;
  const outboundCount = messages.filter((message) => message.direction === "outbound").length;
  const lastMessage = messages[messages.length - 1] ?? null;

  return {
    success: true,
    phoneNumber: phoneDigits,
    count: messages.length,
    inboundCount,
    outboundCount,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          direction: lastMessage.direction,
          message: lastMessage.message,
          createdAt: lastMessage.createdAt,
          status: lastMessage.status,
        }
      : null,
    messages,
    transcript: formatConversationTranscript(messages),
  };
}

async function getWhatsAppConversationSummary(rawParams: unknown) {
  const { phoneNumber, limit, transcriptFormat, sinceDate, startDate, endDate } =
    GetWhatsAppConversationSummarySchema.parse(rawParams);
  const phoneDigits = phoneNumber.replace(/\D/g, "");
  const lowerBoundDate = startDate ?? sinceDate;
  const start = lowerBoundDate ? new Date(lowerBoundDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const messages = await whatsappPrisma.whatsAppMessage.findMany({
    where: {
      OR: [{ to: { contains: phoneDigits } }, { from: { contains: phoneDigits } }],
      ...(start || end
        ? {
            createdAt: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const inboundCount = messages.filter((message) => message.direction === "inbound").length;
  const outboundCount = messages.filter((message) => message.direction === "outbound").length;
  const latestInbound = messages.find((message) => message.direction === "inbound") ?? null;
  const latestOutbound = messages.find((message) => message.direction === "outbound") ?? null;
  const firstMessage = messages[messages.length - 1] ?? null;
  const lastMessage = messages[0] ?? null;
  const transcriptLines = [...messages]
    .reverse()
    .map((message) => {
      const timestamp = new Date(message.createdAt).toISOString();
      const label = message.direction === "inbound" ? "User" : "Business";
      const body = message.message?.trim() || "[no text]";
      if (transcriptFormat === "bullets") {
        return `- ${timestamp} | ${label}: ${body}`;
      }
      if (transcriptFormat === "markdown") {
        return `- **${timestamp}** | **${label}**: ${body}`;
      }
      return `${timestamp} | ${label}: ${body}`;
    });

  return {
    success: true,
    phoneNumber: phoneDigits,
    sinceDate: sinceDate ?? null,
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    totalFetched: messages.length,
    firstMessageAt: firstMessage?.createdAt ?? null,
    lastMessageAt: lastMessage?.createdAt ?? null,
    inboundCount,
    outboundCount,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          direction: lastMessage.direction,
          message: lastMessage.message,
          createdAt: lastMessage.createdAt,
          status: lastMessage.status,
        }
      : null,
    latestInbound: latestInbound
      ? {
          id: latestInbound.id,
          message: latestInbound.message,
          createdAt: latestInbound.createdAt,
          status: latestInbound.status,
        }
      : null,
    latestOutbound: latestOutbound
      ? {
          id: latestOutbound.id,
          message: latestOutbound.message,
          createdAt: latestOutbound.createdAt,
          status: latestOutbound.status,
        }
      : null,
    recentMessages: messages.map((message) => ({
      id: message.id,
      direction: message.direction,
      message: message.message,
      createdAt: message.createdAt,
      status: message.status,
      attachments: extractMessageAttachments(message),
    })),
    transcriptFormat,
    transcript: transcriptLines.join("\n"),
  };
}

async function searchWhatsAppMessages(rawParams: unknown) {
  const { query, phoneNumber, direction, limit, skip } = SearchWhatsAppMessagesSchema.parse(rawParams);
  const phoneDigits = phoneNumber ? phoneNumber.replace(/\D/g, "") : null;

  const filters: any[] = [
    {
      OR: [
        { message: { contains: query, mode: "insensitive" } },
        { from: { contains: query } },
        { to: { contains: query } },
        { messageSid: { contains: query } },
      ],
    },
  ];

  if (direction) {
    filters.push({ direction });
  }

  const messages = await whatsappPrisma.whatsAppMessage.findMany({
    where: {
      ...(phoneDigits
        ? {
            AND: [{ OR: [{ to: { contains: phoneDigits } }, { from: { contains: phoneDigits } }] }, ...filters],
          }
        : {
            AND: filters,
          }),
    },
    include: {
      session: true,
      whatsappCustomer: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip,
  });

  return {
    success: true,
    query,
    count: messages.length,
    messages: messages.map((message) => ({
      ...message,
      highlightedMessage: highlightText(message.message, query),
      highlightedFrom: highlightText(message.from, query),
      highlightedTo: highlightText(message.to, query),
      highlightedMessageSid: highlightText(message.messageSid, query),
    })),
  };
}

// ── Catalog handlers ────────────────────────────────────────────────────────

const TourPackageVariantInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  priceOverride: z.union([z.number(), z.string()]).nullable().optional(),
  heroImageUrl: z.string().url().optional(),
  availabilityNotes: z.string().optional(),
  seasonalAvailability: z
    .array(z.object({ start: z.string(), end: z.string() }))
    .optional(),
  status: z.enum(["draft", "active", "inactive", "archived"]).optional(),
});

const TourPackageInputSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  heroImageUrl: z.string().url().optional(),
  gallery: z.array(z.string().url()).optional(),
  location: z.string().optional(),
  itinerarySummary: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  bookingUrl: z.string().url().optional(),
  termsAndConditions: z.string().optional(),
  basePrice: z.union([z.number(), z.string()]).nullable().optional(),
  currency: z.string().optional(),
  seasonalAvailability: z
    .array(z.object({ start: z.string(), end: z.string() }))
    .optional(),
  durationDays: z.number().int().nullable().optional(),
  durationNights: z.number().int().nullable().optional(),
  status: z.enum(["draft", "active", "inactive", "archived"]).optional(),
  variants: z.array(TourPackageVariantInputSchema).optional(),
});

async function getWhatsAppCatalog() {
  const catalog = await ensureCatalogReady();
  const stats = await whatsappPrisma.whatsAppTourPackage.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const syncStats = await whatsappPrisma.whatsAppTourPackage.groupBy({
    by: ["syncStatus"],
    _count: { _all: true },
  });
  return {
    catalog,
    stats: {
      byStatus: Object.fromEntries(stats.map((s) => [s.status, s._count._all])),
      bySyncStatus: Object.fromEntries(syncStats.map((s) => [s.syncStatus, s._count._all])),
      total: stats.reduce((sum, s) => sum + s._count._all, 0),
    },
  };
}

const ListCatalogPackagesSchema = z.object({
  status: z.enum(["draft", "active", "inactive", "archived"]).optional(),
  syncStatus: z.enum(["pending", "in_progress", "synced", "failed"]).optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

async function listWhatsAppCatalogPackages(rawParams: unknown) {
  const { status, syncStatus, search, limit } = ListCatalogPackagesSchema.parse(rawParams);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (syncStatus) where.syncStatus = syncStatus;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { subtitle: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }

  const packages = await whatsappPrisma.whatsAppTourPackage.findMany({
    where,
    include: {
      product: true,
      variants: { include: { variant: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return { success: true, count: packages.length, packages };
}

async function createWhatsAppCatalogPackage(rawParams: unknown) {
  const input = TourPackageInputSchema.parse(rawParams);
  const pkg = await createTourPackage(input as TourPackageInput);
  return { success: true, tourPackage: pkg };
}

const GetCatalogPackageSchema = z.object({ id: z.string().min(1) });

async function getWhatsAppCatalogPackage(rawParams: unknown) {
  const { id } = GetCatalogPackageSchema.parse(rawParams);
  const pkg = await whatsappPrisma.whatsAppTourPackage.findUnique({
    where: { id },
    include: {
      product: true,
      variants: { include: { variant: true } },
    },
  });
  if (!pkg) throw new NotFoundError(`Tour package ${id} not found`);
  return { success: true, tourPackage: pkg };
}

const UpdateCatalogPackageSchema = TourPackageInputSchema.partial().extend({ id: z.string().min(1) });

async function updateWhatsAppCatalogPackage(rawParams: unknown) {
  const { id, ...input } = UpdateCatalogPackageSchema.parse(rawParams);
  const pkg = await updateTourPackage(id, input as Partial<TourPackageInput>);
  return { success: true, tourPackage: pkg };
}

const DeleteCatalogPackageSchema = z.object({
  id: z.string().min(1),
  removeFromMeta: z.boolean().optional().default(true),
});

async function deleteWhatsAppCatalogPackage(rawParams: unknown) {
  const { id, removeFromMeta } = DeleteCatalogPackageSchema.parse(rawParams);
  await deleteTourPackage(id, { removeFromMeta });
  return { success: true, deleted: true, id };
}

async function syncWhatsAppCatalogPackage(rawParams: unknown) {
  const { id } = GetCatalogPackageSchema.parse(rawParams);
  const pkg = await syncTourPackageToMeta(id);
  return { success: true, tourPackage: pkg };
}

const SyncCatalogSchema = z.object({ limit: z.number().int().min(1).max(25).optional().default(10) });

async function syncWhatsAppCatalog(rawParams: unknown) {
  const { limit } = SyncCatalogSchema.parse(rawParams);
  const result = await syncPendingTourPackages(limit);
  return { success: true, ...result };
}

// ── create_whatsapp_customer ─────────────────────────────────────────────────

const CreateWhatsAppCustomerSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().min(7),
  email: z.string().email().optional(),
});

async function createWhatsAppCustomer(rawParams: unknown) {
  const { name, phoneNumber, email } = CreateWhatsAppCustomerSchema.parse(rawParams);

  // Normalize phone to E.164 format
  const normalized = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/\D/g, '')}`;

  // Split name into first/last
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

  const existing = await whatsappPrisma.whatsAppCustomer.findFirst({
    where: { phoneNumber: normalized },
    select: { id: true },
  });
  if (existing) {
    throw new McpError(`Customer with phone ${normalized} already exists`, 'DUPLICATE_PHONE', 409);
  }

  const customer = await whatsappPrisma.whatsAppCustomer.create({
    data: {
      firstName,
      lastName,
      phoneNumber: normalized,
      email,
      isOptedIn: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      email: true,
      isOptedIn: true,
      createdAt: true,
    },
  });

  return { success: true, customer };
}

// ── get_whatsapp_database_health ─────────────────────────────────────────────

async function getWhatsAppDatabaseHealth() {
  const start = Date.now();
  try {
    const [messageCount, customerCount, campaignCount] = await Promise.all([
      whatsappPrisma.whatsAppMessage.count(),
      whatsappPrisma.whatsAppCustomer.count(),
      whatsappPrisma.whatsAppCampaign.count(),
    ]);
    return {
      status: 'healthy',
      latencyMs: Date.now() - start,
      counts: { messages: messageCount, customers: customerCount, campaigns: campaignCount },
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error?.message || 'Database connection failed',
    };
  }
}

// ── Handler map ─────────────────────────────────────────────────────────────

export const whatsappHandlers: ToolHandlerMap = {
  create_whatsapp_template: createWhatsAppTemplateHandler,
  preview_whatsapp_template: previewWhatsAppTemplateHandler,
  preview_whatsapp_template_from_saved: previewWhatsAppTemplateFromSavedHandler,
  preview_whatsapp_template_from_components: previewWhatsAppTemplateFromComponentsHandler,
  generate_whatsapp_template_example: generateWhatsAppTemplateExampleHandler,
  validate_whatsapp_template: validateWhatsAppTemplateHandler,
  list_whatsapp_template_schema: listWhatsAppTemplateSchemaHandler,
  send_whatsapp_message: sendWhatsAppMessage,
  send_whatsapp_media: sendWhatsAppMedia,
  send_whatsapp_template: sendWhatsAppTemplate,
  upload_whatsapp_media: uploadWhatsAppMediaHandler,
  upload_whatsapp_template_media: uploadWhatsAppTemplateMediaHandler,
  send_whatsapp_product_message: sendWhatsAppProductMessageHandler,
  send_whatsapp_product_list: sendWhatsAppProductListHandler,
  list_whatsapp_campaigns: listWhatsAppCampaigns,
  get_whatsapp_campaign: getWhatsAppCampaign,
  get_whatsapp_campaign_stats: getWhatsAppCampaignStats,
  send_whatsapp_campaign: sendWhatsAppCampaign,
  list_whatsapp_customers: listWhatsAppCustomers,
  create_whatsapp_customer: createWhatsAppCustomer,
  get_whatsapp_database_health: getWhatsAppDatabaseHealth,
  list_whatsapp_templates: listWhatsAppTemplates,
  delete_whatsapp_template: deleteWhatsAppTemplate,
  list_whatsapp_messages: listWhatsAppMessages,
  get_whatsapp_conversation: getWhatsAppConversation,
  get_whatsapp_conversation_summary: getWhatsAppConversationSummary,
  search_whatsapp_messages: searchWhatsAppMessages,
  // Catalog
  get_whatsapp_catalog: getWhatsAppCatalog,
  list_whatsapp_catalog_packages: listWhatsAppCatalogPackages,
  create_whatsapp_catalog_package: createWhatsAppCatalogPackage,
  get_whatsapp_catalog_package: getWhatsAppCatalogPackage,
  update_whatsapp_catalog_package: updateWhatsAppCatalogPackage,
  delete_whatsapp_catalog_package: deleteWhatsAppCatalogPackage,
  sync_whatsapp_catalog_package: syncWhatsAppCatalogPackage,
  sync_whatsapp_catalog: syncWhatsAppCatalog,
};
