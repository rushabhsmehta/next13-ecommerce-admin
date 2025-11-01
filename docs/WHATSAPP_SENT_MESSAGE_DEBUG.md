# WhatsApp Sent Message Debug Guide

## Issue
User reports: Template messages sent via live chat interface don't appear in the conversation, even though replies are received.

## Investigation Summary

### ✅ What Works
1. **Message Saving**: Template messages ARE being saved to database with `direction: 'outbound'`
   - Location: `persistOutboundMessage()` in `src/lib/whatsapp.ts` (line 811)
   - Sets: `direction: data.direction ?? 'outbound'`
   
2. **Message Fetching**: `fetchMessages()` is called 1 second after send completes
   - Location: `sendPreviewMessage()` in chat/page.tsx (line 2854-2860)
   - Queries: All messages ordered by newest first, no filtering by direction
   
3. **Message Processing**: `buildContactsAndConvos()` processes all message directions
   - Location: chat/page.tsx (line 1898-2111)
   - Handles both 'inbound' and 'outbound' messages correctly
   - Properly normalizes phone numbers for contact matching

4. **Button Functionality**: "Load earlier messages" button exists and works
   - Location: Line 4200 in chat/page.tsx
   - Shows in live chat area when `hasMoreActiveMessages = true`
   - NOT in "Recent Messages" section - it's in the active conversation

### 🔍 Debug Logging Added

Build successful. Enhanced console logging enables tracing of message flow:

#### 1. Message Fetch Logging
```typescript
// In fetchMessages() - Line 1553
console.log('📨 Fetched messages:', result.messages.length, 
  `(outbound: ${outboundCount}, inbound: ${inboundCount})`);
```

#### 2. Message Building Logging
```typescript
// In buildContactsAndConvos() - Line 1908
console.log('🔍 buildContactsAndConvos processing', messages.length,
  `messages (outbound: ${outboundMsgs.length}, inbound: ${inboundMsgs.length})`);

// For each contact:
console.log(`  - ${contact.name} (${contact.phone}): ${convo.length} messages (out: ${outboundInConvo}, in: ${inboundInConvo})`);
```

#### 3. Active Conversation Logging
```typescript
// In active conversation hook - Line 2207
console.log(`📱 Active contact: ${activeContact.name} (${activeContact.phone})`);
console.log(`  Total messages in conversation: ${activeContactMessages.length}`);
console.log(`  Message breakdown - Outbound: ${outbound}, Inbound: ${inbound}`);
```

#### 4. Send Template Logging
```typescript
// In send-template/route.ts - Line 315
console.log('[send-template] Result:', { 
  success: result.success, 
  messageSid: result.messageSid,
  dbRecordId: result.dbRecord?.id,
  dbRecordDirection: result.dbRecord?.direction,
  dbRecordMessage: result.dbRecord?.message?.substring(0, 100),
});
```

## How to Debug

### When Sending a Template Message:

1. **Open Browser DevTools** (F12 → Console tab)

2. **Send a template message** to a contact

3. **Watch the console output** - you should see (in order):
   ```
   [send-template] Result: { 
     success: true, 
     messageSid: "wamid...",
     dbRecordId: "uuid...",
     dbRecordDirection: "outbound",
     dbRecordMessage: "Hello..."
   }
   
   🔄 Sent successfully, scheduling fetchMessages in 1 second...
   
   ⏱️ 1 second elapsed, calling fetchMessages()...
   
   📨 Fetched messages: 102 (outbound: 5, inbound: 97)
     [0] direction=outbound, to=whatsapp:+919...
     [1] direction=inbound, to=...
   
   🔍 buildContactsAndConvos processing 102 messages (outbound: 5, inbound: 97)
   ✅ Built 8 contacts with convos
     - Dr. Rupesh Kumar (+919...): 15 messages (out: 2, in: 13)
     - ...
   
   📱 Active contact: Dr. Rupesh Kumar (+919...)
     Total messages in conversation: 15
     Visible count: 5
     Currently showing: 5 messages
     Message breakdown - Outbound: 2, Inbound: 13
   ```

### Expected Outcomes:

- ✅ **dbRecordDirection should be "outbound"**
- ✅ **Message count should increase after fetch**
- ✅ **outbound count in buildContactsAndConvos should increase**
- ✅ **Active contact should show more messages**

### If Something's Wrong:

**Case 1: DB Record not saved**
- `dbRecordId` is null or undefined
- **Fix**: Check `persistOutboundMessage()` error handling in whatsapp.ts

**Case 2: Messages not fetched**
- No console output after 1 second
- **Fix**: Check browser network tab for `/api/whatsapp/messages` request, verify Clerk auth

**Case 3: Direction field wrong**
- `dbRecordDirection` is "inbound" instead of "outbound"
- **Fix**: Check `sendWhatsAppTemplate()` params passed to `persistOutboundMessage()`

**Case 4: Message count not increasing**
- outbound count stays the same after fetch
- **Fix**: Database may not be persisting, check write permissions

**Case 5: Active contact not updating**
- Message count says 15 but only 5 showing
- **Fix**: Message may be there but filtered, check active conversation slice logic

## Code References

| File | Line | Component |
|------|------|-----------|
| `src/lib/whatsapp.ts` | 762 | `persistOutboundMessage()` |
| `src/lib/whatsapp.ts` | 2185-2228 | Template send & save flow |
| `src/app/api/whatsapp/send-template/route.ts` | 301 | API endpoint |
| `src/app/(dashboard)/whatsapp/chat/page.tsx` | 1553 | `fetchMessages()` |
| `src/app/(dashboard)/whatsapp/chat/page.tsx` | 1898 | `buildContactsAndConvos()` |
| `src/app/(dashboard)/whatsapp/chat/page.tsx` | 2800-2860 | `sendPreviewMessage()` |
| `src/app/(dashboard)/whatsapp/chat/page.tsx` | 4200 | "Load earlier" button |

## Database Schema

```prisma
model WhatsAppMessage {
  // From prisma/whatsapp-schema.prisma
  id              String   @id @default(cuid())
  from            String   // "whatsapp:+..." (our business number for outbound)
  to              String   // "whatsapp:+..." (recipient for outbound, sender for inbound)
  message         String?
  direction       String   @default("outbound") // "outbound" or "inbound"
  status          String   // "sent", "delivered", "read", "failed", etc.
  createdAt       DateTime @default(now())
  // ... other fields
}
```

## Next Steps

1. **Send a test template message** and check console logs
2. **Share console output** if message isn't appearing
3. If logs show outbound count increasing but message still not visible:
   - Check if there's a client-side filter hiding outbound messages
   - Verify `activeVisibleMessages` slice logic at line 2195
4. If logs show message in DB but not in fetch:
   - Run direct DB query: `SELECT * FROM WhatsAppMessage WHERE direction='outbound' ORDER BY createdAt DESC LIMIT 1;`
   - Confirm message is there with correct direction
