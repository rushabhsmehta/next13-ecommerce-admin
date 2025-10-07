# WhatsApp Rich Preview - Quick Visual Guide 📸

## 🎯 What You'll See Now

### Chat Window - Rich Template Messages

#### Simple Text Template
```
┌─────────────────────────────────┐
│ Hello Rushabh Mehta!            │  [Out]
│ Welcome to Aagam Holidays       │
└─────────────────────────────────┘
```

#### Template with Header Image
```
┌─────────────────────────────────┐
│ ╔═══════════════════════════╗   │
│ ║ [Kashmir Mountain Photo]  ║   │  
│ ╚═══════════════════════════╝   │
│─────────────────────────────────│
│ Book your Kashmir Tour Package  │  [Out]
│                                 │
│ Starting at ₹25,000 per person  │
└─────────────────────────────────┘
```

#### Template with Buttons
```
┌─────────────────────────────────┐
│ Book your Kashmir Tour Package  │  [Out]
│                                 │
│ 7 days / 6 nights               │
├─────────────────────────────────┤
│   📞 Call Now                   │  ← Clickable
├─────────────────────────────────┤
│   🔗 View Details              │  ← Clickable
└─────────────────────────────────┘
```

#### Full Rich Template (Image + Text + Buttons)
```
┌─────────────────────────────────────┐
│ ╔═══════════════════════════════╗   │
│ ║                               ║   │
│ ║   [Beautiful Kashmir Photo]   ║   │
│ ║   - Snow-capped mountains -   ║   │
│ ║   - Dal Lake - Houseboats     ║   │
│ ║                               ║   │
│ ╚═══════════════════════════════╝   │
│─────────────────────────────────────│  [Out]
│ Book your Kashmir Tour Package      │
│                                     │
│ Experience the paradise on earth    │
│ with our exclusive packages.        │
│                                     │
│ Starting from ₹25,000/person        │
│ Package includes:                   │
│ • Accommodation                     │
│ • Meals                             │
│ • Sightseeing                       │
├─────────────────────────────────────┤
│   📞 Call Agent: +91 9978783238     │
├─────────────────────────────────────┤
│   🔗 View Package Details           │
├─────────────────────────────────────┤
│   💬 Chat with Us                   │
└─────────────────────────────────────┘
```

## 🎨 Color Schemes

### Light Mode (WhatsApp Style)
```
Background:
  Outbound: #d9fdd3 (Light green)
  Inbound:  #ffffff (White)
  
Text:
  #000000 or #334155 (Dark gray)
  
Buttons:
  Text: #00a5f4 (WhatsApp blue)
  Border: rgba(0,0,0,0.1)
  Hover: rgba(0,0,0,0.05)
```

### Dark Mode (WhatsApp Web Dark)
```
Background:
  Outbound: #005c4b (Dark teal)
  Inbound:  #202c33 (Dark gray)
  Chat BG:  #0b141a with pattern
  
Text:
  #e9edef (Off-white)
  
Buttons:
  Text: #00a5f4 (WhatsApp blue)
  Border: rgba(255,255,255,0.1)
  Hover: rgba(255,255,255,0.05)
```

## 🔧 Interactive Elements

### Buttons Behavior

#### URL Button
```
Type: URL
Icon: 🔗
Text: "View Details"
Action: Opens https://aagamholidays.com/kashmir in new tab
Hover: Background lightens slightly
```

#### Phone Button
```
Type: PHONE_NUMBER
Icon: 📞
Text: "Call Now"
Action: Opens tel:+919978783238
Hover: Background lightens slightly
```

#### Quick Reply (Future)
```
Type: QUICK_REPLY
Icon: 💬
Text: "Yes, interested"
Action: Sends reply back
Hover: Background lightens slightly
```

## 📱 Responsive Layout

### Desktop (Wide)
```
┌─────────────────────────────────────────────────┐
│ Sidebar (1 col)   │   Chat (2 cols)             │
│                   │                             │
│ Contact List      │   [Image]                   │
│ +91 9978783238    │   Message text goes here... │
│ +91 9898744701    │   [Button] [Button]         │
│                   │                             │
│                   │   Message composer...       │
└─────────────────────────────────────────────────┘
```

