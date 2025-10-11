# 🚀 WhatsApp UI Components - Quick Reference

## 📦 Components Overview

| Component | Path | Purpose | Props |
|-----------|------|---------|-------|
| **TemplateManager** | `@/components/whatsapp/TemplateManager` | List, search, preview, delete templates | None |
| **TemplateBuilder** | `@/components/whatsapp/TemplateBuilder` | Visual template creation | `onComplete?: () => void` |
| **FlowBuilder** | `@/components/whatsapp/FlowBuilder` | Create flows from templates | `onComplete?: () => void` |
| **WhatsAppManagementPage** | `@/app/(dashboard)/settings/whatsapp-management/page` | Main hub with tabs | None |

---

## 🎯 Quick Integration

### Add to Navigation

```tsx
// In your sidebar/nav component
import { FileText } from 'lucide-react';

<NavItem
  href="/settings/whatsapp-management"
  icon={FileText}
  label="WhatsApp Templates"
/>
```

### Use Individual Components

```tsx
// In any page
import TemplateManager from '@/components/whatsapp/TemplateManager';
import TemplateBuilder from '@/components/whatsapp/TemplateBuilder';
import FlowBuilder from '@/components/whatsapp/FlowBuilder';

export default function MyPage() {
  return (
    <div>
      <TemplateManager />
      {/* OR */}
      <TemplateBuilder onComplete={() => console.log('Done!')} />
      {/* OR */}
      <FlowBuilder onComplete={() => console.log('Done!')} />
    </div>
  );
}
```

---

## 🔌 API Endpoints Reference

### Templates

```typescript
// List templates
GET /api/whatsapp/templates/manage?action=list
GET /api/whatsapp/templates/manage?action=approved  // Only approved

// Search templates
GET /api/whatsapp/templates/manage?action=search&name=welcome&category=UTILITY

// Get analytics
GET /api/whatsapp/templates/manage?action=analytics

// Create template
POST /api/whatsapp/templates/create
Body: {
  name: string,
  language: string,
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
  components: Component[]
}

// Delete template
DELETE /api/whatsapp/templates/manage?action=delete&id=TEMPLATE_ID

// Preview template
POST /api/whatsapp/templates/preview
Body: {
  templateName: string,
  parameters: { [key: string]: any }
}
```

### Flows

```typescript
// List flows
GET /api/whatsapp/flows/manage?action=list

// Create flow from template
POST /api/whatsapp/flows/templates
Body: {
  type: 'signup' | 'appointment' | 'survey' | 'lead_generation',
  options: {
    flowName: string,
    fields?: FlowField[],
    services?: Service[],
    questions?: Question[]
  },
  autoPublish: boolean
}

// Publish flow
POST /api/whatsapp/flows/manage
Body: { action: 'publish', flowId: string }

// Delete flow
DELETE /api/whatsapp/flows/manage?action=delete&flowId=FLOW_ID

// Get flow details
GET /api/whatsapp/flows/manage?action=get&flowId=FLOW_ID
```

---

## 📝 Type Definitions

### Template Component

```typescript
interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: Button[];
}

interface Button {
  type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL' | 'FLOW';
  text: string;
  url?: string;
  phone_number?: string;
  flow_id?: string;
}
```

### Flow Field

```typescript
interface FlowField {
  name: string;
  label: string;
  type: 'TextInput' | 'TextArea' | 'CheckboxGroup' | 'RadioButtonsGroup' | 'Dropdown' | 'DatePicker';
  required?: boolean;
  description?: string;
  options?: Array<{ id: string; title: string }>;
}
```

---

## 🎨 UI Patterns

### Loading State

```tsx
{loading ? (
  <div className="flex justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
) : (
  // Content
)}
```

### Empty State

```tsx
{items.length === 0 && (
  <Card>
    <CardContent className="flex flex-col items-center justify-center py-12">
      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">No items found</p>
      <Button onClick={onCreate} variant="outline" className="mt-4">
        Create your first item
      </Button>
    </CardContent>
  </Card>
)}
```

### Toast Notifications

```tsx
import { toast } from 'react-hot-toast';

// Success
toast.success('Template created successfully!');

// Error
toast.error('Failed to create template');

// Loading
toast.loading('Creating template...');
```

---

## 🔍 Search & Filter Pattern

```tsx
const [searchQuery, setSearchQuery] = useState('');
const [filterStatus, setFilterStatus] = useState('all');

const filteredItems = items.filter(item => {
  const matchesSearch = !searchQuery || 
    item.name.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesStatus = filterStatus === 'all' || 
    item.status === filterStatus;
  return matchesSearch && matchesStatus;
});
```

---

## 🎯 Common Tasks

### 1. Create a Template Programmatically

```typescript
const response = await fetch('/api/whatsapp/templates/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'welcome_message',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Welcome {{1}}! Thanks for signing up.'
      }
    ]
  })
});

const data = await response.json();
if (data.success) {
  console.log('Template ID:', data.templateId);
}
```

