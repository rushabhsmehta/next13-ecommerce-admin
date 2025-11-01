# WhatsApp Sent Messages - Visual Debug Guide

## Message Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER SENDS TEMPLATE                          │
│         (Clicks "Send" button in live chat interface)           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. IMMEDIATE UI UPDATE (sendPreviewMessage - line 2700)        │
│     - Message added to convos state                             │
│     - Shows in UI with status 0 (pending)                       │
│                                                                 │
│     🔧 Debug: Look at visibleMessageCounts state               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. API CALL TO SEND (fetch /api/whatsapp/send-template)       │
│     POST body includes:                                         │
│     - to: "+919xxx..." (recipient)                             │
│     - templateName: "greeting_template"                        │
│     - variables: [...]                                         │
│                                                                 │
│     🔧 Debug: Check Network tab in DevTools                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. SERVER: sendWhatsAppTemplate() (whatsapp.ts:1510)           │
│                                                                 │
│     a) Send to Meta Cloud API                                   │
│        ├─ POST /messages with template payload                 │
│        └─ Get back messageSid                                  │
│                                                                 │
│     b) Save to Database (persistOutboundMessage:762)            │
│        ├─ to: "whatsapp:+919xxx..."                            │
│        ├─ from: "whatsapp:BUSINESS_ID"                         │
│        ├─ direction: "outbound" ✓                              │
│        ├─ status: "sent"                                       │
│        └─ message: "Hello..."                                  │
│                                                                 │
│     🔧 Debug: Check [send-template] Result log                 │
│        - dbRecordId should not be null                         │
│        - dbRecordDirection should be "outbound"                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. RETURN SUCCESS TO CLIENT                                    │
│     Response includes:                                          │
│     - success: true                                             │
│     - messageSid: "wamid..."                                   │
│     - dbRecord: { id, direction, message, ... }               │
│                                                                 │
│     🔧 Debug: Check fetch response in Network tab              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. WAIT 1 SECOND (setTimeout line 2856)                        │
│                                                                 │
│     🔧 Debug: Look for "⏱️ 1 second elapsed..." log             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. FETCH ALL MESSAGES FROM DB (fetchMessages - line 1553)      │
│                                                                 │
│     GET /api/whatsapp/messages?limit=100&skip=0                │
│                                                                 │
│     Returns: Array of ALL messages ordered by newest            │
│     - Should include the newly sent message                     │
│                                                                 │
│     🔧 Debug: Look for 📨 Fetched messages log                 │
│        - outbound count should increase                         │
│        - Your new message should appear in list                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. UPDATE MESSAGES STATE (setMessages - line 1561)             │
│                                                                 │
│     messages = new array from API                              │
│                                                                 │
│     This triggers useEffect with [messages] dependency         │
│     at line 1896                                               │
│                                                                 │
│     🔧 Debug: Watch for state update                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. BUILD CONVERSATIONS (buildContactsAndConvos - line 1898)    │
│                                                                 │
│     Process all messages:                                       │
│     ├─ Group by phone number (normalizeContactAddress)         │
│     ├─ For each message:                                        │
│     │  ├─ Extract contact phone                                 │
│     │  ├─ Determine if inbound/outbound                         │
│     │  ├─ Get message text                                      │
│     │  └─ Add to convoMap[phone]                               │
│     ├─ Sort messages by timestamp                               │
│     ├─ Create contacts array                                    │
│     └─ setContacts + setConvos                                 │
│                                                                 │
│     🔧 Debug: Look for logs:                                   │
│        - 🔍 buildContactsAndConvos processing X messages       │
│        - ✅ Built X contacts with convos                       │
│        - Message count breakdown per contact                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  9. ACTIVE CONVERSATION UPDATES                                 │
│                                                                 │
│     const activeContactMessages = convos[activeContact.id]      │
│                                                                 │
│     This should now include the new sent message               │
│                                                                 │
│     🔧 Debug: Look for 📱 Active contact log                   │
│        - Total messages should increase                         │
│        - Outbound count should include your message            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  10. MESSAGE VISIBILITY                                          │
│                                                                 │
│      activeVisibleMessages = activeContactMessages.slice(       │
│        -activeVisibleCount                                      │
│      )                                                          │
│                                                                 │
│      If message not visible: it's being sliced out               │
│      - Message may be too old (beyond INITIAL_VISIBLE_MESSAGES) │
│      - Click "Load earlier messages" to see it                 │
│                                                                 │
│      🔧 Debug: Check:                                          │
│         - activeVisibleCount value                              │
│         - activeContactMessages.length                          │
│         - hasMoreActiveMessages (should show button)            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  ✅ MESSAGE APPEARS IN CONVERSATION                             │
│                                                                 │
│      Rendered with styling based on direction='out'             │
└─────────────────────────────────────────────────────────────────┘
```

## Console Output Legend

### 1️⃣ When API Response Received
```
[send-template] Result: { 
  success: true,                              ← Successful send
  messageSid: "wamid.xxx",                    ← Meta ID
  dbRecordId: "clpxxx",                       ← ✓ DB saved
  dbRecordDirection: "outbound",              ← ✓ Correct direction
  dbRecordMessage: "Hello there!..."          ← Message content
}
```
**Expected**: All fields present, direction is "outbound"  
**Problem**: If dbRecordId is null → Database save failed

### 2️⃣ Message Fetch Starting
```
🔄 Sent successfully, scheduling fetchMessages in 1 second...
⏱️ 1 second elapsed, calling fetchMessages()...
```
**Expected**: Both logs appear with ~1 second gap  
**Problem**: If only first appears → fetchMessages not called

### 3️⃣ Messages Fetched
```
📨 Fetched messages: 102 (outbound: 5, inbound: 97)
  [0] direction=outbound, to=whatsapp:+919xxxxxx, message=Hello...
  [1] direction=inbound, to=..., message=...
