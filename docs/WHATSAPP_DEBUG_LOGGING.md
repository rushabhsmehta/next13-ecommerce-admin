# WhatsApp Template Debug Logging System

## Overview

A comprehensive debug logging system has been added to track the entire template selection, variable extraction, parameter building, and API sending process. This helps developers and users understand exactly what happens at each step and troubleshoot issues effectively.

## Features

### 1. **Visual Debug Logs Box**
- **Location**: WhatsApp Settings page, after Cloud API Diagnostics
- **Display**: Color-coded log entries with timestamps
- **Controls**: Show/Hide, Export, Clear buttons
- **Real-time**: Logs appear immediately as actions occur

### 2. **Log Types & Color Coding**

| Type | Icon | Color | Use Case |
|------|------|-------|----------|
| `info` | 📘 | Blue | General information, process steps |
| `success` | ✅ | Green | Successful operations, completions |
| `error` | ❌ | Red | Failures, exceptions, blocked operations |
| `warning` | ⚠️ | Yellow | Missing data, validation issues |

### 3. **Logged Events**

#### Template Selection Flow
```typescript
🎯 Template Selection Started
  - templateId
  
✅ Template Found
  - id, name, language, category, status
  
❌ Template Not Found (if error)
  - templateId, availableCount
```

#### Variable Extraction
```typescript
📝 Body Variables Extracted
  - bodyText
  - variableCount
  - variables array
  
🖼️ Header Component Found
  - format (TEXT/IMAGE/VIDEO/DOCUMENT/LOCATION)
  - hasText
  - text (if applicable)
  
Added IMAGE/VIDEO/DOCUMENT header variable
  - field name (_header_image, etc.)
  
Processing TEXT header
  - headerText
  - headerVariableCount
  - headerVariables array
  
🔘 Button Components Found
  - count
  
Added URL button variable
  - buttonIndex
  - field (_button_0_url, etc.)
  - urlPattern
  - buttonText
  
✨ Template Variables Initialized
  - totalCount
  - allVariables
  - bodyVars
  - headerVars
  - buttonVars
```

#### Message Sending Flow
```typescript
📤 Send Message Initiated
  - contactName
  - contactPhone
  - hasTemplate
  - templateId
  
⚠️ Template Variables Not Filled (if incomplete)
  - templateId
  - templateName
  - requiredVariables
  - filledVariables
  - missingVariables
  
❌ Empty Message (if blocked)
  - action: send_blocked
  
📝 Message Text Prepared
  - isTemplate
  - originalText
  - substitutedText
  - variablesUsed
  
🎨 Template Metadata Built
  - templateId
  - templateName
  - hasHeaderImage
  - buttonCount
  - componentCount
  - components (types)
  
🧹 Template Selection Cleared
  - templateId
  
✅ Message Added to UI
  - messageId
  - timestamp
  - direction: out
  - hasMetadata
```

#### Live Send Process
```typescript
🌐 Live Send Enabled - Preparing API Call
  - liveSendStatus
  - recipientPhone
  
🔧 Building Template Parameters
  - templateName
  - templateLanguage
  
📊 Body Variables Analyzed
  - bodyText
  - matchedPlaceholders
  - uniqueVariables
  
Added numeric body parameter
  - position
  - value
  
Added named body parameter
  - key
  - position
  - value
  
🖼️ Processing Header Component
  - format
  - hasText
  
Added IMAGE/VIDEO/DOCUMENT/TEXT header
  - url (for media)
  - filename (for documents)
  - originalText/substitutedText (for text)
  
No header component found
  - (empty details)
  
📦 API Payload Constructed
  - endpoint
  - payload (full JSON)
  
📡 API Response Received
  - status
  - ok
  - success
  - response (full JSON)
  
❌ Template Send Failed (if error)
  - error message
  - statusCode
  - responseBody
  
✅ Template Sent Successfully!
  - messageId
  - wabaId
  - timestamp
```

#### Text Message Sending
```typescript
💬 Sending Regular Text Message
  - to
  - messageText
  - messageLength
  
📡 Text Message API Response
  - status
  - ok
  - success
  - response
  
❌ Text Message Send Failed (if error)
  - error
  - statusCode
  - responseBody
  
✅ Text Message Sent Successfully!
  - messageId
  - timestamp
```

#### Error Handling
```typescript
❌ No Active Contact
  - action: send_attempt_blocked
  
❌ Live Send Exception
  - errorMessage
  - errorStack
  - wasTemplate
  
Live send process completed
  - sendingLive: false
  
Live send disabled - message only shown in UI
  - liveSendStatus: false
```

## Usage

### Viewing Logs

1. **Open WhatsApp Settings**: Navigate to Settings → WhatsApp
2. **Scroll to Debug Logs**: Located after the Diagnostics section
3. **Expand/Collapse**: Click "Show/Hide" button
4. **Auto-scroll**: Latest logs appear at the top

### Understanding Log Entries

Each log entry shows:
- **Icon & Title**: Visual indicator and action description
- **Timestamp**: When the event occurred (HH:MM:SS)
- **Details**: JSON formatted data with all relevant information

