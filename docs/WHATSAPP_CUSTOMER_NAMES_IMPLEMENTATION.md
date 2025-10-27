# WhatsApp Customer Names in Chat Interface

## Overview
This implementation adds customer name display in the WhatsApp chat interface, showing saved customer names from the `WhatsAppCustomer` database alongside phone numbers in both the chat list sidebar and conversation headers.

## Changes Made

### 1. Database Schema Updates (`schema.prisma`)

#### WhatsAppMessage Model
Added relationship to `WhatsAppCustomer`:
```prisma
model WhatsAppMessage {
  // ... existing fields
  whatsappCustomerId String?
  whatsappCustomer   WhatsAppCustomer? @relation(fields: [whatsappCustomerId], references: [id], onDelete: SetNull)
  
  @@index([whatsappCustomerId])
}
```

#### WhatsAppCustomer Model
Added reverse relationship:
```prisma
model WhatsAppCustomer {
  // ... existing fields
  messages           WhatsAppMessage[]
}
```

### 2. Backend Updates

#### `src/lib/whatsapp.ts`

**Updated `getWhatsAppMessages` function:**
- Now includes `whatsappCustomer` relation in the query
- Returns customer information with each message

**Updated `persistOutboundMessage` function:**
- Automatically links outbound messages to customers based on phone number
- Searches for matching `WhatsAppCustomer` by normalized phone number
- Sets `whatsappCustomerId` when creating message records

### 3. Webhook Handler (`src/app/api/whatsapp/webhook/route.ts`)

**Added `findCustomerByPhone` helper function:**
```typescript
const findCustomerByPhone = async (prisma: any, phoneNumber: string) => {
  // Normalizes phone number and finds matching WhatsAppCustomer
}
```

**Updated incoming message handler:**
- Automatically links incoming messages to customers
- Logs customer name when a match is found
- Creates messages with `whatsappCustomerId` populated

### 4. Frontend Updates (`src/app/(dashboard)/whatsapp/chat/page.tsx`)

**Updated contact building logic:**
- Prioritizes customer names from `WhatsAppCustomer` database
- Falls back to profile names from WhatsApp metadata
- Finally falls back to formatted phone numbers
- Updates contact names when customer data is available

**Display hierarchy:**
1. **First Priority**: Customer name from `WhatsAppCustomer` (firstName + lastName)
2. **Second Priority**: Profile name from WhatsApp contact metadata
3. **Fallback**: Formatted phone number

### 5. Utility Script (`scripts/whatsapp/link-messages-to-customers.js`)

Created a migration script to link existing messages to customers:

**Features:**
- Links historical messages to customers based on phone numbers
- Processes messages in batches for performance
- Provides detailed logging and statistics
- Handles both inbound and outbound messages

**Usage:**
```bash
node scripts/whatsapp/link-messages-to-customers.js
```

## How It Works

### New Messages (Automatic)
1. When a message is received (webhook) or sent (API):
   - Phone number is normalized to E.164 format
   - System searches for matching `WhatsAppCustomer` record
   - If found, `whatsappCustomerId` is automatically populated
   - Message is saved with customer link

### Existing Messages (Manual Migration)
1. Run the migration script to process historical data
2. Script matches phone numbers with customer records
3. Updates existing messages with customer IDs

### Display in Chat Interface
1. Messages are fetched with customer relation included
2. Contact list builder checks for customer data:
   ```typescript
   const customerName = whatsappCustomer 
     ? `${whatsappCustomer.firstName}${whatsappCustomer.lastName ? ' ' + whatsappCustomer.lastName : ''}`
     : null;
   ```
3. Display name is determined by priority hierarchy
4. Both chat list and conversation header show customer names

## Benefits

1. **Better Customer Recognition**: Agents can immediately identify customers by name
2. **Improved User Experience**: More personal and professional chat interface
3. **Automatic Linking**: New messages are automatically linked to customers
4. **Backward Compatible**: Works with existing messages (after migration)
5. **Fallback Support**: Still shows phone numbers when customer not found

## Migration Steps

After deploying these changes:

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Create Database Migration:**
   ```bash
   npx prisma migrate dev --name add_whatsapp_customer_to_messages
   ```
   Or for production:
   ```bash
   npx prisma migrate deploy
   ```

3. **Link Existing Messages (Optional):**
   ```bash
   node scripts/whatsapp/link-messages-to-customers.js
   ```

## Database Migration Notes

The new `whatsappCustomerId` field:
- Is optional (nullable) - won't break existing data
- Has an index for query performance
- Uses `onDelete: SetNull` - messages remain if customer is deleted
- Automatically populated for new messages

## Testing Checklist

- [ ] Chat list displays customer names for linked contacts
- [ ] Conversation header shows customer name
- [ ] New incoming messages are automatically linked
- [ ] New outgoing messages are automatically linked
- [ ] Fallback to phone numbers works for unlinked contacts
- [ ] Search functionality works with customer names
- [ ] Migration script successfully links historical messages

## Future Enhancements

Potential improvements:
1. Auto-create `WhatsAppCustomer` records for new contacts
2. Customer profile panel in chat interface
3. Edit customer name directly from chat
4. Bulk import customers with names
5. Sync with CRM systems

## Technical Details

### Phone Number Normalization
- Removes `whatsapp:` prefix
- Converts to E.164 format (+[country][number])
- Ensures consistent matching across systems

### Performance Considerations
- Customer lookups are indexed
- Batch processing for historical data
- Minimal additional queries (uses joins/includes)

### Error Handling
- Customer lookup failures don't block message creation
- Logged errors for debugging
- Graceful degradation to phone numbers

## Support

For issues or questions:
1. Check logs for customer linking messages (🔗 emoji)
2. Verify `WhatsAppCustomer` records have correct phone numbers
3. Ensure phone numbers are in E.164 format
4. Run migration script if historical messages not showing names
