import {
  parseToolContractInput,
  type ToolContract,
  type ToolMetadata,
} from "./core.js";
import { getGeneratedToolContract, GENERATED_TOOL_CONTRACTS } from "./catalog.js";
import { inferToolMetadata } from "./metadata.js";
import {
  getSharedToolContractOverride,
  SHARED_TOOL_CONTRACT_OVERRIDES,
} from "./overrides.js";

const sharedToolContracts: Record<string, ToolContract> = {
  ...GENERATED_TOOL_CONTRACTS,
  ...SHARED_TOOL_CONTRACT_OVERRIDES,
};

export function getSharedToolContract(toolName: string): ToolContract | null {
  return getSharedToolContractOverride(toolName) ?? getGeneratedToolContract(toolName);
}

export function getToolMetadata(toolName: string): ToolMetadata {
  const contract = getSharedToolContract(toolName);
  if (contract) {
    return {
      access: contract.access,
      retryable: contract.retryable,
    };
  }

  return inferToolMetadata(toolName);
}

export function normalizeToolParams(
  toolName: string,
  params: unknown
): Record<string, unknown> {
  const contract = getSharedToolContract(toolName);
  if (!contract) {
    if (!params || typeof params !== "object" || Array.isArray(params)) {
      return {};
    }

    return params as Record<string, unknown>;
  }

  return parseToolContractInput(contract, params) as Record<string, unknown>;
}

export const SHARED_TOOL_CONTRACTS = sharedToolContracts;