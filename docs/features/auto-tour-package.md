# Auto Tour Package Builder

The Auto Tour Package Builder uses OpenAI's chat models plus an internal playbook to create CMS-ready itineraries from natural language prompts.

## Where to find it
- Navigate to **Master Data → Auto Tour Package** inside the admin sidebar.
- The page is built with the `AutoTourPackageBuilder` client component located at `src/app/(dashboard)/tourPackages/components/auto-tour-package-builder.tsx`.
- The backing API route lives at `src/app/api/ai/auto-tour-package/route.ts` and enforces Clerk authentication.

## Environment variables
Set the following values in `.env` / Vercel:

```
OPENAI_API_KEY=sk-********************************
OPENAI_TOUR_MODEL=gpt-4.1-mini   # optional override (defaults to gpt-4.1-mini)
```

Never commit keys to the repository. The route returns a `NO_OPENAI_KEY` error if the key is absent.

## System instructions
All generations use the playbook stored in `src/lib/ai/tour-package-instructions.ts`. Highlights:
- Forces a predictable markdown template (snapshot table, highlights, day-wise plan, pricing, optimisation levers, risk flags, JSON blueprint).
- Ensures INR pricing unless otherwise requested and calls out assumptions transparently.
- Limits responses to ~750 tokens and warns on seasonality, visa issues, and logistics gaps.

Copy the instructions directly from the UI panel if updates are needed. Any edits to the instructions file will reflect after the next deployment.

## Usage tips
1. Pick a tone preset (Balanced, Celebratory, Budget Focused, Luxury) or supply extra notes for nuance.
2. Start with the quick prompts or paste an inquiry brief; OpenAI receives the entire chat history so follow-up prompts work as “revise” commands.
3. Use the **Copy instructions** and **Copy response** buttons to move content into tour package forms or share with associates.
4. Watch the token summary to estimate OpenAI usage; errors bubble up with actionable toasts for quick retry.

## Error handling
- Missing auth ⇒ `403` via Clerk.
- Missing OpenAI key ⇒ `500` with `NO_OPENAI_KEY` code.
- API/SDK failures bubble up through `handleApi()` and are surfaced in the UI toast.

## Future ideas
- Directly map the `JSON_BLUEPRINT` to a draft tour package form.
- Persist favourite prompts per user.
- Allow associates to request access via middleware-controlled flag.
