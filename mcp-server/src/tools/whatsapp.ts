import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

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
  });

const UploadWhatsAppMediaShape = {
  url: z.string().url().describe("Public URL of the media to upload"),
  type: SupportedMediaTypeSchema.describe("Media type to upload"),
  caption: z.string().optional().describe("Optional media caption"),
  fileName: z.string().optional().describe("Optional file name for document uploads"),
};

const UploadWhatsAppMediaSchema = z.object(UploadWhatsAppMediaShape);

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

const CreateWhatsAppTemplateShape = {
  name: z.string().regex(/^[a-z0-9_]+$/, {
    message: "Template name must contain only lowercase alphanumeric characters and underscores",
  }),
  language: z.string().describe("Template language code, for example 'en_US'"),
  category: TemplateCategorySchema.describe("Template category"),
  parameterFormat: TemplateParameterFormatSchema.optional().describe("Optional parameter format"),
  parameter_format: TemplateParameterFormatSchema.optional().describe("Optional parameter format"),
  allowCategoryChange: z.boolean().optional().describe("Allow Meta to change the category if needed"),
  allow_category_change: z.boolean().optional().describe("Allow Meta to change the category if needed"),
  components: z.array(TemplateComponentSchema).min(1).describe("Template components"),
};

const CreateWhatsAppTemplateSchema = z
  .object(CreateWhatsAppTemplateShape)
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

const SendWhatsAppMediaShape = {
  phoneNumber: z.string().describe("Recipient phone number (with country code)"),
  mediaId: z.string().min(1).describe("WhatsApp media id returned from upload_whatsapp_media"),
  type: SupportedMediaTypeSchema.describe("Media type to send"),
  caption: z.string().optional().describe("Optional media caption"),
  filename: z.string().optional().describe("Optional file name for document media"),
  checkWindow: z.boolean().optional().default(true).describe("Enforce the 24-hour messaging window"),
};

const SendWhatsAppMediaSchema = z.object(SendWhatsAppMediaShape);

function normalizeCreateTemplatePayload(input: any) {
  const parameterFormat = input.parameterFormat ?? input.parameter_format;
  const allowCategoryChange = input.allowCategoryChange ?? input.allow_category_change;

  return {
    name: input.name,
    language: input.language,
    category: input.category,
    ...(parameterFormat ? { parameter_format: parameterFormat } : {}),
    ...(typeof allowCategoryChange === "boolean" ? { allow_category_change: allowCategoryChange } : {}),
    components: input.components,
  };
}

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

const SendWhatsAppMessageShape = {
  phoneNumber: z.string().describe("Recipient phone number (with country code, e.g. '919876543210')"),
  message: z.string().optional().describe("Text message content to send"),
  checkWindow: z.boolean().optional().default(true).describe("Enforce the 24-hour messaging window"),
  media: MediaPayloadSchema.optional().describe("Optional media payload to send instead of text"),
};

const SendWhatsAppMessageSchema = z.object(SendWhatsAppMessageShape).refine(
  (value) => Boolean((value.message && value.message.trim()) || value.media),
  {
    message: "Provide either a message or a media payload",
  }
);

const SendWhatsAppTemplateShape = {
  phoneNumber: z.string().describe("Recipient phone number (with country code)"),
  templateName: z.string().describe("Template name (use list_whatsapp_templates to find available templates)"),
  languageCode: z.string().optional().default("en_US").describe("Template language code (default: 'en_US')"),
  parameters: z.array(z.string()).optional().describe("Template parameter values in order"),
  headerParams: TemplateHeaderParamsSchema.optional().describe("Optional template header parameters"),
};

const SendWhatsAppTemplateSchema = z.object(SendWhatsAppTemplateShape);

const TemplatePreviewParametersSchema = z
  .object({
    header: z.union([z.string(), z.record(z.any())]).optional(),
    body: z.array(z.union([z.string(), z.number(), z.record(z.any())])).optional(),
    buttons: z.record(z.array(z.string())).optional(),
  })
  .optional();

