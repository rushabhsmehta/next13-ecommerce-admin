# Template Error Diagnosis

## Error Details
```
Error Code: 131009
Message: "Parameter value is not valid"
Details: "Components sub_type invalid at index: 0 and type: 0"
```

## What This Means

The error **"Components sub_type invalid at index: 0 and type: 0"** indicates that:

1. **Meta expects components** in your template `first_flow`
2. **Component at index 0** has an invalid `sub_type`
3. **Type 0** suggests it might be a button component

## Most Likely Cause

Your template `first_flow` in Meta Business Manager has one of these:

### 1. Flow Button (Most Likely)
If your template has a **"Flow" button** (used to trigger WhatsApp Flows), you need to send it with specific parameters:

```json
{
  "type": "button",
  "sub_type": "flow",
  "index": 0,
  "parameters": [
    {
      "type": "action",
      "action": {
        "flow_token": "YOUR_FLOW_TOKEN",
        "flow_action_data": {
          // Your flow data
        }
      }
    }
  ]
}
```

### 2. URL Button with Dynamic Parameter
If your template has a button with a URL like `https://example.com/{{1}}`, you need:

```json
{
  "type": "button",
  "sub_type": "url",
  "index": 0,
  "parameters": [
    {
      "type": "text",
      "text": "your-dynamic-value"
    }
  ]
}
```

### 3. Quick Reply Button
Quick reply buttons usually don't need parameters, but if they do:

```json
{
  "type": "button",
  "sub_type": "quick_reply",
  "index": 0,
  "parameters": [
    {
      "type": "payload",
      "payload": "BUTTON_PAYLOAD"
    }
  ]
}
```

## How to Check Your Template

### Method 1: Via Meta Business Manager
1. Go to https://business.facebook.com/
2. Navigate to **WhatsApp Manager**
3. Click on **Message Templates**
4. Find template `first_flow`
5. Click to view details
6. Check the **Buttons section**:
   - Do you have a "Flow" button?
   - Do you have a URL button with `{{1}}` in the URL?
   - Do you have quick reply buttons?

### Method 2: Via API
I can add a function to fetch the template details from Meta's API.

## Immediate Solutions

### Solution 1: If Template Has Flow Button
Your template likely has a Flow button. You need to update how you're calling it:

```json
{
  "to": "+919978783238",
  "templateName": "first_flow",
  "languageCode": "en",
  "buttonParams": [
    {
      "type": "button",
      "sub_type": "flow",
      "index": 0,
      "parameters": [
        {
          "type": "action",
          "action": {
            "flow_token": "UNIQUE_TOKEN_HERE",
            "flow_action_data": {}
          }
        }
      ]
    }
  ]
}
```

### Solution 2: If Template Has URL Button with Parameter
```json
{
  "to": "+919978783238",
  "templateName": "first_flow",
  "languageCode": "en",
  "buttonParams": [
    {
      "type": "button",
      "sub_type": "url",
      "index": 0,
      "parameters": [
        {
          "type": "text",
          "text": "user123"
        }
      ]
    }
  ]
}
```

### Solution 3: Use a Template WITHOUT Buttons
Try using the `tour_package_flow` template instead, or create a simple template without buttons for testing.

## Next Steps

1. **Check your template in Meta Business Manager** to see what buttons it has
2. **Share the template structure** with me
3. Or try sending a different template that doesn't have buttons

---

**Please check your `first_flow` template in Meta Business Manager and tell me what buttons it has!**
