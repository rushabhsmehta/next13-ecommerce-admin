function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderOAuthErrorPage(
  title: string,
  message: string,
  steps: string[]
): string {
  const stepItems = steps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — Travel Admin MCP</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; max-width: 42rem; margin: 3rem auto; padding: 0 1.25rem; color: #1a1a1a; }
    h1 { font-size: 1.35rem; margin-bottom: 0.5rem; }
    p { margin: 0.75rem 0; color: #444; }
    ol { margin: 1rem 0; padding-left: 1.25rem; }
    li { margin: 0.5rem 0; }
    .card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 1.25rem; background: #fafafa; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    <ol>${stepItems}</ol>
  </div>
</body>
</html>`;
}

export const UNKNOWN_OAUTH_CLIENT_PAGE = renderOAuthErrorPage(
  "Unknown OAuth client",
  "This MCP server does not recognize the connector client ID. This usually happens after a server restart or redeploy when OAuth client registrations were stored in ephemeral storage.",
  [
    "In ChatGPT (or Claude.ai): open Settings → Apps / Integrations and remove the Travel Admin MCP connector.",
    "Add the connector again using your MCP server URL (for example https://your-mcp-server.up.railway.app/mcp).",
    "Complete OAuth and approve access on the admin site as ADMIN or OWNER.",
    "For production: set MCP_CLIENTS_FILE to a persistent Railway volume path (for example /data/mcp-clients.json).",
  ]
);

export const REDIRECT_URI_NOT_REGISTERED_PAGE = renderOAuthErrorPage(
  "Redirect URI not registered",
  "The OAuth redirect URI does not match what was registered for this connector client.",
  [
    "Remove and re-add the MCP connector in your AI client so it registers fresh redirect URIs.",
    "If the problem persists, verify MCP_PUBLIC_URL matches the public HTTPS URL you configured in the connector.",
  ]
);
