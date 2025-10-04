# 🚀 WhatsApp Integration - Complete Redesign

> **Status**: Production-Ready Design  
> **Last Updated**: October 4, 2025  
> **Integration**: Meta WhatsApp Business Cloud API

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Architecture Design](#architecture-design)
4. [Core Components](#core-components)
5. [Implementation Plan](#implementation-plan)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Guide](#deployment-guide)

---

## 🎯 Executive Summary

### Goals
- **Simplify** WhatsApp integration to use ONLY Meta Graph API
- **Centralize** template management with database sync
- **Automate** message workflows for tour packages & inquiries
- **Track** all messages with comprehensive logging
- **Scale** to handle multiple organizations & phone numbers

### Key Features
✅ Meta WhatsApp Cloud API (Official)  
✅ Template Management System  
✅ Automated Workflows (Booking, Inquiry, Follow-up)  
✅ Message Status Tracking (Webhooks)  
✅ Multi-organization Support  
✅ Comprehensive Error Handling  
✅ Testing Framework  

---

## 🔍 Current State Analysis

### Strengths ✅
- Working Meta Graph API integration
- Database models for messages & templates
- API endpoints functional
- Basic template sending works
- Webhook verification setup

### Issues ❌
- **No template synchronization** from Meta to DB
- **No automated workflows** for tour packages
- **Language code inconsistency** (en_US vs en)
- **No template parameter validation**
- **Limited error handling** in workflows
- **No retry mechanism** for failed messages
- **Missing organization-specific** phone numbers
- **No message queue** for bulk sending

### Technical Debt
```
❌ Legacy AiSensy references in comments
❌ Twilio test scripts still present
❌ Incomplete webhook handling (only status, no incoming messages)
❌ No rate limiting for API calls
❌ Template parameters hardcoded in some places
❌ No template preview functionality
❌ Missing message analytics/reporting
```

---

## 🏗️ Architecture Design

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   UI Layer   │─────▶│ API Routes   │─────▶│  Actions  │ │
│  │  Components  │      │  Endpoints   │      │  Triggers │ │
│  └──────────────┘      └──────────────┘      └───────────┘ │
│         │                     │                      │       │
│         └─────────────────────┼──────────────────────┘       │
│                               │                              │
│                    ┌──────────▼────────────┐                │
│                    │  WhatsApp Service     │                │
│                    │  (Core Library)       │                │
│                    └──────────┬────────────┘                │
│                               │                              │
│         ┌─────────────────────┼──────────────────┐          │
│         │                     │                  │          │
│  ┌──────▼─────┐      ┌────────▼──────┐   ┌──────▼──────┐  │
│  │  Template  │      │   Message     │   │   Webhook   │  │
│  │  Manager   │      │   Queue       │   │   Handler   │  │
│  └────────────┘      └───────────────┘   └─────────────┘  │
│         │                     │                  │          │
└─────────┼─────────────────────┼──────────────────┼──────────┘
          │                     │                  │
          └──────────┬──────────┘                  │
                     │                             │
          ┌──────────▼──────────┐       ┌──────────▼─────────┐
          │  PostgreSQL (Prisma)│       │   Meta Graph API   │
          │  - Messages         │       │   - Send Messages  │
          │  - Templates        │       │   - Get Templates  │
          │  - Message Queue    │       │   - Webhooks       │
          └─────────────────────┘       └────────────────────┘
```

### Data Flow

```
User Action → API Route → Service Layer → Meta API → Database
                                ↓
                          Queue Handler
                                ↓
                          Webhook Events
                                ↓
                          Status Updates
```

---

## 🔧 Core Components

### 1. Database Schema Enhancement

```prisma
// Enhanced WhatsApp Models
model WhatsAppMessage {
  id           String    @id @default(uuid())
  
  // Core fields
  to           String
  from         String
  message      String?   @db.Text
  messageSid   String?   @unique
  
  // Status tracking
  status       String    @default("pending") // pending, queued, sent, delivered, read, failed
  direction    String    @default("outbound") // outbound, inbound
  
  // Template info
  templateId   String?
  templateName String?
  templateParams Json?
  
  // Organization
  organizationId String?
  phoneNumberId  String? // Meta Phone Number ID
  
  // Timestamps
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  sentAt       DateTime?
  deliveredAt  DateTime?
  readAt       DateTime?
  
  // Error handling
  errorCode    String?
  errorMessage String?   @db.Text
  retryCount   Int       @default(0)
  
  // Context
  contextType  String?   // tourPackageQuery, inquiry, booking, etc.
  contextId    String?   // ID of the related record
  
  // Relationships
  template     WhatsAppTemplate? @relation(fields: [templateId], references: [id])
  organization Organization?     @relation(fields: [organizationId], references: [id])
  
  @@index([to])
  @@index([status])
  @@index([direction])
  @@index([createdAt])
  @@index([organizationId])
  @@index([contextType, contextId])
  @@index([templateId])
}

model WhatsAppTemplate {
  id        String   @id @default(uuid())
  
  // Meta template info
  name      String   @unique
  metaId    String?  // Template ID from Meta
  language  String   @default("en")
  category  String   @default("UTILITY") // MARKETING, UTILITY, AUTHENTICATION
  status    String   @default("PENDING") // PENDING, APPROVED, REJECTED
  
  // Content
  body      String   @db.Text
  header    String?
  footer    String?
  
  // Parameters
  variables Json?    // Array of parameter names
  buttons   Json?    // Array of button configurations
  
  // Organization
  organizationId String?
  
  // Metadata
  lastSyncAt DateTime?
  usageCount Int      @default(0)
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relationships
  messages     WhatsAppMessage[]
  organization Organization?     @relation(fields: [organizationId], references: [id])
  
  @@index([name])
  @@index([status])
  @@index([organizationId])
}

model WhatsAppQueue {
  id        String   @id @default(uuid())
  
  // Message details
  to        String
  templateName String?
  message   String?  @db.Text
  params    Json?
  
  // Context
  contextType  String?
  contextId    String?
  
  // Queue management
  status    String   @default("pending") // pending, processing, sent, failed
  priority  Int      @default(0) // Higher = more important
  scheduledFor DateTime? // For scheduled messages
  
  // Retry logic
  attempts  Int      @default(0)
  maxAttempts Int    @default(3)
  lastError String?  @db.Text
  
  // Result
  messageSid String?
  processedAt DateTime?
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([status])
  @@index([scheduledFor])
  @@index([priority])
  @@index([contextType, contextId])
}

model WhatsAppConfig {
  id        String   @id @default(uuid())
  
  // Organization
  organizationId String @unique
  
  // Meta credentials
  phoneNumberId String
  accessToken   String
  businessAccountId String?
  
  // Settings
  webhookVerifyToken String?
  autoReply      Boolean @default(false)
  autoReplyMessage String?
  
  // Feature flags
  enableNotifications Boolean @default(true)
  enableMarketing     Boolean @default(false)
  enableAutomation    Boolean @default(true)
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relationships
  organization Organization @relation(fields: [organizationId], references: [id])
  
  @@index([organizationId])
}
```

### 2. Core Service Layer

**File**: `src/lib/whatsapp/index.ts`

```typescript
export * from './client';
export * from './templates';
export * from './messages';
export * from './queue';
export * from './webhooks';
export * from './workflows';
export * from './types';
```

**File**: `src/lib/whatsapp/types.ts`

```typescript
export type WhatsAppProvider = 'meta';

export type MessageStatus = 
  | 'pending' 
  | 'queued' 
  | 'sent' 
  | 'delivered' 
  | 'read' 
  | 'failed';

export type MessageDirection = 'outbound' | 'inbound';

export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export type TemplateStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface WhatsAppClientConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string;
  businessAccountId?: string;
}

export interface SendMessageParams {
  to: string;
  message?: string;
  templateName?: string;
  templateParams?: Record<string, any>;
  context?: {
    type: string;
    id: string;
  };
  organizationId?: string;
  saveToDb?: boolean;
  queueIfFailed?: boolean;
}

export interface SendTemplateParams {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParams?: Array<string | number>;
  headerParams?: Array<string | number>;
  buttonParams?: Array<{
    type: string;
    index: number;
    parameters: Array<{ type: string; text: string }>;
  }>;
  context?: {
    type: string;
    id: string;
  };
  organizationId?: string;
  saveToDb?: boolean;
}

export interface MessageResponse {
  success: boolean;
  messageId?: string;
  messageSid?: string;
  status?: MessageStatus;
  error?: string;
  dbRecord?: any;
  queued?: boolean;
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: Array<{
    type: 'PHONE_NUMBER' | 'URL' | 'QUICK_REPLY';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  status: TemplateStatus;
  category: TemplateCategory;
  components: TemplateComponent[];
}

export interface WebhookEvent {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      field: string;
      value: any;
    }>;
  }>;
}

export interface QueueOptions {
  priority?: number;
  scheduledFor?: Date;
  maxAttempts?: number;
  context?: {
    type: string;
    id: string;
  };
}
```

### 3. WhatsApp Client

**File**: `src/lib/whatsapp/client.ts`

```typescript
import { WhatsAppClientConfig, MessageResponse } from './types';

export class WhatsAppClient {
  private config: WhatsAppClientConfig;
  private baseUrl: string;

  constructor(config: WhatsAppClientConfig) {
    this.config = config;
    const version = config.apiVersion || 'v22.0';
    this.baseUrl = `https://graph.facebook.com/${version}/${config.phoneNumberId}`;
  }

  async sendTextMessage(to: string, text: string): Promise<MessageResponse> {
    const payload = {
      messaging_product: 'whatsapp',
      to: this.normalizePhone(to),
      type: 'text',
      text: { body: text },
    };

    return this.sendRequest('/messages', payload);
  }

  async sendTemplateMessage(params: {
    to: string;
    templateName: string;
    languageCode: string;
    components?: any[];
  }): Promise<MessageResponse> {
    const payload = {
      messaging_product: 'whatsapp',
      to: this.normalizePhone(params.to),
      type: 'template',
      template: {
        name: params.templateName,
        language: { code: params.languageCode },
        ...(params.components && { components: params.components }),
      },
    };

    return this.sendRequest('/messages', payload);
  }

  async getTemplates(): Promise<any> {
    if (!this.config.businessAccountId) {
      throw new Error('businessAccountId required to fetch templates');
    }

    const url = `https://graph.facebook.com/${this.config.apiVersion || 'v22.0'}/${this.config.businessAccountId}/message_templates`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }

    return response.json();
  }

  private async sendRequest(endpoint: string, payload: any): Promise<MessageResponse> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        return {
          success: false,
          error: data.error?.message || data.error?.error_data?.details || 'Request failed',
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
        messageSid: data.messages?.[0]?.id,
        status: 'sent',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  private normalizePhone(phone: string): string {
    // Remove 'whatsapp:' prefix if present
    let clean = phone.replace('whatsapp:', '').trim();
    
    // Remove + if present
    clean = clean.replace('+', '');
    
    // Remove non-digits
    clean = clean.replace(/\D/g, '');
    
    return clean;
  }

  static getConfigFromEnv(): WhatsAppClientConfig {
    return {
      phoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID!,
      accessToken: process.env.META_WHATSAPP_ACCESS_TOKEN!,
      apiVersion: process.env.META_GRAPH_API_VERSION || 'v22.0',
      businessAccountId: process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
    };
  }

  static validateConfig(config: WhatsAppClientConfig): void {
    if (!config.phoneNumberId) {
      throw new Error('META_WHATSAPP_PHONE_NUMBER_ID is required');
    }
    if (!config.accessToken) {
      throw new Error('META_WHATSAPP_ACCESS_TOKEN is required');
    }
  }
}
```

### 4. Template Manager

**File**: `src/lib/whatsapp/templates.ts`

```typescript
import prisma from '@/lib/prismadb';
import { WhatsAppClient } from './client';
import { MetaTemplate, TemplateComponent } from './types';

export class TemplateManager {
  private client: WhatsAppClient;

  constructor(client: WhatsAppClient) {
    this.client = client;
  }

  /**
   * Sync templates from Meta to local database
   */
  async syncTemplatesFromMeta(organizationId?: string): Promise<number> {
    const metaTemplates = await this.client.getTemplates();
    let syncedCount = 0;

    for (const metaTemplate of metaTemplates.data || []) {
      await this.upsertTemplate(metaTemplate, organizationId);
      syncedCount++;
    }

    return syncedCount;
  }

  /**
   * Get template by name
   */
  async getTemplate(name: string, organizationId?: string) {
    return prisma.whatsAppTemplate.findFirst({
      where: {
        name,
        ...(organizationId && { organizationId }),
      },
    });
  }

  /**
   * Get all templates
   */
  async getAllTemplates(organizationId?: string) {
    return prisma.whatsAppTemplate.findMany({
      where: {
        ...(organizationId && { organizationId }),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get approved templates only
   */
  async getApprovedTemplates(organizationId?: string) {
    return prisma.whatsAppTemplate.findMany({
      where: {
        status: 'APPROVED',
        ...(organizationId && { organizationId }),
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Extract parameters from template body
   */
  extractParameters(template: MetaTemplate): string[] {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    if (!bodyComponent?.text) return [];

    const matches = bodyComponent.text.match(/\{\{(\d+)\}\}/g) || [];
    return matches.map(m => m.replace(/[{}]/g, ''));
  }

  /**
   * Build template components for Meta API
   */
  buildTemplateComponents(params: {
    bodyParams?: Array<string | number>;
    headerParams?: Array<string | number>;
    buttonParams?: Array<{
      type: string;
      index: number;
      parameters: Array<{ type: string; text: string }>;
    }>;
  }): any[] {
    const components: any[] = [];

    if (params.headerParams?.length) {
      components.push({
        type: 'header',
        parameters: params.headerParams.map(v => ({
          type: 'text',
          text: String(v),
        })),
      });
    }

    if (params.bodyParams?.length) {
      components.push({
        type: 'body',
        parameters: params.bodyParams.map(v => ({
          type: 'text',
          text: String(v),
        })),
      });
    }

    if (params.buttonParams?.length) {
      params.buttonParams.forEach(button => {
        components.push({
          type: 'button',
          sub_type: button.type,
          index: button.index,
          parameters: button.parameters,
        });
      });
    }

    return components;
  }

  /**
   * Increment template usage count
   */
  async incrementUsageCount(templateId: string) {
    await prisma.whatsAppTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 },
      },
    });
  }

  private async upsertTemplate(metaTemplate: any, organizationId?: string) {
    const bodyComponent = metaTemplate.components?.find((c: any) => c.type === 'BODY');
    const headerComponent = metaTemplate.components?.find((c: any) => c.type === 'HEADER');
    const footerComponent = metaTemplate.components?.find((c: any) => c.type === 'FOOTER');
    const buttonsComponent = metaTemplate.components?.find((c: any) => c.type === 'BUTTONS');

    const variables = this.extractParametersFromText(bodyComponent?.text || '');

    await prisma.whatsAppTemplate.upsert({
      where: { name: metaTemplate.name },
      create: {
        name: metaTemplate.name,
        metaId: metaTemplate.id,
        language: metaTemplate.language,
        category: metaTemplate.category || 'UTILITY',
        status: metaTemplate.status,
        body: bodyComponent?.text || '',
        header: headerComponent?.text,
        footer: footerComponent?.text,
        variables: variables,
        buttons: buttonsComponent?.buttons || null,
        organizationId,
        lastSyncAt: new Date(),
      },
      update: {
        metaId: metaTemplate.id,
        language: metaTemplate.language,
        category: metaTemplate.category || 'UTILITY',
        status: metaTemplate.status,
        body: bodyComponent?.text || '',
        header: headerComponent?.text,
        footer: footerComponent?.text,
        variables: variables,
        buttons: buttonsComponent?.buttons || null,
        lastSyncAt: new Date(),
      },
    });
  }

  private extractParametersFromText(text: string): string[] {
    const matches = text.match(/\{\{(\d+)\}\}/g) || [];
    return matches.map(m => m.replace(/[{}]/g, ''));
  }
}
```

### 5. Message Queue Handler

**File**: `src/lib/whatsapp/queue.ts`

```typescript
import prisma from '@/lib/prismadb';
import { WhatsAppClient } from './client';
import { QueueOptions } from './types';
import { sendWhatsAppMessage } from './messages';

export class MessageQueue {
  /**
   * Add message to queue
   */
  static async enqueue(params: {
    to: string;
    templateName?: string;
    message?: string;
    params?: any;
    contextType?: string;
    contextId?: string;
    options?: QueueOptions;
  }) {
    return prisma.whatsAppQueue.create({
      data: {
        to: params.to,
        templateName: params.templateName,
        message: params.message,
        params: params.params || {},
        contextType: params.contextType,
        contextId: params.contextId,
        priority: params.options?.priority || 0,
        scheduledFor: params.options?.scheduledFor,
        maxAttempts: params.options?.maxAttempts || 3,
        status: 'pending',
      },
    });
  }

  /**
   * Process pending messages in queue
   */
  static async processPending(limit: number = 10) {
    const now = new Date();
    
    // Get pending messages (scheduled or ready now)
    const messages = await prisma.whatsAppQueue.findMany({
      where: {
        status: 'pending',
        attempts: { lt: prisma.whatsAppQueue.fields.maxAttempts },
        OR: [
          { scheduledFor: null },
          { scheduledFor: { lte: now } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: limit,
    });

    const results = [];

    for (const queuedMessage of messages) {
      const result = await this.processMessage(queuedMessage);
      results.push(result);
    }

    return results;
  }

  /**
   * Process a single queued message
   */
  private static async processMessage(queuedMessage: any) {
    // Mark as processing
    await prisma.whatsAppQueue.update({
      where: { id: queuedMessage.id },
      data: {
        status: 'processing',
        attempts: { increment: 1 },
      },
    });

    try {
      // Send message
      const result = await sendWhatsAppMessage({
        to: queuedMessage.to,
        message: queuedMessage.message,
        templateName: queuedMessage.templateName,
        templateParams: queuedMessage.params,
        context: queuedMessage.contextType ? {
          type: queuedMessage.contextType,
          id: queuedMessage.contextId,
        } : undefined,
        saveToDb: true,
      });

      if (result.success) {
        // Mark as sent
        await prisma.whatsAppQueue.update({
          where: { id: queuedMessage.id },
          data: {
            status: 'sent',
            messageSid: result.messageSid,
            processedAt: new Date(),
          },
        });

        return { success: true, queueId: queuedMessage.id };
      } else {
        // Mark as failed
        await prisma.whatsAppQueue.update({
          where: { id: queuedMessage.id },
          data: {
            status: queuedMessage.attempts >= queuedMessage.maxAttempts ? 'failed' : 'pending',
            lastError: result.error,
          },
        });

        return { success: false, queueId: queuedMessage.id, error: result.error };
      }
    } catch (error: any) {
      // Mark as failed
      await prisma.whatsAppQueue.update({
        where: { id: queuedMessage.id },
        data: {
          status: queuedMessage.attempts >= queuedMessage.maxAttempts ? 'failed' : 'pending',
          lastError: error.message,
        },
      });

      return { success: false, queueId: queuedMessage.id, error: error.message };
    }
  }

  /**
   * Retry failed messages
   */
  static async retryFailed(limit: number = 5) {
    await prisma.whatsAppQueue.updateMany({
      where: {
        status: 'failed',
        attempts: { lt: prisma.whatsAppQueue.fields.maxAttempts },
      },
      data: {
        status: 'pending',
      },
    });

    return this.processPending(limit);
  }

  /**
   * Get queue statistics
   */
  static async getStats() {
    const [pending, processing, sent, failed] = await Promise.all([
      prisma.whatsAppQueue.count({ where: { status: 'pending' } }),
      prisma.whatsAppQueue.count({ where: { status: 'processing' } }),
      prisma.whatsAppQueue.count({ where: { status: 'sent' } }),
      prisma.whatsAppQueue.count({ where: { status: 'failed' } }),
    ]);

    return { pending, processing, sent, failed };
  }
}
```

### 6. Automated Workflows

**File**: `src/lib/whatsapp/workflows.ts`

```typescript
import prisma from '@/lib/prismadb';
import { sendWhatsAppTemplate } from './messages';
import { MessageQueue } from './queue';

export class WhatsAppWorkflows {
  /**
   * Send booking confirmation for tour package query
   */
  static async sendBookingConfirmation(tourPackageQueryId: string) {
    const query = await prisma.tourPackageQuery.findUnique({
      where: { id: tourPackageQueryId },
      include: {
        customer: true,
        tourPackage: true,
      },
    });

    if (!query || !query.customer?.whatsappNumber) {
      return { success: false, error: 'Invalid query or missing customer WhatsApp' };
    }

    const params = {
      to: query.customer.whatsappNumber,
      templateName: 'booking_confirmation',
      languageCode: 'en',
      bodyParams: [
        query.customer.name || 'Customer',
        query.tourPackage?.name || 'Tour Package',
        query.startDate ? new Date(query.startDate).toLocaleDateString() : 'TBD',
        query.id.substring(0, 8).toUpperCase(),
      ],
      context: {
        type: 'tourPackageQuery',
        id: tourPackageQueryId,
      },
      saveToDb: true,
    };

    return sendWhatsAppTemplate(params);
  }

  /**
   * Send inquiry acknowledgment
   */
  static async sendInquiryAcknowledgment(inquiryId: string) {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
    });

    if (!inquiry || !inquiry.whatsappNumber) {
      return { success: false, error: 'Invalid inquiry or missing WhatsApp' };
    }

    const params = {
      to: inquiry.whatsappNumber,
      templateName: 'inquiry_received',
      languageCode: 'en',
      bodyParams: [
        inquiry.name || 'Customer',
        inquiry.destination || 'your destination',
      ],
      context: {
        type: 'inquiry',
        id: inquiryId,
      },
      saveToDb: true,
    };

    return sendWhatsAppTemplate(params);
  }

  /**
   * Send follow-up message after X days
   */
  static async scheduleFollowUp(params: {
    customerId: string;
    contextType: string;
    contextId: string;
    daysDelay: number;
  }) {
    const customer = await prisma.customer.findUnique({
      where: { id: params.customerId },
    });

    if (!customer?.whatsappNumber) {
      return { success: false, error: 'Customer WhatsApp not found' };
    }

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + params.daysDelay);

    return MessageQueue.enqueue({
      to: customer.whatsappNumber,
      templateName: 'follow_up',
      params: {
        name: customer.name,
      },
      contextType: params.contextType,
      contextId: params.contextId,
      options: {
        scheduledFor: scheduledDate,
        priority: 5,
      },
    });
  }

  /**
   * Send payment reminder
   */
  static async sendPaymentReminder(tourPackageQueryId: string) {
    const query = await prisma.tourPackageQuery.findUnique({
      where: { id: tourPackageQueryId },
      include: {
        customer: true,
        tourPackage: true,
      },
    });

    if (!query || !query.customer?.whatsappNumber) {
      return { success: false, error: 'Invalid query or missing customer WhatsApp' };
    }

    const params = {
      to: query.customer.whatsappNumber,
      templateName: 'payment_reminder',
      languageCode: 'en',
      bodyParams: [
        query.customer.name || 'Customer',
        query.totalPrice?.toString() || '0',
        query.id.substring(0, 8).toUpperCase(),
      ],
      context: {
        type: 'tourPackageQuery',
        id: tourPackageQueryId,
      },
      saveToDb: true,
    };

    return sendWhatsAppTemplate(params);
  }

  /**
   * Send tour details/itinerary
   */
  static async sendTourDetails(tourPackageQueryId: string) {
    const query = await prisma.tourPackageQuery.findUnique({
      where: { id: tourPackageQueryId },
      include: {
        customer: true,
        tourPackage: true,
      },
    });

    if (!query || !query.customer?.whatsappNumber) {
      return { success: false, error: 'Invalid query or missing customer WhatsApp' };
    }

    const params = {
      to: query.customer.whatsappNumber,
      templateName: 'tour_details',
      languageCode: 'en',
      bodyParams: [
        query.customer.name || 'Customer',
        query.tourPackage?.name || 'Tour Package',
        query.startDate ? new Date(query.startDate).toLocaleDateString() : 'TBD',
      ],
      context: {
        type: 'tourPackageQuery',
        id: tourPackageQueryId,
      },
      saveToDb: true,
    };

    return sendWhatsAppTemplate(params);
  }

  /**
   * Send welcome message to new customer
   */
  static async sendWelcomeMessage(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer?.whatsappNumber) {
      return { success: false, error: 'Customer WhatsApp not found' };
    }

    const params = {
      to: customer.whatsappNumber,
      templateName: 'welcome_message',
      languageCode: 'en',
      bodyParams: [
        customer.name || 'Customer',
      ],
      context: {
        type: 'customer',
        id: customerId,
      },
      saveToDb: true,
    };

    return sendWhatsAppTemplate(params);
  }

  /**
   * Bulk send promotional message
   */
  static async sendBulkPromotion(params: {
    customerIds: string[];
    templateName: string;
    templateParams?: Record<string, any>;
  }) {
    const customers = await prisma.customer.findMany({
      where: {
        id: { in: params.customerIds },
        whatsappNumber: { not: null },
      },
    });

    const results = [];

    for (const customer of customers) {
      const result = await MessageQueue.enqueue({
        to: customer.whatsappNumber!,
        templateName: params.templateName,
        params: params.templateParams || {},
        contextType: 'promotion',
        contextId: customer.id,
        options: {
          priority: 1,
        },
      });

      results.push(result);
    }

    return {
      success: true,
      queued: results.length,
      results,
    };
  }
}
```

---

## 📝 Implementation Plan

### Phase 1: Database Migration (Week 1)

1. **Create migration files**
   ```bash
   npx prisma migrate dev --name whatsapp_redesign
   ```

2. **Update Prisma schema**
   - Add new models: `WhatsAppQueue`, `WhatsAppConfig`
   - Update `WhatsAppMessage` with new fields
   - Update `WhatsAppTemplate` with new fields
   - Add indexes for performance

3. **Run migration**
   ```bash
   npx prisma migrate deploy
   ```

### Phase 2: Core Library (Week 1-2)

1. **Create new library structure**
   ```
   src/lib/whatsapp/
   ├── index.ts
   ├── client.ts
   ├── templates.ts
   ├── messages.ts
   ├── queue.ts
   ├── webhooks.ts
   ├── workflows.ts
   └── types.ts
   ```

2. **Implement core classes**
   - `WhatsAppClient`: Meta API wrapper
   - `TemplateManager`: Template CRUD & sync
   - `MessageQueue`: Queue management
   - `WhatsAppWorkflows`: Automated workflows

3. **Update existing** `src/lib/whatsapp.ts`
   - Keep for backward compatibility
   - Import from new modular library
   - Add deprecation warnings

### Phase 3: API Routes (Week 2)

1. **Update existing routes**
   - `/api/whatsapp/send` - Use new library
   - `/api/whatsapp/send-template` - Use TemplateManager
   - `/api/whatsapp/webhook` - Enhanced handling

2. **Create new routes**
   - `/api/whatsapp/templates/sync` - Sync from Meta
   - `/api/whatsapp/templates/list` - Get all templates
   - `/api/whatsapp/queue/process` - Process queue
   - `/api/whatsapp/queue/stats` - Queue statistics
   - `/api/whatsapp/workflows/[workflow]` - Trigger workflows

### Phase 4: Automated Workflows (Week 3)

1. **Implement workflow triggers**
   - Booking confirmation (on query creation)
   - Inquiry acknowledgment (on inquiry creation)
   - Payment reminder (scheduled)
   - Follow-up messages (scheduled)

2. **Create background job**
   - Queue processor (runs every 5 minutes)
   - Use Vercel Cron or dedicated worker
   - Process pending & scheduled messages

3. **Add workflow configuration**
   - Enable/disable per organization
   - Customize templates per workflow
   - Set scheduling rules

### Phase 5: UI Integration (Week 3-4)

1. **Settings page enhancements**
   - Template management UI
   - Message history with filters
   - Queue monitoring dashboard
   - Workflow configuration

2. **Tour Package Query page**
   - "Send WhatsApp" button
   - Quick template selector
   - Message preview
   - Send confirmation

3. **Customer management**
   - WhatsApp quick send
   - Message history per customer
   - Bulk message interface

### Phase 6: Testing & Deployment (Week 4)

1. **Unit tests**
   - Test all core classes
   - Mock Meta API responses
   - Test queue processing

2. **Integration tests**
   - End-to-end workflows
   - Webhook handling
   - Database operations

3. **Production deployment**
   - Deploy with feature flags
   - Monitor error rates
   - Gradual rollout

---

## 🧪 Testing Strategy

### Unit Tests

**File**: `__tests__/lib/whatsapp/client.test.ts`

```typescript
import { WhatsAppClient } from '@/lib/whatsapp/client';

describe('WhatsAppClient', () => {
  let client: WhatsAppClient;

  beforeEach(() => {
    client = new WhatsAppClient({
      phoneNumberId: '123456789',
      accessToken: 'test-token',
    });
  });

  test('normalizes phone number correctly', () => {
    // Test implementation
  });

  test('sends text message successfully', async () => {
    // Mock fetch
    // Test implementation
  });

  test('handles API errors gracefully', async () => {
    // Test implementation
  });
});
```

### Integration Tests

**File**: `__tests__/lib/whatsapp/workflows.test.ts`

```typescript
import { WhatsAppWorkflows } from '@/lib/whatsapp/workflows';
import prisma from '@/lib/prismadb';

describe('WhatsAppWorkflows', () => {
  test('sends booking confirmation', async () => {
    // Create test data
    // Call workflow
    // Assert message sent
  });

  test('schedules follow-up message', async () => {
    // Create test data
    // Schedule message
    // Assert queued correctly
  });
});
```

### E2E Tests

**File**: `__tests__/e2e/whatsapp-flow.test.ts`

```typescript
describe('WhatsApp End-to-End Flow', () => {
  test('complete booking flow', async () => {
    // 1. Create tour package query
    // 2. Trigger booking confirmation
    // 3. Verify message sent
    // 4. Verify webhook updates status
    // 5. Check database records
  });
});
```

---

## 🚀 Deployment Guide

### Environment Setup

```bash
# Required
META_WHATSAPP_PHONE_NUMBER_ID=131371496722301
META_WHATSAPP_ACCESS_TOKEN=EAAVramq...
META_WHATSAPP_BUSINESS_ACCOUNT_ID=139266579261557

# Optional
META_GRAPH_API_VERSION=v22.0
META_APP_ID=1525479681923301
META_APP_SECRET=your_app_secret
META_WEBHOOK_VERIFY_TOKEN=your_webhook_token
WHATSAPP_DEBUG=0

# Feature Flags
ENABLE_WHATSAPP_AUTOMATION=true
ENABLE_MESSAGE_QUEUE=true
```

### Vercel Cron Setup

**File**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/whatsapp/queue/process",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/whatsapp/templates/sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Webhook Configuration

1. **Meta Dashboard Setup**
   - Go to WhatsApp > Configuration > Webhooks
   - Callback URL: `https://yourdomain.com/api/whatsapp/webhook`
   - Verify Token: (from `META_WEBHOOK_VERIFY_TOKEN`)
   - Subscribe to: `messages`, `message_status`

2. **Test webhook**
   ```bash
   curl -X POST https://yourdomain.com/api/whatsapp/webhook \
     -H 'Content-Type: application/json' \
     -d '{"object":"whatsapp_business_account","entry":[]}'
   ```

### Monitoring

1. **Setup monitoring**
   - Track message success rate
   - Monitor queue size
   - Alert on high error rates

2. **Logging**
   - Use structured logging
   - Log all API calls
   - Track webhook events

3. **Analytics**
   - Message delivery rates
   - Template usage statistics
   - Response times

---

## 📊 Success Metrics

- ✅ **100% Meta API migration** (remove all legacy code)
- ✅ **Template sync** working automatically
- ✅ **Automated workflows** for all booking events
- ✅ **<1% message failure** rate
- ✅ **Queue processing** <5 minutes
- ✅ **Webhook** status updates working
- ✅ **Multi-org** support ready

---

## 🎓 Best Practices

1. **Always use templates** for outbound messages
2. **Queue bulk messages** instead of sending directly
3. **Handle webhook events** for real-time status
4. **Sync templates daily** from Meta
5. **Monitor queue size** and process regularly
6. **Use context fields** to link messages to records
7. **Implement retry logic** for failed messages
8. **Validate phone numbers** before sending
9. **Respect rate limits** (80 msg/second for marketing)
10. **Test with approved templates** before production

---

## 🔗 Related Documentation

- [Meta WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/business-management-api)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Webhook Reference](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
- [Rate Limits](https://developers.facebook.com/docs/graph-api/overview/rate-limiting)

---

**Document Version**: 1.0  
**Last Updated**: October 4, 2025  
**Status**: Ready for Implementation  
**Estimated Timeline**: 4 weeks

