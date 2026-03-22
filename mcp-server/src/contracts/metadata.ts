import type { ToolMetadata } from "./core";

export function inferToolMetadata(toolName: string): ToolMetadata {
  if (toolName === "generate_itinerary") {
    return {
      access: "read",
      retryable: false,
    };
  }

  if (
    toolName.startsWith("list_") ||
    toolName.startsWith("get_") ||
    toolName.startsWith("search_")
  ) {
    return {
      access: "read",
      retryable: true,
    };
  }

  return {
    access: "write",
    retryable: false,
  };
}