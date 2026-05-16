import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { PermissionGate } from "../../components/auth/PermissionGate";

jest.mock("../../hooks/useCurrentUser", () => ({
  useCurrentUser: jest.fn(),
}));

jest.mock("../../lib/network", () => ({
  useNetwork: () => ({
    isOnline: true,
    isInternetReachable: true,
    type: null,
    checkedAt: 0,
    refresh: jest.fn(),
  }),
}));

const { useCurrentUser } = jest.requireMock("../../hooks/useCurrentUser") as {
  useCurrentUser: jest.Mock;
};

function setUser(overrides: Partial<{ permissions: string[]; isLoading: boolean }> = {}) {
  useCurrentUser.mockReturnValue({
    permissions: overrides.permissions ?? [],
    isLoading: overrides.isLoading ?? false,
    mobileNavigation: [],
    organizationRole: null,
    organizationId: null,
    isOwner: false,
    isAdmin: false,
    isFinance: false,
    isOperations: false,
    isAssociate: false,
    canUseAdmin: false,
    canUseFinance: false,
    associatePartner: null,
    travelUser: null,
  });
}

describe("PermissionGate", () => {
  beforeEach(() => {
    useCurrentUser.mockReset();
  });

  it("renders children when permission is present", () => {
    setUser({ permissions: ["finance.read", "finance.write"] });
    const { getByTestId } = render(
      <PermissionGate permission="finance.read">
        <Text testID="protected">SECRET</Text>
      </PermissionGate>
    );
    expect(getByTestId("protected").props.children).toBe("SECRET");
  });

  it("renders default denied fallback when permission is missing", () => {
    setUser({ permissions: ["crm.read"] });
    const { getByTestId, queryByTestId } = render(
      <PermissionGate permission="finance.read">
        <Text testID="protected">SECRET</Text>
      </PermissionGate>
    );
    expect(queryByTestId("protected")).toBeNull();
    expect(getByTestId("permission-denied")).toBeTruthy();
  });

  it("renders custom fallback when provided", () => {
    setUser({ permissions: [] });
    const { getByTestId } = render(
      <PermissionGate
        permission="finance.read"
        fallback={<Text testID="custom-deny">CUSTOM</Text>}
      >
        <Text testID="protected">SECRET</Text>
      </PermissionGate>
    );
    expect(getByTestId("custom-deny")).toBeTruthy();
  });

  it("renders nothing while auth is still loading", () => {
    setUser({ permissions: [], isLoading: true });
    const { queryByTestId } = render(
      <PermissionGate permission="finance.read">
        <Text testID="protected">SECRET</Text>
      </PermissionGate>
    );
    expect(queryByTestId("protected")).toBeNull();
    expect(queryByTestId("permission-denied")).toBeNull();
  });
});
