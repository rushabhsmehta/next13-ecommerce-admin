import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createApprovalToken } from "../../../../../../mcp-server/src/contracts/oauth";
import { getUserOrgRole, roleAtLeast } from "@/lib/authz";

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function buildApprovalPageUrl(
  request: Request,
  params: {
    approvalId: string;
    mcpServerUrl: string;
    clientId: string;
    clientName: string;
    error?: string;
  }
): URL {
  const url = new URL("/mcp/authorize", request.url);
  url.searchParams.set("approvalId", params.approvalId);
  url.searchParams.set("mcpServerUrl", params.mcpServerUrl);
  if (params.clientId) {
    url.searchParams.set("clientId", params.clientId);
  }
  if (params.clientName) {
    url.searchParams.set("clientName", params.clientName);
  }
  if (params.error) {
    url.searchParams.set("error", params.error);
  }
  return url;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const approvalId = readString(formData.get("approvalId"));
  const mcpServerUrl = readString(formData.get("mcpServerUrl"));
  const clientId = readString(formData.get("clientId"));
  const clientName = readString(formData.get("clientName"));
  const decision = readString(formData.get("decision"));

  const pageUrl = buildApprovalPageUrl(request, {
    approvalId,
    mcpServerUrl,
    clientId,
    clientName,
  });

  if (!approvalId || !mcpServerUrl || (decision !== "approve" && decision !== "deny")) {
    pageUrl.searchParams.set("error", "invalid_request");
    return NextResponse.redirect(pageUrl);
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(
      new URL(`/sign-in?redirect_url=${encodeURIComponent(pageUrl.pathname + pageUrl.search)}`, request.url)
    );
  }

  const role = await getUserOrgRole(userId);
  if (!roleAtLeast(role, "ADMIN")) {
    pageUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(pageUrl);
  }

  const approvalSecret = process.env.MCP_APPROVAL_SECRET;
  if (!approvalSecret) {
    return NextResponse.json(
      { error: "MCP approval secret is not configured", code: "MCP_APPROVAL_SECRET_MISSING" },
      { status: 500 }
    );
  }

  let destination: URL;
  try {
    destination = new URL(`/authorize/${decision}`, mcpServerUrl);
  } catch {
    pageUrl.searchParams.set("error", "invalid_request");
    return NextResponse.redirect(pageUrl);
  }

  const approvalToken = createApprovalToken(approvalSecret, {
    approvalId,
    decision,
    actorUserId: userId,
  });

  destination.searchParams.set("approval_token", approvalToken);
  return NextResponse.redirect(destination);
}
