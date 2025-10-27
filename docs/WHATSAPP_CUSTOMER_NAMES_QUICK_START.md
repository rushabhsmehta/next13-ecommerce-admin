# WhatsApp Customer Names - Quick Start Guide

## What Changed?

The WhatsApp chat interface now displays customer names from your WhatsApp Customer List instead of just phone numbers.

## What You'll See

**Before:**
```
Left Panel:
+919978580239
+919998898725
+917046133822
```

**After:**
```
Left Panel:
John Smith
Sarah Johnson
Raj Patel
```

The chat conversation header will also show the customer's name instead of just the phone number.

## How It Works

1. **Automatic Linking**: When messages are sent or received, the system automatically looks up the phone number in your WhatsApp Customer List and links them together.

2. **Priority Order**: The system displays names in this order:
   - Customer name from WhatsApp Customer List (highest priority)
   - Profile name from WhatsApp
   - Phone number (fallback)

## Setup Instructions

### 1. Update Your Database

Run this command in the terminal:
```bash
cd c:\Users\admin\Documents\GitHub\next13-ecommerce-admin
npx prisma migrate dev --name add_whatsapp_customer_to_messages
```

### 2. Link Existing Messages (Optional)

To show names for old conversations:
```bash
node scripts/whatsapp/link-messages-to-customers.js
```

This will:
- Match existing messages with customers by phone number
- Update your database to link them
- Show progress as it runs

### 3. Test It Out

1. Open the WhatsApp Chat page in your admin dashboard
2. Check the left panel - you should now see customer names
3. Click on a conversation - the header should show the customer name
4. Send a new message - it will automatically link to the customer

## Adding Customers

To ensure names show up, make sure your customers are in the WhatsApp Customer List with:
- **First Name** (required)
- **Last Name** (optional)
- **Phone Number** in E.164 format (e.g., +919978580239)

## Troubleshooting

### Names Not Showing?

1. **Check Phone Number Format**: 
   - Must be in E.164 format: `+[country code][number]`
   - Example: `+919978580239` (India) or `+14155551234` (USA)

2. **Run the Migration Script**:
   ```bash
   node scripts/whatsapp/link-messages-to-customers.js
   ```

3. **Check Customer List**:
   - Go to WhatsApp Customer management
   - Verify customers have correct phone numbers
   - Ensure they're marked as opted-in

### Still Showing Phone Numbers?

This is normal if:
- The phone number doesn't exist in your Customer List
- The customer hasn't been added yet
- Phone number format doesn't match

The system will automatically show the name once you add the customer to your list.

## Benefits

✅ **Better Recognition**: Instantly know who you're talking to
✅ **Professional**: More personal customer interactions  
✅ **Automatic**: No manual work needed after setup
✅ **Backward Compatible**: Works with existing conversations
✅ **Fallback Support**: Always shows something (name or number)

## What Happens Next?

- **New messages**: Automatically linked when sent/received
- **Existing messages**: Linked when you run the migration script
- **Future conversations**: Always show customer names when available

## Technical Details

For developers and technical team:
- See `docs/WHATSAPP_CUSTOMER_NAMES_IMPLEMENTATION.md` for full technical documentation
- Database schema changes are in `schema.prisma`
- Backend logic in `src/lib/whatsapp.ts` and `src/app/api/whatsapp/webhook/route.ts`
- Frontend display in `src/app/(dashboard)/whatsapp/chat/page.tsx`

## Support

If you need help:
1. Check the logs for messages with 🔗 emoji (customer linking)
2. Verify phone number formats in your Customer List
3. Run the migration script if names aren't showing for old messages
4. Refer to the full documentation in the `docs/` folder