### Mobile (Narrow)
```
┌──────────────────┐
│  Chat Header     │
│  +91 9978783238  │
├──────────────────┤
│                  │
│  [Image]         │
│  Message text    │
│  [Button]        │
│  [Button]        │
│                  │
├──────────────────┤
│  Composer        │
└──────────────────┘
```

## 🎬 Animation States

### Message Send Flow
```
1. User clicks "Send Template"
   ↓
2. Immediate preview appears
   Status: Sending... (clock icon)
   Opacity: 0.7
   ↓
3. API responds (1-2 seconds)
   Status: Sent ✓
   Opacity: 1.0
   ↓
4. Auto-refresh (10 seconds)
   Updates from database
   Shows final status
```

### Image Loading
```
1. Placeholder (gray box)
   ↓
2. Image loads
   Fade-in animation
   ↓
3. If error:
   Hide image section
   Show text only
```

### Button Hover
```
Default:
  Background: transparent
  
Hover:
  Background: rgba(0,0,0,0.05)
  Transition: 150ms
  
Active (clicking):
  Background: rgba(0,0,0,0.1)
```

## 📊 Real Examples

### Example 1: Kashmir Tour Template
```json
{
  "template": {
    "name": "kashmir_tour_promo",
    "header": {
      "type": "IMAGE",
      "url": "https://cdn.aagamholidays.com/kashmir_banner.jpg"
    },
    "body": "Book your {{1}} Tour Package\n\nStarting at ₹{{2}} per person\n{{3}} days / {{4}} nights",
    "buttons": [
      {
        "type": "PHONE_NUMBER",
        "text": "Call Now",
        "phone": "+919978783238"
      },
      {
        "type": "URL",
        "text": "View Details",
        "url": "https://aagamholidays.com/tours/kashmir"
      }
    ]
  },
  "variables": {
    "1": "Kashmir",
    "2": "25,000",
    "3": "7",
    "4": "6"
  }
}
```

**Renders as:**
```
┌──────────────────────────────────┐
│ [Kashmir Mountains Photo]        │
├──────────────────────────────────┤
│ Book your Kashmir Tour Package   │
│                                  │
│ Starting at ₹25,000 per person   │
│ 7 days / 6 nights                │
├──────────────────────────────────┤
│ 📞 Call Now                      │
├──────────────────────────────────┤
│ 🔗 View Details                  │
└──────────────────────────────────┘
```

### Example 2: Welcome Template
```json
{
  "template": {
    "name": "welcome_new_customer",
    "body": "Hello {{1}}!\n\nWelcome to Aagam Holidays. We're excited to help you plan your dream vacation.\n\nHow can we assist you today?",
    "buttons": [
      {
        "type": "QUICK_REPLY",
        "text": "View Packages"
      },
      {
        "type": "QUICK_REPLY",
        "text": "Speak to Agent"
      }
    ]
  },
  "variables": {
    "1": "Rushabh Mehta"
  }
}
```

**Renders as:**
```
┌──────────────────────────────────┐
│ Hello Rushabh Mehta!             │
│                                  │
│ Welcome to Aagam Holidays.       │
│ We're excited to help you plan   │
│ your dream vacation.             │
│                                  │
│ How can we assist you today?     │
├──────────────────────────────────┤
│ 💬 View Packages                 │
├──────────────────────────────────┤
│ 💬 Speak to Agent                │
└──────────────────────────────────┘
```

## 🎯 Component Breakdown

### Message Bubble Structure
```tsx
<div className="message-container">
  
  {/* 1. Avatar (for inbound only) */}
  {direction === 'in' && (
    <div className="avatar-circle">CT</div>
  )}
  
  <div className="bubble">
    
    {/* 2. Header Image */}
    {metadata?.headerImage && (
      <img src={metadata.headerImage} />
    )}
    
    {/* 3. Message Body */}
    <div className="message-text">
      {text}
    </div>
    
    {/* 4. Buttons */}
    {metadata?.buttons?.map(btn => (
      <button className="cta-button">
        {getIcon(btn.type)} {btn.text}
      </button>
    ))}
    
    {/* 5. Tail (triangle) */}
    <div className="bubble-tail" />
    
  </div>
  
</div>
```

