import whatsappPrisma from "@/lib/whatsapp-prismadb";
import {
  checkWhatsAppMessagingWindow,
  sendWhatsAppMessage as sendWhatsAppMessageViaLib,
  sendWhatsAppTemplate as sendWhatsAppTemplateViaLib,
  uploadWhatsAppMedia,
} from "@/lib/whatsapp";
import { createTemplate as createWhatsAppTemplateViaLib, type CreateTemplateRequest } from "@/lib/whatsapp-templates";
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
    type: z.enum(["text", "image", "video", "document"]),
    text: z.string().optional(),
    image: z.object({ link: z.string().url() }).optional(),
    video: z.object({ link: z.string().url() }).optional(),
    document: z
      .object({
        link: z.string().url(),
        filename: z.string().optional(),
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
const TemplateHeaderFormatSchema = z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"]);

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
  text: z.string().min(1),
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
    otp_type: z.enum(["COPY_CODE", "ONE_TAP"]),
    text: z.string().min(1),
    autofill_text: z.string().optional(),
    package_name: z.string().optional(),
    signature_hash: z.string().optional(),
  }),
]);

const TemplateButtonsComponentSchema = z.object({
  type: z.literal("BUTTONS"),
  buttons: z.array(TemplateButtonSchema).min(1),
});

const TemplateComponentSchema = z.union([
  TemplateHeaderComponentSchema,
  TemplateBodyComponentSchema,
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
    headerParams,
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
    template = maybeTemplate as WhatsAppTemplate;
  } else {
    const results = await searchTemplates({ name: templateName! });
    if (!results.length) {
      throw new NotFoundError(`Template not found: ${templateName}`);
    }
    template = results[0];
  }

  const required = extractTemplateParameters(template);
  if (parameters) {
    const validation = validateTemplateParameters(template, parameters);
    if (!validation.valid) {
      throw new McpError("Invalid parameters", "VALIDATION_ERROR", 422, { validation, required });
    }
  }

  const preview = previewTemplate(template, parameters);
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
    quality_score: null,
  };

  const required = extractTemplateParameters(template);
  if (parameters) {
    const validation = validateTemplateParameters(template, parameters);
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
    quality_score: null,
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
    allowedHeaderFormats: ["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"],
    allowedButtonTypes: [
      "QUICK_REPLY",
      "PHONE_NUMBER",
      "URL",
      "COPY_CODE",
      "FLOW",
      "OTP",
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
        types: ["QUICK_REPLY", "PHONE_NUMBER", "URL", "COPY_CODE", "FLOW", "OTP"],
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

const ListWhatsAppCustomersSchema = z.object({
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
  tag: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

const ListWhatsAppTemplatesSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
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
  return whatsappPrisma.whatsAppTemplate.findMany({
    select: {
      id: true,
      name: true,
      body: true,
      components: true,
      variables: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
    take: limit,
  });
}

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
  list_whatsapp_campaigns: listWhatsAppCampaigns,
  get_whatsapp_campaign: getWhatsAppCampaign,
  list_whatsapp_customers: listWhatsAppCustomers,
  list_whatsapp_templates: listWhatsAppTemplates,
};