```
**Expected**: outbound count increased, your message in list  
**Problem**: If outbound count didn't increase → Not in DB

### 4️⃣ Building Conversations
```
🔍 buildContactsAndConvos processing 102 messages (outbound: 5, inbound: 97)
✅ Built 8 contacts with convos
  - Dr. Rupesh Kumar (+919xxxxxx): 15 messages (out: 2, in: 13)
  - Vinay Kumar (+919xxxxxx): 8 messages (out: 1, in: 7)
```
**Expected**: Your contact's outbound count increased  
**Problem**: If count didn't increase → Message filtered out

### 5️⃣ Active Conversation State
```
📱 Active contact: Dr. Rupesh Kumar (+919xxxxxx)
  Total messages in conversation: 15
  Visible count: 5
  Currently showing: 5 messages
  Message breakdown - Outbound: 2, Inbound: 13
```
**Expected**: Outbound count includes your message  
**Problem scenarios**:
- If "Visible count: 5" but "Total messages: 15" → Click "Load earlier messages"
- If outbound count is 1 instead of 2 → Message filtered somewhere

## Troubleshooting Decision Tree

```
START: Message not appearing
│
├─ Check [send-template] Result log
│  │
│  ├─ dbRecordId is NULL?
│  │  └─ ❌ Database save failed
│  │     Action: Check Prisma connection, database logs
│  │
│  ├─ dbRecordDirection is "inbound"?
│  │  └─ ❌ Wrong direction being saved
│  │     Action: Check persistOutboundMessage() call in sendWhatsAppTemplate
│  │
│  └─ All fields present?
│     └─ ✅ Continue to step 2
│
├─ Check 📨 Fetched messages log
│  │
│  ├─ outbound count didn't increase?
│  │  └─ ❌ Message not returned from API
│  │     Action: Run DB query manually, check API filtering
│  │
│  └─ outbound count increased?
│     └─ ✅ Continue to step 3
│
├─ Check ✅ Built contacts log
│  │
│  ├─ Contact's outbound count didn't increase?
│  │  └─ ❌ Message filtered in buildContactsAndConvos
│  │     Action: Check normalizeContactAddress logic
│  │
│  └─ Contact's outbound count increased?
│     └─ ✅ Continue to step 4
│
└─ Check 📱 Active contact log
   │
   ├─ Outbound count decreased from previous?
   │  └─ ❌ Client-side filtering issue
   │     Action: Check activeVisibleMessages slice logic
   │
   ├─ Total messages increased?
   │  └─ Message is there but may not be visible
   │     Action: Click "Load earlier messages" or check visibleCount
   │
   └─ Everything looks right but message not visible?
      └─ ❌ Rendering issue
         Action: Check message direction field in render logic
```

## Quick Test Script

Copy-paste in browser console:

```javascript
// Monitor message fetch
const origFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await origFetch(...args);
  if (args[0].includes('/api/whatsapp/messages')) {
    const clone = response.clone();
    const data = await clone.json();
    console.log('🎯 API Response:', {
      url: args[0],
      messageCount: data.messages?.length,
      outbound: data.messages?.filter(m => m.direction === 'outbound').length,
      inbound: data.messages?.filter(m => m.direction === 'inbound').length,
    });
  }
  return response;
};

console.log('✅ Message monitoring active');
```

Then send a message and watch the output.

## Key Line Numbers for Reference

| Component | File | Line | Purpose |
|-----------|------|------|---------|
| Send Message | chat/page.tsx | 2560 | sendPreviewMessage() |
| Add to UI | chat/page.tsx | 2700-2734 | Add to convos state |
| API Call | chat/page.tsx | 2804-2816 | Fetch to /api/whatsapp/send-template |
| Success Handler | chat/page.tsx | 2842-2860 | Schedule fetchMessages |
| Fetch Messages | chat/page.tsx | 1553 | Get from DB |
| Build Conversations | chat/page.tsx | 1898 | Process messages |
| API Route | send-template/route.ts | 301 | Handle request |
| Save to DB | whatsapp.ts | 2228 | persistOutboundMessage |
| DB Write | whatsapp.ts | 762-820 | Create message record |
| Load Button | chat/page.tsx | 4200 | Show/hide logic |

---

**Last Updated**: Build complete  
**Status**: Ready for testing  
**Next Step**: Send a test message and check console