### 2. Create a Flow from Template

```typescript
const response = await fetch('/api/whatsapp/flows/templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'signup',
    options: {
      flowName: 'User Registration',
      fields: [
        { name: 'email', label: 'Email', type: 'TextInput', required: true },
        { name: 'name', label: 'Full Name', type: 'TextInput', required: true }
      ]
    },
    autoPublish: false
  })
});

const data = await response.json();
if (data.success) {
  console.log('Flow ID:', data.flowId);
}
```

### 3. Send Template with Variables

```typescript
const response = await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+1234567890',
    templateName: 'welcome_message',
    languageCode: 'en_US',
    variables: {
      '1': 'John Doe'
    }
  })
});
```

---

## 🎨 Styling Guide

### Component Classes

```tsx
// Card
<Card className="hover:shadow-lg transition-shadow">

// Button variants
<Button variant="default">Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Tertiary</Button>
<Button variant="destructive">Delete</Button>

// Badge variants
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Info</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Error</Badge>

// Custom colors
<Badge className="bg-green-500 text-white">Approved</Badge>
<Badge className="bg-yellow-500 text-white">Pending</Badge>
<Badge className="bg-red-500 text-white">Rejected</Badge>
```

### Grid Layouts

```tsx
// 3-column responsive grid
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => <ItemCard key={item.id} {...item} />)}
</div>

// 2-column form
<div className="grid gap-4 md:grid-cols-2">
  <Input />
  <Input />
</div>
```

---

## 🐛 Debugging Tips

### Enable Debug Mode

```bash
# In .env
WHATSAPP_DEBUG=1
```

### Check API Response

```typescript
const response = await fetch('/api/whatsapp/templates/manage?action=list');
const data = await response.json();

console.log('Success:', data.success);
console.log('Data:', data.data);
console.log('Error:', data.error);
console.log('Debug:', data.debug);
```

### Validate Template Before Sending

```typescript
import { validateTemplateParameters } from '@/lib/whatsapp-templates';

const template = await getTemplate('TEMPLATE_ID');
const validation = validateTemplateParameters(template, {
  body: ['value1', 'value2']
});

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

---

## 📊 Analytics Queries

### Get Template Stats

```typescript
const response = await fetch('/api/whatsapp/templates/manage?action=analytics');
const { analytics } = await response.json();

console.log('Total:', analytics.total);
console.log('Approved:', analytics.byStatus.APPROVED);
console.log('Quality High:', analytics.byQuality.high);
```

### Search High-Quality Templates

```typescript
const response = await fetch('/api/whatsapp/templates/manage?action=search&quality=high');
const { data } = await response.json();

console.log('High quality templates:', data);
```

---

## 🚀 Performance Tips

### Lazy Load Components

```tsx
import dynamic from 'next/dynamic';

const TemplateManager = dynamic(
  () => import('@/components/whatsapp/TemplateManager'),
  { loading: () => <Loading /> }
);
```

### Debounce Search

```typescript
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

const debouncedSearch = useMemo(
  () => debounce((query: string) => searchTemplates(query), 300),
  []
);
```

### Optimize Re-renders

```tsx
import { memo } from 'react';

const TemplateCard = memo(({ template }: { template: Template }) => {
  // Component code
});
```

---

## 🔒 Security Checklist

- [ ] Validate all user inputs
- [ ] Sanitize template names
- [ ] Check authorization before API calls
- [ ] Don't expose sensitive tokens in client
- [ ] Use HTTPS in production
- [ ] Implement rate limiting
- [ ] Add CSRF protection

---

## 📱 Mobile Optimization

```tsx
// Responsive text sizes
<h1 className="text-2xl md:text-3xl lg:text-4xl">

// Responsive spacing
<div className="p-4 md:p-6 lg:p-8">

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Hide on mobile
<div className="hidden md:block">

// Show only on mobile
<div className="md:hidden">
```

---

## 🎓 Learning Resources

- **Component Library**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide Icons](https://lucide.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **WhatsApp API**: [Meta Docs](https://developers.facebook.com/docs/whatsapp)

---

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Components not found | Check import paths match file structure |
| Styles not applying | Ensure Tailwind configured correctly |
| API errors | Check environment variables and network tab |
| Templates not loading | Verify API endpoint returns data |
| Preview not updating | Check state management and re-renders |

---

## ✅ Pre-Production Checklist

- [ ] All components render correctly
- [ ] Mobile responsive verified
- [ ] API endpoints tested
- [ ] Error handling works
- [ ] Loading states show
- [ ] Toast notifications work
- [ ] Search and filters functional
- [ ] Create/update/delete tested
- [ ] Preview accurate
- [ ] Analytics display correctly

---

**Quick Start Command**:
```bash
# Navigate to the management page
http://localhost:3000/settings/whatsapp-management

# Or import components directly
import { TemplateManager, TemplateBuilder, FlowBuilder } from '@/components/whatsapp';
```

**That's it! You're ready to build amazing WhatsApp experiences!** 🚀