const PreviewWhatsAppTemplateFromComponentsShape = {
  name: z
    .string()
    .regex(/^[a-z0-9_]+$/, {
      message: "Template name must contain only lowercase alphanumeric characters and underscores",
    })
    .describe("Template name"),
  language: z.string().min(1).describe("Template language code"),
  category: TemplateCategorySchema.describe("Template category"),
  parameterFormat: TemplateParameterFormatSchema.optional().describe("Optional parameter format"),
  parameter_format: TemplateParameterFormatSchema.optional().describe("Optional parameter format"),
  allowCategoryChange: z.boolean().optional().describe("Allow Meta to change the category if needed"),
  allow_category_change: z.boolean().optional().describe("Allow Meta to change the category if needed"),
  components: z.array(TemplateComponentSchema).min(1).describe("Template components"),
  parameters: TemplatePreviewParametersSchema.describe("Optional preview parameters"),
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

const ValidateWhatsAppTemplateSchema = z
  .object(ValidateWhatsAppTemplateShape)
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

const PreviewWhatsAppTemplateShape = {
  templateId: z.string().optional().describe("Template ID to preview"),
  templateName: z.string().optional().describe("Template name to preview"),
  parameters: TemplatePreviewParametersSchema.describe("Optional preview parameters"),
};

const PreviewWhatsAppTemplateSchema = z.object(PreviewWhatsAppTemplateShape);

const PreviewWhatsAppTemplateFromSavedShape = PreviewWhatsAppTemplateShape;

const GenerateWhatsAppTemplateExampleShape = PreviewWhatsAppTemplateFromComponentsShape;

function listWhatsAppTemplateSchema() {
  return {
    success: true,
    name: "WhatsApp Template Create Schema",
    required: ["name", "language", "category", "components"],
    allowedCategories: ["AUTHENTICATION", "MARKETING", "UTILITY"],
    allowedHeaderFormats: ["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"],
    allowedButtonTypes: ["QUICK_REPLY", "PHONE_NUMBER", "URL", "COPY_CODE", "FLOW", "OTP"],
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

export function registerWhatsappTools(server: McpServer) {
  server.tool(
    "send_whatsapp_message",
    "Send a WhatsApp text or media message to a phone number via the Meta WhatsApp Business API.",
    SendWhatsAppMessageShape,
    async (params) => {
      try {
        const parsed = SendWhatsAppMessageSchema.safeParse(params);
        if (!parsed.success) {
          return toolError(
            "send_whatsapp_message",
            Object.assign(new Error("Validation error"), {
              code: "VALIDATION_ERROR",
              details: parsed.error.flatten(),
            })
          );
        }

        const data = await callTool("send_whatsapp_message", parsed.data);
        return {
          content: [{ type: "text", text: `WhatsApp message sent\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("send_whatsapp_message", err);
      }
    }
  );

  server.tool(
    "send_whatsapp_template",
    "Send a WhatsApp template message to a phone number.",
    SendWhatsAppTemplateShape,
    async (params) => {
      try {
        const parsed = SendWhatsAppTemplateSchema.safeParse(params);
        if (!parsed.success) {
          return toolError(
            "send_whatsapp_template",
            Object.assign(new Error("Validation error"), {
              code: "VALIDATION_ERROR",
              details: parsed.error.flatten(),
            })
          );
        }

        const data = await callTool("send_whatsapp_template", parsed.data);
        return {
          content: [{ type: "text", text: `WhatsApp template message sent\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("send_whatsapp_template", err);
      }
    }
  );

  server.tool(
    "upload_whatsapp_media",
    "Upload a WhatsApp media asset from a public URL and return its WhatsApp media id.",
    UploadWhatsAppMediaShape,
    async (params) => {
      try {
        const parsed = UploadWhatsAppMediaSchema.safeParse(params);
        if (!parsed.success) {
          return toolError(
            "upload_whatsapp_media",
            Object.assign(new Error("Validation error"), {
              code: "VALIDATION_ERROR",
              details: parsed.error.flatten(),
            })
          );
        }

        const data = await callTool("upload_whatsapp_media", parsed.data);
        return {
          content: [{ type: "text", text: `WhatsApp media uploaded\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("upload_whatsapp_media", err);
      }
    }
  );

  server.tool(
    "upload_whatsapp_template_media",
    "Upload a media file (PDF, image, video) from a public URL and return a Meta template media handle. Use this handle as the example.header_handle when creating a template with a DOCUMENT, IMAGE, or VIDEO header. This is different from upload_whatsapp_media — that tool returns a WhatsApp media ID for sending messages, while this tool returns a handle for template creation.",
    {
      url: z.string().url().describe("Public URL of the media file to upload (e.g. a PDF URL)"),
      fileName: z.string().describe("File name with extension (e.g. 'invoice.pdf', 'header.jpg')"),
      mimeType: z.string().describe("MIME type of the file (e.g. 'application/pdf', 'image/jpeg', 'video/mp4')"),
    },
    async (params) => {
      try {
        const data = (await callTool("upload_whatsapp_template_media", params)) as { handle: string };
        return {
          content: [
            {
              type: "text",
              text: `Template media uploaded successfully.\n\nHandle: ${data.handle}\n\nUse this handle as the example.header_handle value when creating a template with a DOCUMENT/IMAGE/VIDEO header:\n\n{\n  "type": "HEADER",\n  "format": "DOCUMENT",\n  "example": {\n    "header_handle": ["${data.handle}"]\n  }\n}`,
            },
          ],
        };
      } catch (err) {
        return toolError("upload_whatsapp_template_media", err);
      }
    }
  );

  server.tool(
    "send_whatsapp_product_message",
    "Send a single product message from your WhatsApp catalog to a customer. The product must be synced to Meta's catalog first (use sync_whatsapp_catalog_package). Requires the catalog ID and the product's retailer ID (SKU).",
    {
      phoneNumber: z.string().describe("Recipient phone number (with country code, e.g. '919876543210')"),
      body: z.string().describe("Message body text to accompany the product card"),
      catalogId: z.string().optional().describe("Meta catalog ID (defaults to the configured WHATSAPP_CATALOG_ID)"),
      productRetailerId: z.string().describe("Product retailer ID / SKU (from the catalog package)"),
      footer: z.string().optional().describe("Optional footer text"),
    },
    async (params) => {
      try {
        const data = await callTool("send_whatsapp_product_message", params);
        return {
          content: [{ type: "text", text: `Product message sent\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("send_whatsapp_product_message", err);
      }
    }
  );

  server.tool(
    "send_whatsapp_product_list",
    "Send a multi-product catalog message with sections. Each section groups related products. Products must be synced to Meta's catalog first. Supports up to 30 products across all sections.",
    {
      phoneNumber: z.string().describe("Recipient phone number (with country code, e.g. '919876543210')"),
      body: z.string().describe("Message body text"),
      headerText: z.string().optional().describe("Header text for the product list (defaults to first section title or 'Catalog')"),
      catalogId: z.string().optional().describe("Meta catalog ID (defaults to the configured WHATSAPP_CATALOG_ID)"),
      sections: z
        .array(
          z.object({
            title: z.string().describe("Section title (e.g. 'Budget Packages', 'Premium Packages')"),
            productRetailerIds: z.array(z.string().min(1)).min(1).describe("List of product retailer IDs / SKUs in this section"),
          })
        )
        .min(1)
        .describe("Product sections (at least one section with at least one product)"),
      footer: z.string().optional().describe("Optional footer text"),
    },
    async (params) => {
      try {
        const data = await callTool("send_whatsapp_product_list", params);
        return {
          content: [{ type: "text", text: `Product list message sent\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("send_whatsapp_product_list", err);
      }
    }
  );

  server.tool(
    "create_whatsapp_template",
    "Create and submit a WhatsApp message template for review.",
    CreateWhatsAppTemplateShape,
    async (params) => {
      try {
        const parsed = CreateWhatsAppTemplateSchema.safeParse(params);
        if (!parsed.success) {
          return toolError(
            "create_whatsapp_template",
            Object.assign(new Error("Validation error"), {
              code: "VALIDATION_ERROR",
              details: parsed.error.flatten(),
            })
          );
        }

        const data = await callTool("create_whatsapp_template", normalizeCreateTemplatePayload(parsed.data));
        return {
          content: [{ type: "text", text: `WhatsApp template created\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("create_whatsapp_template", err);
      }
    }
  );

  server.tool(
    "preview_whatsapp_template_from_components",
    "Preview a WhatsApp template from a draft component payload without saving it.",
    PreviewWhatsAppTemplateFromComponentsShape,
    async (params) => {
      try {
        const parsed = PreviewWhatsAppTemplateFromComponentsSchema.safeParse(params);
        if (!parsed.success) {
          return toolError(
            "preview_whatsapp_template_from_components",
            Object.assign(new Error("Validation error"), {
              code: "VALIDATION_ERROR",
              details: parsed.error.flatten(),
            })
          );
        }

        const data = await callTool("preview_whatsapp_template_from_components", parsed.data);
        return {
          content: [
            { type: "text", text: `WhatsApp template draft preview\n\n${JSON.stringify(data, null, 2)}` },
          ],
        };
      } catch (err) {
        return toolError("preview_whatsapp_template_from_components", err);
      }
    }
  );

  server.tool(
    "validate_whatsapp_template",
    "Validate a WhatsApp template draft payload and return any schema errors.",
    ValidateWhatsAppTemplateShape,
    async (params) => {
      try {
        const parsed = ValidateWhatsAppTemplateSchema.safeParse(params);
        if (!parsed.success) {
          return toolError(
            "validate_whatsapp_template",
            Object.assign(new Error("Validation error"), {
              code: "VALIDATION_ERROR",
              details: parsed.error.flatten(),
            })
          );
        }

        const data = await callTool("validate_whatsapp_template", parsed.data);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        return toolError("validate_whatsapp_template", err);
      }
    }
  );

  server.tool(
    "preview_whatsapp_template",
    "Preview a WhatsApp template and see the generated send payload.",
    PreviewWhatsAppTemplateShape,
    async (params) => {
      try {
        const parsed = PreviewWhatsAppTemplateSchema.safeParse(params);
        if (!parsed.success) {
          return toolError(
            "preview_whatsapp_template",
            Object.assign(new Error("Validation error"), {
              code: "VALIDATION_ERROR",
              details: parsed.error.flatten(),
            })
          );
        }

        const data = await callTool("preview_whatsapp_template", parsed.data);
        return {
          content: [{ type: "text", text: `WhatsApp template preview\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("preview_whatsapp_template", err);
      }
    }
  );

  server.tool(
    "preview_whatsapp_template_from_saved",
    "Preview a saved WhatsApp template and see the generated send payload.",
    PreviewWhatsAppTemplateFromSavedShape,
    async (params) => {
      try {
        const parsed = PreviewWhatsAppTemplateSchema.safeParse(params);
        if (!parsed.success) {
          return toolError(
            "preview_whatsapp_template_from_saved",
            Object.assign(new Error("Validation error"), {
              code: "VALIDATION_ERROR",
              details: parsed.error.flatten(),
            })
          );
        }

        const data = await callTool("preview_whatsapp_template_from_saved", parsed.data);
        return {
          content: [{ type: "text", text: `WhatsApp template preview\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("preview_whatsapp_template_from_saved", err);
      }
    }
  );

  server.tool(
    "generate_whatsapp_template_example",
    "Generate sample parameter values for a WhatsApp template draft.",
    GenerateWhatsAppTemplateExampleShape,
    async (params) => {
      try {
        const parsed = PreviewWhatsAppTemplateFromComponentsSchema.safeParse(params);
        if (!parsed.success) {
          return toolError(
            "generate_whatsapp_template_example",
            Object.assign(new Error("Validation error"), {
              code: "VALIDATION_ERROR",
              details: parsed.error.flatten(),
            })
          );
        }

        const data = await callTool("generate_whatsapp_template_example", parsed.data);
        return {
          content: [{ type: "text", text: `WhatsApp template example generated\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("generate_whatsapp_template_example", err);
      }
    }
  );

  server.tool(
    "list_whatsapp_template_schema",
    "Describe the supported WhatsApp template creation schema and examples.",
    {},
    async () => {
      try {
        return {
          content: [{ type: "text", text: JSON.stringify(listWhatsAppTemplateSchema(), null, 2) }],
        };
      } catch (err) {
        return toolError("list_whatsapp_template_schema", err);
      }
    }
  );

  server.tool(
    "send_whatsapp_media",
    "Send a WhatsApp media message by WhatsApp media id.",
    SendWhatsAppMediaShape,
    async (params) => {
      try {
        const parsed = SendWhatsAppMediaSchema.safeParse(params);
        if (!parsed.success) {
          return toolError(
            "send_whatsapp_media",
            Object.assign(new Error("Validation error"), {
              code: "VALIDATION_ERROR",
              details: parsed.error.flatten(),
            })
          );
        }

        const data = await callTool("send_whatsapp_media", parsed.data);
        return {
          content: [{ type: "text", text: `WhatsApp media message sent\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("send_whatsapp_media", err);
      }
    }
  );

  server.tool(
    "list_whatsapp_campaigns",
    "List WhatsApp marketing campaigns.",
    {
      status: z.string().optional().describe("Filter by campaign status"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_whatsapp_campaigns", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_whatsapp_campaigns", err);
      }
    }
  );

  server.tool(
    "get_whatsapp_campaign_stats",
    "Get delivery statistics for a WhatsApp campaign.",
    {
      campaignId: z.string().describe("The campaign ID"),
    },
    async ({ campaignId }) => {
      try {
        const data = await callTool("get_whatsapp_campaign_stats", { campaignId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_whatsapp_campaign_stats", err);
      }
    }
  );

  server.tool(
    "list_whatsapp_customers",
    "List WhatsApp customers/contacts.",
    {
      name: z.string().optional().describe("Search by customer name"),
      phoneNumber: z.string().optional().describe("Search by phone number"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_whatsapp_customers", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_whatsapp_customers", err);
      }
    }
  );

  server.tool(
    "create_whatsapp_customer",
    "Add a new WhatsApp customer/contact.",
    {
      name: z.string().describe("Customer name"),
      phoneNumber: z.string().describe("Phone number with country code (e.g. '919876543210')"),
      email: z.string().optional().describe("Email address"),
    },
    async (params) => {
      try {
        const data = await callTool("create_whatsapp_customer", params);
        return {
          content: [{ type: "text", text: `WhatsApp customer created\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("create_whatsapp_customer", err);
      }
    }
  );

  server.tool(
    "list_whatsapp_templates",
    "List available WhatsApp message templates with live status from Meta (APPROVED, PENDING, REJECTED, PAUSED, DISABLED, DELETED), language, category, and quality score.",
    {
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_whatsapp_templates", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_whatsapp_templates", err);
      }
    }
  );

  server.tool(
    "delete_whatsapp_template",
    "Delete a WhatsApp message template by name. This permanently removes the template from Meta's platform.",
    {
      name: z.string().min(1).describe("Template name to delete"),
      hsm_id: z.string().optional().describe("Optional template ID for deleting a specific template version"),
    },
    async (params) => {
      try {
        const data = await callTool("delete_whatsapp_template", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("delete_whatsapp_template", err);
      }
    }
  );

  server.tool(
    "list_whatsapp_messages",
    "Get WhatsApp message history.",
    {
      phoneNumber: z.string().optional().describe("Filter by phone number"),
      direction: z.enum(["inbound", "outbound"]).optional().describe("Filter by message direction"),
      startDate: z.string().optional().describe("Filter from this date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Filter to this date (YYYY-MM-DD)"),
      limit: z.number().int().min(1).max(100).optional().default(50).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_whatsapp_messages", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_whatsapp_messages", err);
      }
    }
  );

  server.tool(
    "get_whatsapp_conversation",
    "Get a WhatsApp conversation thread for one phone number.",
    {
      phoneNumber: z.string().describe("Phone number with country code"),
      limit: z.number().int().min(1).max(200).optional().default(100).describe("Max results"),
      skip: z.number().int().min(0).optional().default(0).describe("Skip messages"),
      startDate: z.string().optional().describe("Only include messages on or after this date"),
      endDate: z.string().optional().describe("Only include messages on or before this date"),
    },
    async (params) => {
      try {
        const data = await callTool("get_whatsapp_conversation", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_whatsapp_conversation", err);
      }
    }
  );

  server.tool(
    "get_whatsapp_conversation_summary",
    "Get a short summary for a WhatsApp conversation thread.",
    {
      phoneNumber: z.string().describe("Phone number with country code"),
      limit: z.number().int().min(1).max(50).optional().default(10).describe("Recent message count to inspect"),
      transcriptFormat: z
        .enum(["lines", "bullets", "markdown"])
        .optional()
        .default("lines")
        .describe("Transcript formatting"),
      sinceDate: z.string().optional().describe("Only include messages on or after this date"),
      startDate: z.string().optional().describe("Only include messages on or after this date"),
      endDate: z.string().optional().describe("Only include messages on or before this date"),
    },
    async (params) => {
      try {
        const data = await callTool("get_whatsapp_conversation_summary", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_whatsapp_conversation_summary", err);
      }
    }
  );

  server.tool(
    "search_whatsapp_messages",
    "Search WhatsApp messages by keyword and optional phone number.",
    {
      query: z.string().min(1).describe("Search keyword"),
      phoneNumber: z.string().optional().describe("Optional phone number filter"),
      direction: z.enum(["inbound", "outbound"]).optional().describe("Optional message direction filter"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
      skip: z.number().int().min(0).optional().default(0).describe("Skip results"),
    },
    async (params) => {
      try {
        const data = await callTool("search_whatsapp_messages", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("search_whatsapp_messages", err);
      }
    }
  );

  server.tool(
    "send_whatsapp_campaign",
    "Trigger sending a WhatsApp campaign to its recipients.",
    {
      campaignId: z.string().describe("The campaign ID to send"),
    },
    async ({ campaignId }) => {
      try {
        const data = await callTool("send_whatsapp_campaign", { campaignId });
        return {
          content: [{ type: "text", text: `WhatsApp campaign triggered\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("send_whatsapp_campaign", err);
      }
    }
  );

  server.tool(
    "get_whatsapp_database_health",
    "Check WhatsApp database connection health.",
    {},
    async () => {
      try {
        const data = await callTool("get_whatsapp_database_health", {});
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_whatsapp_database_health", err);
      }
    }
  );

  // ── Catalog tools ──────────────────────────────────────────────────────────

  server.tool(
    "get_whatsapp_catalog",
    "Get the default WhatsApp product catalog info and tour package statistics (total, by status, by sync status).",
    {},
    async () => {
      try {
        const data = await callTool("get_whatsapp_catalog", {});
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_whatsapp_catalog", err);
      }
    }
  );

  const TourPackageStatusSchema = z.enum(["draft", "active", "inactive", "archived"]);
  const TourPackageSyncStatusSchema = z.enum(["pending", "in_progress", "synced", "failed"]);

  const SeasonalAvailabilitySchema = z.array(
    z.object({
      start: z.string().describe("Start date (YYYY-MM-DD)"),
      end: z.string().describe("End date (YYYY-MM-DD)"),
    })
  ).optional().describe("Seasonal availability windows");

  const VariantShape = {
    id: z.string().optional().describe("Existing variant ID (for updates)"),
    name: z.string().min(1).describe("Variant name, e.g. '3N/4D Standard'"),
    description: z.string().optional().describe("Variant description"),
    priceOverride: z.number().nullable().optional().describe("Override price for this variant (INR)"),
    heroImageUrl: z.string().url().optional().describe("Variant hero image URL"),
    availabilityNotes: z.string().optional().describe("Availability notes"),
    seasonalAvailability: SeasonalAvailabilitySchema,
    status: TourPackageStatusSchema.optional().describe("Variant status"),
  };

  server.tool(
    "list_whatsapp_catalog_packages",
    "List WhatsApp catalog tour packages with optional filters for status, sync status, and keyword search.",
    {
      status: TourPackageStatusSchema.optional().describe("Filter by package status"),
      syncStatus: TourPackageSyncStatusSchema.optional().describe("Filter by Meta sync status"),
      search: z.string().optional().describe("Keyword search on title, subtitle, or location"),
      limit: z.number().int().min(1).max(100).optional().default(50).describe("Max results to return"),
    },
    async (params) => {
      try {
        const data = await callTool("list_whatsapp_catalog_packages", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_whatsapp_catalog_packages", err);
      }
    }
  );

  server.tool(
    "create_whatsapp_catalog_package",
    "Create a new tour package in the WhatsApp catalog. The package will be stored locally and marked pending sync to Meta. Call sync_whatsapp_catalog_package afterward to push it to Meta.",
    {
      title: z.string().min(1).describe("Tour package title, e.g. 'Kerala Backwaters 5N/6D'"),
      subtitle: z.string().optional().describe("Short tagline"),
      heroImageUrl: z.string().url().optional().describe("Main display image URL"),
      gallery: z.array(z.string().url()).optional().describe("Additional image URLs (up to 10)"),
      location: z.string().optional().describe("Destination, e.g. 'Kerala, India'"),
      itinerarySummary: z.string().optional().describe("Day-by-day summary text"),
      highlights: z.array(z.string()).optional().describe("Key selling points"),
      inclusions: z.array(z.string()).optional().describe("What is included"),
      exclusions: z.array(z.string()).optional().describe("What is excluded"),
      bookingUrl: z.string().url().optional().describe("Booking / enquiry URL"),
      termsAndConditions: z.string().optional().describe("T&C text"),
      basePrice: z.number().nullable().optional().describe("Base price in INR"),
      currency: z.string().optional().default("INR").describe("Currency code"),
      seasonalAvailability: SeasonalAvailabilitySchema,
      durationDays: z.number().int().nullable().optional().describe("Number of days"),
      durationNights: z.number().int().nullable().optional().describe("Number of nights"),
      status: TourPackageStatusSchema.optional().default("draft").describe("Initial status (default: draft)"),
      variants: z.array(z.object(VariantShape)).optional().describe("Optional pricing/variant options"),
    },
    async (params) => {
      try {
        const data = await callTool("create_whatsapp_catalog_package", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("create_whatsapp_catalog_package", err);
      }
    }
  );

  server.tool(
    "get_whatsapp_catalog_package",
    "Get a single WhatsApp catalog tour package by ID, including its variants and product details.",
    {
      id: z.string().min(1).describe("Tour package ID"),
    },
    async (params) => {
      try {
        const data = await callTool("get_whatsapp_catalog_package", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_whatsapp_catalog_package", err);
      }
    }
  );

  server.tool(
    "update_whatsapp_catalog_package",
    "Update an existing WhatsApp catalog tour package. Only provide fields to change. The package sync status will be reset to pending after content changes — call sync_whatsapp_catalog_package to re-push to Meta.",
    {
      id: z.string().min(1).describe("Tour package ID to update"),
      title: z.string().min(1).optional().describe("Tour package title"),
      subtitle: z.string().optional().describe("Short tagline"),
      heroImageUrl: z.string().url().optional().describe("Main display image URL"),
      gallery: z.array(z.string().url()).optional().describe("Additional image URLs (up to 10)"),
      location: z.string().optional().describe("Destination"),
      itinerarySummary: z.string().optional().describe("Day-by-day summary text"),
      highlights: z.array(z.string()).optional().describe("Key selling points"),
      inclusions: z.array(z.string()).optional().describe("What is included"),
      exclusions: z.array(z.string()).optional().describe("What is excluded"),
      bookingUrl: z.string().url().optional().describe("Booking / enquiry URL"),
      termsAndConditions: z.string().optional().describe("T&C text"),
      basePrice: z.number().nullable().optional().describe("Base price in INR"),
      currency: z.string().optional().describe("Currency code"),
      seasonalAvailability: SeasonalAvailabilitySchema,
      durationDays: z.number().int().nullable().optional().describe("Number of days"),
      durationNights: z.number().int().nullable().optional().describe("Number of nights"),
      status: TourPackageStatusSchema.optional().describe("Package status"),
      variants: z.array(z.object(VariantShape)).optional().describe("Variant options (include id to update existing)"),
    },
    async (params) => {
      try {
        const data = await callTool("update_whatsapp_catalog_package", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("update_whatsapp_catalog_package", err);
      }
    }
  );

  server.tool(
    "delete_whatsapp_catalog_package",
    "Delete a WhatsApp catalog tour package. By default also removes it from Meta's catalog. Pass removeFromMeta: false to skip the Meta deletion.",
    {
      id: z.string().min(1).describe("Tour package ID to delete"),
      removeFromMeta: z.boolean().optional().default(true).describe("Also delete from Meta catalog (default: true)"),
    },
    async (params) => {
      try {
        const data = await callTool("delete_whatsapp_catalog_package", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("delete_whatsapp_catalog_package", err);
      }
    }
  );

  server.tool(
    "sync_whatsapp_catalog_package",
    "Sync a single tour package to Meta's WhatsApp catalog. Creates or updates the product on Meta. Call this after creating or updating a package.",
    {
      id: z.string().min(1).describe("Tour package ID to sync"),
    },
    async (params) => {
      try {
        const data = await callTool("sync_whatsapp_catalog_package", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("sync_whatsapp_catalog_package", err);
      }
    }
  );

  server.tool(
    "sync_whatsapp_catalog",
    "Batch-sync all pending/failed tour packages to Meta's WhatsApp catalog. Processes up to `limit` packages at a time.",
    {
      limit: z.number().int().min(1).max(25).optional().default(10).describe("Max packages to sync in this batch (default: 10)"),
    },
    async (params) => {
      try {
        const data = await callTool("sync_whatsapp_catalog", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("sync_whatsapp_catalog", err);
      }
    }
  );
}
