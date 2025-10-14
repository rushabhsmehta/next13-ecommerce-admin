# WhatsApp Campaigns & Catalog - Comprehensive Design Document

**Date:** October 11, 2025  
**Status:** Design & Planning Phase

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Meta WhatsApp Official Capabilities](#meta-whatsapp-official-capabilities)
3. [Database Schema Design](#database-schema-design)
4. [Campaign Management](#campaign-management)
5. [Catalog & Commerce](#catalog--commerce)
6. [Architecture & Technical Design](#architecture--technical-design)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Compliance & Best Practices](#compliance--best-practices)

---

## Executive Summary

### What We're Building

**Two Major Features:**

1. **Campaign Management System**
   - Send template messages to multiple customers (bulk messaging)
   - Schedule campaigns for future delivery
   - Track delivery, open rates, and responses
   - Segment audiences and target specific customer groups
   - A/B testing for templates

2. **Product Catalog Integration**
   - Manage products within WhatsApp
   - Send product cards and multi-product messages
   - Handle orders and carts through WhatsApp
   - Sync with Meta Commerce Manager
   - Track product performance

### Business Value

| Feature | Value |
|---------|-------|
| **Campaign Management** | Reach 1000+ customers in minutes instead of hours |
| **Segmentation** | Target specific customer groups (e.g., "Customers who booked Bali in last 6 months") |
| **Scheduling** | Set and forget - campaigns run automatically |
| **Analytics** | Know exactly what works (delivery rate, read rate, CTR) |
| **Product Catalog** | Showcase tour packages directly in WhatsApp |
| **Cart & Orders** | Customers can browse and order without leaving chat |

---

## Meta WhatsApp Official Capabilities

### 1. Template Messages (Campaigns)

**What Meta Allows:**

✅ **Marketing Templates**
- Send promotional messages to opted-in customers
- Must use pre-approved templates
- Subject to per-user marketing limits
- Template pacing applies (gradual rollout for new templates)

❌ **Limitations:**
- Cannot send to US phone numbers after April 1, 2025
- Per-user limit (varies based on engagement)
- Template must be approved by Meta
- Marketing conversation charges apply

**Error Codes to Handle:**
- `131049`: Per-user marketing limit reached
- `131050`: User stopped marketing messages
- `100`: Invalid template
- `131026`: Message undeliverable

### 2. Product Catalog (Commerce)

**What Meta Provides:**

✅ **Catalog Management**
- Upload products via API or Commerce Manager
- Support for single and multi-product messages
- In-chat cart and checkout
- Order tracking via webhooks

✅ **Product Features:**
- Product images, descriptions, prices
- Categories and variants
- Inventory management
- Currency support

❌ **Requirements:**
- Must connect ecommerce catalog to WABA
- Products subject to Commerce Policy review
- Must comply with WhatsApp Commerce Policies

**Message Types:**
- Single Product Message
- Multi-Product Message (up to 30 products)
- Product list messages

---

## Database Schema Design

### Campaign Tables

#### WhatsAppCampaign

```prisma
model WhatsAppCampaign {
  id              String   @id @default(uuid())
  name            String   // "Bali Summer Promotion 2025"
  description     String?
  
  // Template Configuration
  templateId      String
  templateName    String
  templateLanguage String  @default("en_US")
  templateVariables Json?  // Dynamic variables for template
  
  // Targeting
  targetType      String   // "all", "segment", "manual", "imported"
  segmentQuery    Json?    // Saved query for dynamic segments
  
  // Scheduling
  status          String   @default("draft") // draft, scheduled, sending, completed, cancelled, failed
  scheduledFor    DateTime?
  startedAt       DateTime?
  completedAt     DateTime?
  
  // Settings
  rateLimit       Int      @default(10) // Messages per minute
  retryFailed     Boolean  @default(true)
  maxRetries      Int      @default(3)
  
  // Stats (cached)
  totalRecipients Int      @default(0)
  sentCount       Int      @default(0)
  deliveredCount  Int      @default(0)
  readCount       Int      @default(0)
  failedCount     Int      @default(0)
  respondedCount  Int      @default(0)
  
  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String?  // User ID who created it
  organizationId  String?
  tags            String[] // For categorization
  
  // Relations
  recipients      WhatsAppCampaignRecipient[]
  messages        WhatsAppMessage[] @relation("CampaignMessages")
  
  @@index([status])
  @@index([scheduledFor])
  @@index([createdAt])
  @@index([organizationId])
}
```

#### WhatsAppCampaignRecipient

```prisma
model WhatsAppCampaignRecipient {
  id              String   @id @default(uuid())
  campaignId      String
  
  // Recipient Info
  phoneNumber     String   // E.164 format
  customerId      String?  // Link to Customer model
  name            String?
  
  // Template Variables (personalization)
  variables       Json?    // {"name": "John", "package": "Bali Premium"}
  
  // Sending Status
  status          String   @default("pending") // pending, sending, sent, delivered, read, failed, responded, opted_out
  sentAt          DateTime?
  deliveredAt     DateTime?
  readAt          DateTime?
  failedAt        DateTime?
  
  // Error Handling
  errorCode       String?
  errorMessage    String?
  retryCount      Int      @default(0)
  lastRetryAt     DateTime?
  
  // Response Tracking
  respondedAt     DateTime?
  responseMessage String?
  
  // Message Reference
  messageId       String?  // WhatsApp message ID (wamid)
  messageSid      String?  // Our internal message ID
  
  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  campaign        WhatsAppCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  customer        Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  message         WhatsAppMessage? @relation(fields: [messageSid], references: [id])
  
  @@index([campaignId])
  @@index([status])
  @@index([customerId])
  @@index([phoneNumber])
}
```

### Catalog Tables

#### WhatsAppCatalog

```prisma
model WhatsAppCatalog {
  id                  String   @id @default(uuid())
  
  // Meta Integration
  metaCatalogId       String?  @unique // Meta Commerce Manager catalog ID
  
  // Basic Info
  name                String
  description         String?
  currency            String   @default("INR")
  
  // Settings
  isActive            Boolean  @default(true)
  isPublic            Boolean  @default(false)
  autoSync            Boolean  @default(false) // Auto-sync with Meta Commerce Manager
  lastSyncAt          DateTime?
  
  // Configuration
  businessCategoryId  String?  // E.g., "Travel", "Tours"
  defaultImageUrl     String?
  
  // Stats
  totalProducts       Int      @default(0)
  activeProducts      Int      @default(0)
  totalOrders         Int      @default(0)
  totalRevenue        Decimal  @default(0) @db.Decimal(10, 2)
  
  // Metadata
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  organizationId      String?
  
  // Relations
  products            WhatsAppProduct[]
  
  @@index([metaCatalogId])
  @@index([organizationId])
}
```

#### WhatsAppProduct

```prisma
model WhatsAppProduct {
  id                String   @id @default(uuid())
  catalogId         String
  
  // Meta Integration
  metaProductId     String?  @unique // Meta product ID (retailer_id)
  
  // Basic Info
  sku               String   @unique
  name              String
  description       String?  @db.Text
  
  // Pricing
  price             Decimal  @db.Decimal(10, 2)
  salePrice         Decimal? @db.Decimal(10, 2)
  currency          String   @default("INR")
  
  // Inventory
  availability      String   @default("in_stock") // in_stock, out_of_stock, preorder
  quantity          Int?
  
  // Media
  imageUrl          String?
  imageUrls         String[] // Multiple images
  videoUrl          String?
  
  // Organization
  category          String?
  brand             String?
  condition         String   @default("new") // new, refurbished
  
  // Variants (for tour packages)
  hasVariants       Boolean  @default(false)
  variantOptions    Json?    // e.g., {"duration": ["3 days", "5 days"], "accommodation": ["Standard", "Premium"]}
  
  // SEO & Discovery
  tags              String[]
  url               String?  // Product page URL
  
  // Status
  isActive          Boolean  @default(true)
  isVisible         Boolean  @default(true)
  
  // Stats
  viewCount         Int      @default(0)
  shareCount        Int      @default(0)
  cartAddCount      Int      @default(0)
  purchaseCount     Int      @default(0)
  
  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  lastSyncAt        DateTime?
  
  // Relations
  catalog           WhatsAppCatalog @relation(fields: [catalogId], references: [id], onDelete: Cascade)
  variants          WhatsAppProductVariant[]
  cartItems         WhatsAppCartItem[]
  orderItems        WhatsAppOrderItem[]
  messages          WhatsAppMessage[] @relation("ProductMessages")
  
  @@index([catalogId])
  @@index([metaProductId])
  @@index([sku])
  @@index([isActive, isVisible])
}
```

#### WhatsAppProductVariant

```prisma
model WhatsAppProductVariant {
  id                String   @id @default(uuid())
  productId         String
  
  // Variant Info
  sku               String   @unique
  name              String   // "Bali 5 Days Premium Package"
  options           Json     // {"duration": "5 days", "accommodation": "Premium"}
  
  // Pricing
  price             Decimal  @db.Decimal(10, 2)
  salePrice         Decimal? @db.Decimal(10, 2)
  
  // Inventory
  availability      String   @default("in_stock")
  quantity          Int?
  
  // Media
  imageUrl          String?
  
  // Status
  isActive          Boolean  @default(true)
  
  // Stats
  purchaseCount     Int      @default(0)
  
  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  product           WhatsAppProduct @relation(fields: [productId], references: [id], onDelete: Cascade)
  cartItems         WhatsAppCartItem[]
  orderItems        WhatsAppOrderItem[]
  
  @@index([productId])
  @@index([sku])
}
```

### Order & Cart Tables

#### WhatsAppCart

```prisma
model WhatsAppCart {
  id                String   @id @default(uuid())
  
  // Customer Info
  phoneNumber       String
  customerId        String?
  sessionId         String?  // WhatsAppSession ID
  
  // Status
  status            String   @default("active") // active, checkout, converted, abandoned
  
  // Totals
  subtotal          Decimal  @default(0) @db.Decimal(10, 2)
  tax               Decimal  @default(0) @db.Decimal(10, 2)
  discount          Decimal  @default(0) @db.Decimal(10, 2)
  total             Decimal  @default(0) @db.Decimal(10, 2)
  
  // Checkout
  checkoutAt        DateTime?
  abandonedAt       DateTime?
  convertedAt       DateTime?
  
  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  expiresAt         DateTime? // Auto-expire after X days
  
  // Relations
  customer          Customer? @relation(fields: [customerId], references: [id])
  session           WhatsAppSession? @relation(fields: [sessionId], references: [id])
  items             WhatsAppCartItem[]
  order             WhatsAppOrder?
  
  @@index([phoneNumber])
  @@index([status])
  @@index([customerId])
}
```

#### WhatsAppCartItem

```prisma
model WhatsAppCartItem {
  id                String   @id @default(uuid())
  cartId            String
  
  // Product Info
  productId         String
  variantId         String?
  
  // Quantity & Pricing
  quantity          Int      @default(1)
  unitPrice         Decimal  @db.Decimal(10, 2)
  totalPrice        Decimal  @db.Decimal(10, 2)
  
  // Customization
  notes             String?
  customFields      Json?
  
  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  cart              WhatsAppCart @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product           WhatsAppProduct @relation(fields: [productId], references: [id])
  variant           WhatsAppProductVariant? @relation(fields: [variantId], references: [id])
  
  @@index([cartId])
  @@index([productId])
}
```

#### WhatsAppOrder

```prisma
model WhatsAppOrder {
  id                String   @id @default(uuid())
  orderNumber       String   @unique // "ORD-2025-001234"
  
  // Customer Info
  cartId            String   @unique
  phoneNumber       String
  customerId        String?
  
  // Contact Info
  customerName      String
  customerEmail     String?
  
  // Order Details
  status            String   @default("pending") // pending, confirmed, processing, completed, cancelled, refunded
  
  // Pricing
  subtotal          Decimal  @db.Decimal(10, 2)
  tax               Decimal  @db.Decimal(10, 2)
  discount          Decimal  @db.Decimal(10, 2)
  shippingFee       Decimal  @default(0) @db.Decimal(10, 2)
  total             Decimal  @db.Decimal(10, 2)
  currency          String   @default("INR")
  
  // Payment
  paymentStatus     String   @default("unpaid") // unpaid, partial, paid, refunded
  paymentMethod     String?  // "whatsapp_pay", "razorpay", "bank_transfer"
  paidAmount        Decimal  @default(0) @db.Decimal(10, 2)
  
  // Fulfillment
  fulfillmentStatus String   @default("unfulfilled") // unfulfilled, partially_fulfilled, fulfilled
  shippingAddress   Json?
  billingAddress    Json?
  
  // Tracking
  trackingNumber    String?
  estimatedDelivery DateTime?
  deliveredAt       DateTime?
  
  // Notes
  customerNotes     String?
  internalNotes     String?
  
  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  confirmedAt       DateTime?
  cancelledAt       DateTime?
  
  // Relations
  cart              WhatsAppCart @relation(fields: [cartId], references: [id])
  customer          Customer? @relation(fields: [customerId], references: [id])
  items             WhatsAppOrderItem[]
  
  @@index([orderNumber])
  @@index([status])
  @@index([customerId])
  @@index([phoneNumber])
  @@index([createdAt])
}
```

#### WhatsAppOrderItem

```prisma
model WhatsAppOrderItem {
  id                String   @id @default(uuid())
  orderId           String
  
  // Product Info
  productId         String
  variantId         String?
  
  // Snapshot (preserve data even if product deleted)
  productName       String
  productSku        String
  productImage      String?
  variantOptions    Json?
  
  // Quantity & Pricing
  quantity          Int
  unitPrice         Decimal  @db.Decimal(10, 2)
  totalPrice        Decimal  @db.Decimal(10, 2)
  
  // Fulfillment
  fulfillmentStatus String   @default("unfulfilled")
  fulfilledQuantity Int      @default(0)
  
  // Customization
  notes             String?
  customFields      Json?
  
  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  order             WhatsAppOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product           WhatsAppProduct @relation(fields: [productId], references: [id])
  variant           WhatsAppProductVariant? @relation(fields: [variantId], references: [id])
  
  @@index([orderId])
  @@index([productId])
}
```

### Update Existing Models

#### Add to WhatsAppMessage

```prisma
// Add these fields to existing WhatsAppMessage model
model WhatsAppMessage {
  // ... existing fields ...
  
  campaignId        String?
  campaign          WhatsAppCampaign? @relation("CampaignMessages", fields: [campaignId], references: [id])
  
  recipients        WhatsAppCampaignRecipient[]
  
  // Product messaging
  productIds        String[] // IDs of products mentioned
  products          WhatsAppProduct[] @relation("ProductMessages")
  
  @@index([campaignId])
}
```

#### Add to Customer

```prisma
// Add these fields to existing Customer model
model Customer {
  // ... existing fields ...
  
  // WhatsApp Campaign Relations
  campaignRecipients WhatsAppCampaignRecipient[]
  whatsappCarts      WhatsAppCart[]
  whatsappOrders     WhatsAppOrder[]
  
  // Preferences
  marketingOptIn     Boolean  @default(true)
  marketingOptInAt   DateTime?
  marketingOptOutAt  DateTime?
}
```

---

## Campaign Management

### Campaign Creation Flow

```
1. Create Campaign
   ↓
2. Select Template
   ↓
3. Choose Recipients (Segment/Import/Manual)
   ↓
4. Personalize Variables
   ↓
5. Schedule (Now/Later/Recurring)
   ↓
6. Review & Confirm
   ↓
7. Send/Schedule
```

### Recipient Segmentation

**Segment Types:**

1. **All Customers** - Send to everyone (with opt-in check)
2. **Customer Segments** - Dynamic queries:
   - "Customers who booked in last 30 days"
   - "Customers who spent > ₹50,000"
   - "Customers interested in 'Bali'"
   - "Customers with upcoming bookings"
3. **Manual Selection** - Pick specific customers
4. **CSV Import** - Upload phone numbers with variables
5. **Previous Campaign Responders** - Target engaged users

**Example Segment Query (JSON):**
```json
{
  "conditions": [
    {
      "field": "saleDetails.destination",
      "operator": "contains",
      "value": "Bali"
    },
    {
      "field": "saleDetails.createdAt",
      "operator": "gte",
      "value": "2024-01-01"
    }
  ],
  "logic": "AND"
}
```

### Campaign Execution Engine

**Processing Logic:**

```typescript
async function processCampaign(campaignId: string) {
  const campaign = await getCampaign(campaignId);
  const recipients = await getRecipients(campaignId, { status: 'pending' });
  
  // Rate limiting: X messages per minute
  const rateLimit = campaign.rateLimit || 10;
  const delayBetweenMessages = (60 / rateLimit) * 1000; // milliseconds
  
  for (const recipient of recipients) {
    try {
      // Check send window (e.g., only send between 9 AM - 9 PM)
      if (!isWithinSendWindow(campaign)) {
        await pause();
        continue;
      }
      
      // Build template with variables
      const templatePayload = buildTemplate(
        campaign.templateName,
        recipient.variables
      );
      
      // Send via Meta API
      const result = await sendWhatsAppTemplate({
        to: recipient.phoneNumber,
        ...templatePayload
      });
      
      // Update recipient status
      await updateRecipient(recipient.id, {
        status: 'sent',
        sentAt: new Date(),
        messageId: result.messageId,
        messageSid: result.dbRecord.id
      });
      
      // Update campaign stats
      await incrementCampaignStat(campaign.id, 'sentCount');
      
    } catch (error) {
      // Handle errors
      await handleSendError(recipient, error, campaign);
    }
    
    // Rate limiting delay
    await sleep(delayBetweenMessages);
  }
  
  // Mark campaign as completed
  await updateCampaign(campaignId, {
    status: 'completed',
    completedAt: new Date()
  });
}
```

### Error Handling & Retries

**Error Scenarios:**

| Error Code | Meaning | Action |
|------------|---------|--------|
| 131049 | Per-user marketing limit | Mark as failed, don't retry for 24h |
| 131050 | User stopped marketing | Mark as opted_out, remove from future campaigns |
| 131047 | 24-hour window expired | Mark as failed (shouldn't happen with templates) |
| 131026 | Undeliverable | Retry up to 3 times with exponential backoff |
| 100 | Invalid template/params | Mark as failed, log for review |

**Retry Logic:**
```typescript
if (shouldRetry(error) && recipient.retryCount < campaign.maxRetries) {
  const retryDelay = Math.pow(2, recipient.retryCount) * 60000; // Exponential backoff
  await scheduleRetry(recipient.id, retryDelay);
}
```

### Campaign Analytics

**Metrics to Track:**

1. **Delivery Metrics**
   - Total Recipients
   - Sent
   - Delivered
   - Failed
   - Opted Out

2. **Engagement Metrics**
   - Read Rate
   - Response Rate
   - Click-through Rate (for button templates)
   - Conversion Rate (if tracking purchases)

3. **Time Metrics**
   - Average Time to Delivery
   - Average Time to Read
   - Average Time to Response

4. **Performance**
   - Cost per Message
   - ROI (if tracking revenue)
   - Best Send Times

---

## Catalog & Commerce

### Product Management

**Product Upload Methods:**

1. **Manual Entry** - Add products one by one via UI
2. **CSV Import** - Bulk import from spreadsheet
3. **API Integration** - Sync from existing system
4. **Meta Commerce Manager Sync** - Two-way sync with Meta

**Product Data Structure:**

```typescript
interface Product {
  // Basic Info
  sku: string;
  name: string;
  description: string;
  
  // Pricing
  price: number;
  salePrice?: number;
  currency: string;
  
  // Media
  imageUrl: string;
  imageUrls?: string[];
  videoUrl?: string;
  
  // Organization
  category: string;
  brand?: string;
  tags: string[];
  
  // Inventory
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  quantity?: number;
  
  // Variants (for tour packages)
  hasVariants: boolean;
  variants?: ProductVariant[];
}
```

### Product Messaging

**Single Product Message:**

```typescript
await sendWhatsAppProduct({
  to: '+919978783238',
  catalogId: 'catalog-123',
  productId: 'bali-package-001',
  body: 'Check out our exclusive Bali package!',
  footer: 'Limited time offer'
});
```

**Multi-Product Message:**

```typescript
await sendWhatsAppProductList({
  to: '+919978783238',
  catalogId: 'catalog-123',
  header: 'Our Top Destinations',
  body: 'Explore our most popular tour packages',
  sections: [
    {
      title: 'International',
      productIds: ['bali-001', 'thailand-001', 'singapore-001']
    },
    {
      title: 'Domestic',
      productIds: ['goa-001', 'kerala-001', 'rajasthan-001']
    }
  ]
});
```

### Cart & Order Flow

**Cart Management:**

```
Customer views products
      ↓
Adds products to cart (via webhook)
      ↓
System creates/updates WhatsAppCart
      ↓
Customer proceeds to checkout
      ↓
System creates WhatsAppOrder
      ↓
Payment processing
      ↓
Order fulfillment
```

**Webhook Handling:**

```typescript
// When customer adds to cart
webhook.on('order', async (data) => {
  const { cart_id, product_items } = data.order;
  
  // Create or update cart
  await upsertCart({
    phoneNumber: data.from,
    items: product_items.map(item => ({
      productId: item.product_retailer_id,
      quantity: item.quantity,
      unitPrice: item.item_price,
      totalPrice: item.item_price * item.quantity
    })),
    total: data.order.order_amount
  });
});

// When customer completes order
webhook.on('order', async (data) => {
  if (data.order.status === 'placed') {
    await createOrder({
      cartId: data.order.cart_id,
      phoneNumber: data.from,
      total: data.order.order_amount,
      status: 'pending'
    });
    
    // Send confirmation message
    await sendOrderConfirmation(data.from, order);
  }
});
```

### Catalog Sync with Meta

**Two-Way Sync:**

```typescript
async function syncCatalogWithMeta(catalogId: string) {
  const catalog = await getCatalog(catalogId);
  
  if (!catalog.metaCatalogId) {
    // Create catalog in Meta Commerce Manager
    const metaCatalog = await createMetaCatalog({
      name: catalog.name,
      vertical: 'commerce'
    });
    
    await updateCatalog(catalogId, {
      metaCatalogId: metaCatalog.id
    });
  }
  
  // Sync products
  const products = await getProducts({ catalogId });
  
  for (const product of products) {
    if (product.metaProductId) {
      // Update existing
      await updateMetaProduct(product.metaProductId, {
        name: product.name,
        price: product.price,
        availability: product.availability,
        image_url: product.imageUrl
      });
    } else {
      // Create new
      const metaProduct = await createMetaProduct(catalog.metaCatalogId, {
        retailer_id: product.sku,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        availability: product.availability,
        image_url: product.imageUrl,
        url: product.url
      });
      
      await updateProduct(product.id, {
        metaProductId: metaProduct.id
      });
    }
  }
  
  await updateCatalog(catalogId, {
    lastSyncAt: new Date()
  });
}
```

---

## Architecture & Technical Design

### System Components

```
┌─────────────────────────────────────────────────────┐
│                   Admin Dashboard                    │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Campaigns  │  │  Products  │  │  Analytics   │  │
│  └────────────┘  └────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────┐
│                    API Layer                         │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Campaign   │  │  Catalog   │  │   Order      │  │
│  │   APIs     │  │    APIs    │  │    APIs      │  │
│  └────────────┘  └────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────┐
│              Business Logic Layer                    │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Campaign   │  │  Product   │  │   Queue      │  │
│  │  Engine    │  │  Manager   │  │   System     │  │
│  └────────────┘  └────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────┐
│                  Data Layer                          │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │  Prisma    │  │   Redis    │  │    S3        │  │
│  │  Database  │  │   Cache    │  │  (Images)    │  │
│  └────────────┘  └────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────┐
│              External Services                       │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │    Meta    │  │  Commerce  │  │   Payment    │  │
│  │   WhatsApp │  │  Manager   │  │  Gateway     │  │
│  └────────────┘  └────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Queue System for Bulk Sending

**Why We Need a Queue:**

1. **Rate Limiting** - Meta limits messages per second
2. **Reliability** - Retry failed messages
3. **Scalability** - Handle thousands of messages
4. **Monitoring** - Track progress in real-time

**Queue Options:**

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **BullMQ** | Redis-based, robust, retries | Requires Redis | ⭐ **Best** |
| **Database Queue** | Simple, no extra service | Slower, polling | Good for start |
| **Vercel Cron** | Built-in, serverless | Limited execution time | Not suitable |

**BullMQ Implementation:**

```typescript
import { Queue, Worker } from 'bullmq';

// Create queue
const campaignQueue = new Queue('whatsapp-campaign', {
  connection: redisConnection
});

// Add jobs to queue
async function scheduleCampaign(campaignId: string) {
  const recipients = await getRecipients(campaignId, { status: 'pending' });
  
  for (const recipient of recipients) {
    await campaignQueue.add('send-message', {
      campaignId,
      recipientId: recipient.id,
      phoneNumber: recipient.phoneNumber,
      templateName: campaign.templateName,
      variables: recipient.variables
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000 // Start with 1 minute
      },
      removeOnComplete: true,
      removeOnFail: false
    });
  }
}

// Process queue
const worker = new Worker('whatsapp-campaign', async (job) => {
  const { recipientId, phoneNumber, templateName, variables } = job.data;
  
  try {
    const result = await sendWhatsAppTemplate({
      to: phoneNumber,
      templateName,
      variables
    });
    
    await updateRecipient(recipientId, {
      status: 'sent',
      sentAt: new Date(),
      messageId: result.messageId
    });
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    // Let BullMQ handle retries
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 10, // Process 10 messages at a time
  limiter: {
    max: 10, // 10 messages
    duration: 60000 // per minute
  }
});
```

### API Endpoints

#### Campaign APIs

```typescript
// POST /api/whatsapp/campaigns
// Create new campaign
{
  name: "Bali Summer 2025",
  templateName: "tour_package_marketing",
  targetType: "segment",
  segmentQuery: {...},
  scheduledFor: "2025-06-01T10:00:00Z"
}

// GET /api/whatsapp/campaigns
// List all campaigns
// Query: ?status=completed&page=1&limit=20

// GET /api/whatsapp/campaigns/[id]
// Get campaign details with stats

// POST /api/whatsapp/campaigns/[id]/send
// Start sending campaign (if scheduled)

// PUT /api/whatsapp/campaigns/[id]
// Update campaign (only if status=draft)

// DELETE /api/whatsapp/campaigns/[id]
// Cancel/delete campaign

// GET /api/whatsapp/campaigns/[id]/recipients
// List campaign recipients with status
// Query: ?status=failed&page=1&limit=50

// POST /api/whatsapp/campaigns/[id]/recipients
// Add recipients to campaign
{
  recipients: [
    { phoneNumber: "+91...", variables: {...} }
  ]
}

// GET /api/whatsapp/campaigns/[id]/stats
// Get detailed analytics
```

#### Catalog APIs

```typescript
// POST /api/whatsapp/catalogs
// Create catalog
{
  name: "Tour Packages",
  currency: "INR"
}

// GET /api/whatsapp/catalogs
// List catalogs

// GET /api/whatsapp/catalogs/[id]
// Get catalog with products

// POST /api/whatsapp/catalogs/[id]/sync
// Sync with Meta Commerce Manager

// POST /api/whatsapp/catalogs/[id]/products
// Add product
{
  sku: "BALI-2025-001",
  name: "Bali Paradise Package",
  description: "5 days...",
  price: 45000,
  imageUrl: "https://...",
  category: "International"
}

// PUT /api/whatsapp/catalogs/[id]/products/[productId]
// Update product

// DELETE /api/whatsapp/catalogs/[id]/products/[productId]
// Delete product

// POST /api/whatsapp/catalogs/[id]/products/import
// Bulk import from CSV
```

#### Product Messaging APIs

```typescript
// POST /api/whatsapp/send-product
// Send single product message
{
  to: "+91...",
  catalogId: "...",
  productId: "...",
  body: "Check this out!",
  footer: "Limited time offer"
}

// POST /api/whatsapp/send-product-list
// Send multi-product message
{
  to: "+91...",
  catalogId: "...",
  header: "Top Packages",
  body: "Our best sellers",
  sections: [...]
}
```

#### Order APIs

```typescript
// GET /api/whatsapp/orders
// List orders
// Query: ?status=pending&page=1

// GET /api/whatsapp/orders/[id]
// Get order details

// PUT /api/whatsapp/orders/[id]/status
// Update order status
{
  status: "confirmed",
  notes: "Confirmed via phone"
}

// POST /api/whatsapp/orders/[id]/fulfill
// Mark items as fulfilled
{
  items: [
    { itemId: "...", quantity: 1 }
  ]
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goals:**
- Database schema ready
- Basic APIs functional
- Queue system setup

**Tasks:**
1. ✅ Add Prisma models to schema
2. ✅ Run migrations
3. ✅ Set up Redis (BullMQ)
4. ✅ Create basic API endpoints
5. ✅ Test with sample data

**Deliverables:**
- Database tables created
- Campaign CRUD APIs
- Catalog CRUD APIs
- Queue infrastructure

### Phase 2: Campaign Management (Week 3-4)

**Goals:**
- Send campaigns to multiple recipients
- Track delivery and engagement
- Handle errors gracefully

**Tasks:**
1. ✅ Build recipient selection UI
2. ✅ Implement bulk sender with queue
3. ✅ Add error handling & retries
4. ✅ Create campaign dashboard
5. ✅ Build analytics view

**Deliverables:**
- Working campaign system
- Admin UI for campaigns
- Real-time progress tracking
- Analytics dashboard

### Phase 3: Product Catalog (Week 5-6)

**Goals:**
- Manage products in system
- Sync with Meta Commerce Manager
- Send product messages

**Tasks:**
1. ✅ Build product management UI
2. ✅ Implement CSV import
3. ✅ Create Meta sync functionality
4. ✅ Build product messaging
5. ✅ Test with real products

**Deliverables:**
- Product catalog UI
- Meta sync working
- Product messaging functional
- CSV import/export

### Phase 4: Orders & Cart (Week 7-8)

**Goals:**
- Track carts and orders from WhatsApp
- Process orders
- Send order confirmations

**Tasks:**
1. ✅ Implement cart webhooks
2. ✅ Build order management UI
3. ✅ Create order confirmation flow
4. ✅ Add fulfillment tracking
5. ✅ Test end-to-end

**Deliverables:**
- Cart tracking
- Order management system
- Order confirmation messages
- Fulfillment workflow

### Phase 5: Advanced Features (Week 9-10)

**Goals:**
- Scheduled campaigns
- A/B testing
- Advanced analytics

**Tasks:**
1. ✅ Add campaign scheduling
2. ✅ Implement A/B testing
3. ✅ Build advanced reports
4. ✅ Add automation rules
5. ✅ Performance optimization

**Deliverables:**
- Scheduled campaigns
- A/B test framework
- Comprehensive analytics
- Automation workflows

---

## Compliance & Best Practices

### Meta WhatsApp Policies

**Must Follow:**

1. **Opt-In Required**
   - Get explicit consent before sending marketing
   - Provide opt-out mechanism
   - Honor opt-out requests immediately

2. **Template Pacing**
   - New templates roll out gradually
   - Plan campaigns accordingly
   - Monitor template quality ratings

3. **Per-User Limits**
   - Respect Meta's per-user marketing limits
   - Don't retry immediately on error 131049
   - Wait 24 hours before retry

4. **US Phone Numbers**
   - NO marketing messages to US numbers after April 1, 2025
   - Check country code before sending
   - Filter out +1 numbers

5. **Quality Rating**
   - Monitor template quality scores
   - High-quality templates get better delivery
   - Paused templates won't send

### Data Privacy (GDPR/India Data Protection)

**Requirements:**

1. **Consent Management**
   - Store opt-in timestamp
   - Allow easy opt-out
   - Don't sell customer data

2. **Data Retention**
   - Delete campaign data after X months
   - Provide data export
   - Allow data deletion requests

3. **Security**
   - Encrypt sensitive data
   - Secure API access
   - Audit log all access

### Best Practices

**Campaign Best Practices:**

1. **Timing**
   - Send between 9 AM - 9 PM
   - Avoid weekends (unless relevant)
   - Consider time zones

2. **Frequency**
   - Max 1-2 marketing messages per week
   - Don't spam customers
   - Monitor engagement rates

3. **Personalization**
   - Use customer name
   - Reference past purchases
   - Segment by interest

4. **Content**
   - Clear call-to-action
   - Relevant offers
   - Professional tone

**Catalog Best Practices:**

1. **Product Images**
   - High quality (at least 1024x1024)
   - Square aspect ratio
   - No watermarks

2. **Descriptions**
   - Clear and concise
   - Include key details
   - SEO-friendly

3. **Pricing**
   - Always show currency
   - Update regularly
   - Show sale prices separately

4. **Inventory**
   - Keep stock levels updated
   - Mark out-of-stock items
   - Auto-sync if possible

---

## Next Steps

### Immediate Actions

1. **Review This Document**
   - Stakeholder feedback
   - Technical review
   - Priority adjustment

2. **Finalize Requirements**
   - Confirm features needed
   - Set timeline expectations
   - Allocate resources

3. **Set Up Infrastructure**
   - Redis server for queue
   - S3 for product images
   - Monitoring tools

4. **Start Phase 1**
   - Create database schema
   - Build basic APIs
   - Set up development environment

### Questions to Answer

1. **Scale**
   - How many customers in database?
   - Expected campaign size?
   - How many products initially?

2. **Integration**
   - Do you use Meta Commerce Manager?
   - Need integration with existing CRM?
   - Payment gateway preference?

3. **Resources**
   - Development team size?
   - Timeline flexibility?
   - Budget for infrastructure?

---

## Conclusion

This comprehensive system will enable:

✅ **Bulk Messaging** - Reach thousands of customers efficiently  
✅ **Smart Segmentation** - Target the right customers  
✅ **Product Showcase** - Sell directly in WhatsApp  
✅ **Order Management** - Track purchases end-to-end  
✅ **Analytics** - Know what works  
✅ **Automation** - Set and forget campaigns  

**Estimated Timeline:** 10 weeks for full implementation  
**Complexity:** High (but manageable with phased approach)  
**ROI:** High (better customer engagement, more sales, time saved)

Ready to start building! 🚀