### Styling Classes
```css
.message-container {
  display: flex;
  align-items: end;
  gap: 8px;
  justify-content: flex-end | flex-start; /* based on direction */
}

.bubble {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  max-width: 28rem; /* 448px */
}

.message-text {
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
}

.cta-button {
  width: 100%;
  padding: 8px 12px;
  text-align: center;
  border-top: 1px solid rgba(0,0,0,0.1);
  transition: background-color 150ms;
}

.bubble-tail {
  position: absolute;
  bottom: -2px;
  width: 0;
  height: 0;
  border: 8px solid transparent;
  /* Direction-specific borders */
}
```

## ✨ Special Features

### 1. Image Error Handling
```tsx
<img 
  src={metadata.headerImage}
  alt="Template header"
  onError={(e) => {
    // Hide image if it fails to load
    e.currentTarget.style.display = 'none';
  }}
/>
```

### 2. Long Text Wrapping
```tsx
<div style={{ whiteSpace: 'pre-wrap' }}>
  {text}
</div>
// Preserves line breaks from template
```

### 3. Button Icons
```tsx
{btn.type === 'PHONE_NUMBER' && '📞 '}
{btn.type === 'URL' && '🔗 '}
{btn.type === 'QUICK_REPLY' && '💬 '}
{btn.text}
```

### 4. Max Width
```tsx
<div className="max-w-md">
  // Bubble content
</div>
// Prevents messages from being too wide
```

## 🎨 CSS Variables (Optional Enhancement)

```css
:root {
  /* Light mode */
  --wa-bg-outbound: #d9fdd3;
  --wa-bg-inbound: #ffffff;
  --wa-text: #334155;
  --wa-border: rgba(0,0,0,0.1);
  --wa-button-text: #00a5f4;
  --wa-button-hover: rgba(0,0,0,0.05);
}

.dark {
  /* Dark mode */
  --wa-bg-outbound: #005c4b;
  --wa-bg-inbound: #202c33;
  --wa-text: #e9edef;
  --wa-border: rgba(255,255,255,0.1);
  --wa-button-text: #00a5f4;
  --wa-button-hover: rgba(255,255,255,0.05);
}
```

## 📱 Mobile Optimizations

### Touch Targets
```tsx
// Buttons have min 44px height for easy tapping
<button style={{ minHeight: '44px' }}>
  {btn.text}
</button>
```

### Scrolling
```tsx
// Chat area scrolls, buttons stay in viewport
<div className="overflow-y-auto">
  {messages}
</div>
```

### Image Sizing
```tsx
// Images fill width, maintain aspect ratio
<img 
  style={{
    width: '100%',
    height: 'auto',
    maxHeight: '300px',
    objectFit: 'cover'
  }}
/>
```

## 🎉 Final Visual Result

Your chat now looks like this:

```
┌─────────────────────────────────────────────────────┐
│ WhatsApp Business            🔍 🌙 👤               │
├───────────────┬─────────────────────────────────────┤
│ Contacts      │ Chat: +919978783238                 │
│               │                                     │
│ +9199787...   │  Hi [In]                           │
│   "Hi"        │                                     │
│   01:10 PM    │  ┌──────────────────────────────┐   │
│               │  │ [Kashmir Photo]              │   │
│ +9189874...   │  │──────────────────────────────│   │
│   "Test..."   │  │ Book your Kashmir Tour       │ [Out]
│   09:45 AM    │  │                              │   │
│               │  │ ₹25,000 per person           │   │
│               │  │──────────────────────────────│   │
│               │  │ 📞 Call Now                  │   │
│               │  │──────────────────────────────│   │
│               │  │ 🔗 View Details              │   │
│               │  └──────────────────────────────┘   │
│               │                   01:15 PM          │
│               │                                     │
│               ├─────────────────────────────────────┤
│               │ 📄 😊 Type a message...   [Send]   │
└───────────────┴─────────────────────────────────────┘
```

**Beautiful, professional, and fully functional!** 🎊
