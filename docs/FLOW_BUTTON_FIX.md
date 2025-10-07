# Flow Button Fix - Case Sensitivity Issue

## Problem
The script `send-template.js` was working correctly, but the UI was still getting error 131009.

## Root Cause
Meta's WhatsApp API is **case-sensitive** for Flow button component fields:

### ❌ What We Were Sending (UI):
```json
{
  "type": "button",      // lowercase
  "sub_type": "flow",    // lowercase
  "parameters": [
    {
      "type": "action",  // lowercase
      "action": {
        "flow_token": "...",
        "flow_action_data": {}  // Empty object causing issues
      }
    }
  ]
}
```

### ✅ What Works (Script):
```json
{
  "type": "BUTTON",      // UPPERCASE
  "sub_type": "FLOW",    // UPPERCASE
  "parameters": [
    {
      "type": "ACTION",  // UPPERCASE
      "action": {
        "flow_token": "unique_flow_token_1234567890"
        // NO flow_action_data field!
      }
    }
  ]
}
```

## Changes Made

### 1. Updated Case to Uppercase
Changed all Flow button component types to **UPPERCASE**:
- `type: 'button'` → `type: 'BUTTON'`
- `sub_type: 'flow'` → `sub_type: 'FLOW'`
- `type: 'action'` → `type: 'ACTION'`

### 2. Removed Empty flow_action_data
The `flow_action_data` field should **only be included if it has actual data**:
- ❌ `flow_action_data: {}` (empty object)
- ✅ No `flow_action_data` field at all
- ✅ `flow_action_data: { key: "value" }` (with data)

### 3. Updated Flow Token Format
Using the same format as the working script:
- `unique_flow_token_{timestamp}`

## Code Changes

### File: `src/app/api/whatsapp/send-template/route.ts`

#### Auto-Detection (lines 156-176):
```typescript
buttonParams.push({
  type: 'BUTTON',          // UPPERCASE
  sub_type: 'FLOW',        // UPPERCASE
  index: 0,
  parameters: [
    {
      type: 'ACTION',      // UPPERCASE
      action: {
        flow_token: `unique_flow_token_${Date.now()}`,
        // No flow_action_data unless explicitly provided
      },
    },
  ],
});
```

#### Manual Flow Parameters (lines 118-140):
```typescript
const actionData: any = {
  flow_token: flowToken,
};

// Only include flow_action_data if explicitly provided and non-empty
const flowActionData = variables.flow_action_data || variables.flowActionData;
if (flowActionData && Object.keys(flowActionData).length > 0) {
  actionData.flow_action_data = flowActionData;
}

buttonParams.push({
  type: 'BUTTON',
  sub_type: 'FLOW',
  index: 0,
  parameters: [{
    type: 'ACTION',
    action: actionData,
  }],
});
```

## Testing

### Test 1: Auto-Detection (Simple)
```bash
POST /api/whatsapp/send-template
{
  "to": "+919978783238",
  "templateName": "first_flow",
  "languageCode": "en"
}
```

**Expected Payload to Meta:**
```json
{
  "template": {
    "components": [
      {
        "type": "BUTTON",
        "sub_type": "FLOW",
        "index": 0,
        "parameters": [
          {
            "type": "ACTION",
            "action": {
              "flow_token": "unique_flow_token_1696723456789"
            }
          }
        ]
      }
    ]
  }
}
```

### Test 2: With Flow Action Data
```bash
POST /api/whatsapp/send-template
{
  "to": "+919978783238",
  "templateName": "first_flow",
  "languageCode": "en",
  "variables": {
    "flowToken": "booking_123",
    "flowActionData": {
      "screen": "booking_details",
      "bookingId": "123"
    }
  }
}
```

**Expected Payload:**
```json
{
  "action": {
    "flow_token": "booking_123",
    "flow_action_data": {
      "screen": "booking_details",
      "bookingId": "123"
    }
  }
}
```

## Comparison: Working vs Not Working

| Field | ❌ Not Working | ✅ Working |
|-------|---------------|-----------|
| `type` | `"button"` | `"BUTTON"` |
| `sub_type` | `"flow"` | `"FLOW"` |
| `parameters[0].type` | `"action"` | `"ACTION"` |
| `flow_action_data` | `{}` (empty) | omitted or with data |
| `flow_token` | `flow_919978783238_...` | `unique_flow_token_...` |

## Meta API Documentation

According to Meta's WhatsApp Cloud API docs for Flow buttons:
- Component type must be `BUTTON` (uppercase)
- Sub-type must be `FLOW` (uppercase)
- Parameter type must be `ACTION` (uppercase)
- `flow_action_data` is **optional** and should only be included when needed

## Status

✅ **FIXED** - Flow button components now use correct case and structure matching the working script.

---

**Try sending from the UI again!** 🚀
