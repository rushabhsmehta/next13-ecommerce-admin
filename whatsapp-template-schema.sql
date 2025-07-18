-- Add this to your Prisma schema.prisma file

model WhatsAppTemplate {
  id           Int      @id @default(autoincrement())
  contentSid   String   @unique // Twilio Content SID (HX...)
  name         String   @unique // WhatsApp template name (lowercase, underscores)
  friendlyName String?  // Optional Twilio friendly name
  category     String   // Template category (UTILITY, MARKETING, AUTHENTICATION)
  language     String   // Language code (e.g. "en")
  bodyText     String   @db.Text // Template body text with placeholders
  placeholders Json     @default("{}") // Placeholder definitions
  sampleValues Json     @default("[]") // Sample values for placeholders
  status       String   @default("pending") // Approval status (pending, approved, rejected)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Relations
  messages     Message[] @relation("TemplateMessages")
  
  @@map("whatsapp_templates")
}

model Message {
  id           Int      @id @default(autoincrement())
  to           String   // Recipient number (E.164 format)
  from         String?  // Sender number
  contentSid   String?  // If a template was used, store Content SID
  templateName String?  // Template name used (for readability)
  contentVars  Json?    // JSON of variables substituted
  body         String?  @db.Text // Message body (for non-template messages)
  status       String   // Message status (queued, sent, delivered, etc.)
  messageSid   String?  // Twilio Message SID (SM...)
  direction    String   // INBOUND or OUTBOUND
  timestamp    DateTime @default(now())
  
  // Relations
  template     WhatsAppTemplate? @relation("TemplateMessages", fields: [contentSid], references: [contentSid])
  
  @@map("messages")
}
