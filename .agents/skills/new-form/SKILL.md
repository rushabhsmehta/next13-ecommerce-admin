---
name: new-form
description: Scaffold a form component using React Hook Form + Zod validation + Shadcn UI following this project's patterns.
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: <form-name> [api-endpoint]
---

# Scaffold a Form Component

Create a new form component using React Hook Form + Zod + Shadcn UI.

## Input

- **$0** — Form name and purpose
- **$1** — API endpoint to submit to (optional)

The user will also describe fields, types, validation rules, and whether it's a dialog or full-page form.

## Live Project State

Dashboard transaction forms:
```
!`find src/components/forms -name "*.tsx" 2>/dev/null | head -15`
```

Mobile inquiry form (reference for testIDs + API):
```
!`ls mobile/components/inquiries/ 2>/dev/null`
```

## Steps

1. **Define the Zod schema** with `z.object({})` including:
   - Required string fields: `z.string().min(1, "Field is required")`
   - Optional fields: `z.string().optional()`
   - Numbers: `z.coerce.number().positive()`
   - Dates: `z.date()` or `z.string()` depending on usage
   - Booleans: `z.boolean().default(false)`
   - Cross-field validation with `.refine()` or `.superRefine()` if needed

2. **Create the form component** with:
   - `"use client"` directive
   - `useForm()` with `zodResolver(formSchema)`
   - Loading state: `const [loading, setLoading] = useState(false)`
   - Submit handler using `axios.post()` / `axios.patch()` (dashboard) or `mobile/lib/api.ts` (Expo — retries, bearer token)
   - Success: `toast.success()` + `router.refresh()` or `onSuccess?.()`
   - Error: `toast.error("Something went wrong")`

3. **Render the form** using Shadcn components:
   - Wrap in `<Form {...form}><form onSubmit={form.handleSubmit(onSubmit)}>`
   - Use `<FormField>` with `control={form.control}` for each field
   - Use appropriate input components: `Input`, `Select`, `DatePicker`, `Textarea`, `Checkbox`
   - Submit button with loading state: `<Button disabled={loading}>`

4. **For dialog forms**: wrap in `<Dialog>` / `<Sheet>` from Shadcn

## Mobile-specific conventions

- Every interactive control needs a stable **`testID`** (Detox / adb scripts)
- Add `accessibilityRole`, `accessibilityLabel`, `accessibilityHint` on pressables
- Example inquiry form: `mobile/components/inquiries/CreateInquiryForm.tsx` — IDs like `inquiry-create-name`, `inquiry-save-profile`, `inquiry-delete-confirm`
- CRM mutations call `/api/inquiries` (not only `/api/mobile/*`); ensure server accepts bearer auth

## Conventions

- Import from `@/components/ui/*` for Shadcn components
- Use `@/lib/utils` for `formatPrice()` and `cn()`
- Use `axios` for dashboard API calls
- Use `react-hot-toast` for notifications
- Date fields: `createDatePickerValue()` / `dateToUtc()` from `@/lib/timezone-utils` when persisting date-only values

## Additional resources

- [references/form-template.md](references/form-template.md)
