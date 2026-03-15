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

Existing form components:
```
!`find src/components/forms -name "*.tsx" 2>/dev/null | head -15`
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
   - Submit handler using `axios.post()` / `axios.patch()`
   - Success: `toast.success()` + `router.refresh()` or `onSuccess?.()`
   - Error: `toast.error("Something went wrong")`

3. **Render the form** using Shadcn components:
   - Wrap in `<Form {...form}><form onSubmit={form.handleSubmit(onSubmit)}>`
   - Use `<FormField>` with `control={form.control}` for each field
   - Use appropriate input components: `Input`, `Select`, `DatePicker`, `Textarea`, `Checkbox`
   - Submit button with loading state: `<Button disabled={loading}>`

4. **For dialog forms**: wrap in `<Dialog>` / `<Sheet>` from Shadcn

## Conventions

- Import from `@/components/ui/*` for Shadcn components
- Use `@/lib/utils` for `formatPrice()` and `cn()`
- Use `axios` for API calls (already in project dependencies)
- Use `react-hot-toast` for notifications (`toast.success()`, `toast.error()`)
- Date fields should use `DatePickerField` component if available, or Shadcn Popover + Calendar

## Additional resources

- For the form template, see [references/form-template.md](references/form-template.md)