Example:
```
✅ Template Variables Initialized          14:32:15
{
  "totalCount": 5,
  "allVariables": ["1", "2", "_header_image", "_button_0_url"],
  "bodyVars": ["1", "2"],
  "headerVars": "yes",
  "buttonVars": "yes"
}
```

### Exporting Logs

1. Click **Export** button
2. Download file: `whatsapp-debug-logs-[timestamp].txt`
3. Format: Plain text with separators
4. Use for: Sharing with support, bug reports, documentation

### Clearing Logs

1. Click **Clear** button
2. All logs removed
3. New log entry created: "Debug logs cleared"
4. Keeps last 100 logs automatically

## Developer Guide

### Adding New Logs

Use the `addDebugLog` function:

```typescript
addDebugLog(
  type: 'info' | 'success' | 'error' | 'warning',
  action: string,
  details: any
);
```

**Examples:**

```typescript
// Info log
addDebugLog('info', '🔍 Processing Template', {
  templateId: template.id,
  templateName: template.name
});

// Success log
addDebugLog('success', '✅ Template Validated', {
  variableCount: vars.length,
  allValid: true
});

// Error log
addDebugLog('error', '❌ Validation Failed', {
  errorMessage: 'Missing required field',
  field: 'header_image'
});

// Warning log
addDebugLog('warning', '⚠️ Incomplete Data', {
  missingFields: ['variable1', 'variable2'],
  totalRequired: 5
});
```

### Best Practices

1. **Use Emojis**: Makes logs visually scannable
2. **Be Descriptive**: Action should clearly explain what happened
3. **Include Context**: Add all relevant data to details object
4. **Use Appropriate Types**:
   - `info`: Normal operations, informational steps
   - `success`: Completed operations, positive outcomes
   - `error`: Failures, exceptions, blocking issues
   - `warning`: Non-blocking issues, missing data
5. **Keep Details Structured**: Use objects with clear key names
6. **Log Entry/Exit**: Log when entering and exiting important functions

### Log Lifecycle

```typescript
// State
const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);

// Adding logs (prepends to array)
setDebugLogs(prev => [newLog, ...prev].slice(0, 100));

// Auto-limit to last 100 entries
// Oldest logs automatically removed

// Manual clear
setDebugLogs([]);
```

## Troubleshooting

### Common Issues Logged

1. **Template Not Found**
   - Check: Available templates loaded
   - Log shows: templateId vs availableCount

2. **Variables Not Filled**
   - Check: Which variables are missing
   - Log shows: requiredVariables vs filledVariables vs missingVariables

3. **API Send Failed**
   - Check: Error message, status code
   - Log shows: Full responseBody and error details

4. **No Active Contact**
   - Check: Contact selected in chat
   - Log shows: send_attempt_blocked

### Debug Workflow

1. **Clear old logs**: Start fresh
2. **Perform action**: Select template, fill variables, send
3. **Review logs**: Read from top (latest) to bottom (oldest)
4. **Check each step**: Verify expected data appears
5. **Identify issue**: Look for red (error) or yellow (warning) entries
6. **Export if needed**: Share logs for support

## Technical Details

### Data Structure

```typescript
type DebugLog = {
  id: string;                    // Unique identifier
  timestamp: Date;               // When created
  type: 'info' | 'success' | 'error' | 'warning';
  action: string;                // Human-readable description
  details: any;                  // Additional data (usually object)
};
```

### UI Components

- **Card**: Contains all debug logs
- **Header**: Title, badge count, controls
- **Log Entry**: Color-coded border, icon, action, timestamp, details
- **Scrollable Area**: Max height 500px, auto-scroll

### Color Scheme

```typescript
// Light mode
info:    bg-blue-50 border-blue-200 text-blue-900
success: bg-green-50 border-green-200 text-green-900
error:   bg-red-50 border-red-200 text-red-900
warning: bg-yellow-50 border-yellow-200 text-yellow-900

// Dark mode
info:    bg-blue-950 border-blue-800 text-blue-100
success: bg-green-950 border-green-800 text-green-100
error:   bg-red-950 border-red-800 text-red-100
warning: bg-yellow-950 border-yellow-800 text-yellow-100
```

## Performance

- **Auto-limit**: Keeps only last 100 logs
- **Efficient rendering**: React keys on log.id
- **Lazy display**: Only renders when showDebugLogs is true
- **Memory management**: Old logs automatically pruned

## Future Enhancements

Potential improvements:
- [ ] Filter logs by type
- [ ] Search/filter by action or details
- [ ] Persist logs to localStorage
- [ ] Download as JSON format
- [ ] Real-time log streaming
- [ ] Log levels (verbose, normal, minimal)
- [ ] Copy individual log to clipboard
- [ ] Share logs via URL

## Summary

The Debug Logging system provides complete visibility into template operations:

✅ **Visual feedback**: Color-coded, timestamped entries  
✅ **Complete coverage**: All template selection and sending steps  
✅ **Easy export**: Download for support/documentation  
✅ **Developer friendly**: Simple API, structured data  
✅ **Production ready**: Auto-limiting, performant rendering  

Use this system to understand, troubleshoot, and optimize your WhatsApp template workflows!
