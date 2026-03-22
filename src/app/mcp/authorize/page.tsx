import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserOrgRole, roleAtLeast } from "@/lib/authz";

type SearchParamValue = string | string[] | undefined;

function firstValue(value: SearchParamValue): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function McpAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchParamValue>>;
}) {
  const params = await searchParams;
  const approvalId = firstValue(params.approvalId);
  const mcpServerUrl = firstValue(params.mcpServerUrl);
  const clientId = firstValue(params.clientId);
  const clientName = firstValue(params.clientName) || clientId || "MCP Client";
  const error = firstValue(params.error);

  const { userId } = await auth();
  if (!userId) {
    const redirectUrl = `/mcp/authorize?${new URLSearchParams({
      approvalId,
      mcpServerUrl,
      clientId,
      clientName,
      ...(error ? { error } : {}),
    }).toString()}`;
    redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`);
  }

  const role = await getUserOrgRole(userId);
  const canApprove = roleAtLeast(role, "ADMIN");

  const invalidRequest = !approvalId || !mcpServerUrl;

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Remote MCP Approval</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Authorize Travel Admin access</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          <span className="font-semibold text-slate-900">{clientName}</span> is requesting remote MCP access to this Travel Admin deployment.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p><span className="font-semibold">Client ID:</span> {clientId || "Unknown"}</p>
          <p className="mt-2 break-all"><span className="font-semibold">MCP Server:</span> {mcpServerUrl || "Missing"}</p>
          <p className="mt-2"><span className="font-semibold">Signed in as:</span> {userId}</p>
          <p className="mt-2"><span className="font-semibold">App role:</span> {role ?? "No active organization membership"}</p>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error === "forbidden"
              ? "Only ADMIN or OWNER members can approve remote MCP connectors."
              : error === "invalid_request"
                ? "This approval request is missing required details. Start the connector flow again from Claude."
                : "The approval flow could not continue. Start the connector flow again from Claude."}
          </div>
        ) : null}

        {invalidRequest ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            This approval request is missing the server handoff details.
          </div>
        ) : null}

        {!invalidRequest && !canApprove ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            You are signed in, but your role does not permit approving remote MCP access.
          </div>
        ) : null}

        <ul className="mt-6 space-y-2 text-sm text-slate-600">
          <li>Read and update inquiries, quotes, customers, and financial data through MCP tools.</li>
          <li>Initiate follow-up actions and operational workflows from Claude.</li>
          <li>Keep this access limited to trusted admins because it uses privileged backend routes.</li>
        </ul>

        {!invalidRequest && canApprove ? (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <form action="/api/mcp/oauth/decision" method="post" className="flex-1">
              <input type="hidden" name="approvalId" value={approvalId} />
              <input type="hidden" name="mcpServerUrl" value={mcpServerUrl} />
              <input type="hidden" name="clientId" value={clientId} />
              <input type="hidden" name="clientName" value={clientName} />
              <input type="hidden" name="decision" value="approve" />
              <button className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">
                Allow Access
              </button>
            </form>
            <form action="/api/mcp/oauth/decision" method="post" className="flex-1">
              <input type="hidden" name="approvalId" value={approvalId} />
              <input type="hidden" name="mcpServerUrl" value={mcpServerUrl} />
              <input type="hidden" name="clientId" value={clientId} />
              <input type="hidden" name="clientName" value={clientName} />
              <input type="hidden" name="decision" value="deny" />
              <button className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100" type="submit">
                Deny Access
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
