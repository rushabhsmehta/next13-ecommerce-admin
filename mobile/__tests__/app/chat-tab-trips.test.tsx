import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockSignOut = jest.fn();

const mockClerkAuth: {
  isSignedIn: boolean;
  isLoaded: boolean;
  getToken: jest.Mock;
} = {
  isSignedIn: false,
  isLoaded: true,
  getToken: jest.fn(() => Promise.resolve(null)),
};

const mockCurrentUser = {
  isAdmin: false,
  isAssociate: false,
  associatePartner: null as null | { id: string; name: string; email: string | null; mobileNumber: string },
  travelUser: null as null | { id: string; name: string; isApproved: boolean },
  isLoading: false,
};

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock("@/hooks/useUnread", () => ({
  useUnread: () => ({ set: jest.fn() }),
}));

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({
    isSignedIn: mockClerkAuth.isSignedIn,
    isLoaded: mockClerkAuth.isLoaded,
    getToken: mockClerkAuth.getToken,
  }),
  useClerk: () => ({
    signOut: mockSignOut,
  }),
}));

jest.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    isAdmin: mockCurrentUser.isAdmin,
    isAssociate: mockCurrentUser.isAssociate,
    associatePartner: mockCurrentUser.associatePartner,
    travelUser: mockCurrentUser.travelUser,
    isLoading: mockCurrentUser.isLoading,
  }),
}));

jest.mock("@/lib/chat/cache", () => ({
  chatCache: {
    getGroupState: jest.fn(async () => ({
      groupId: "",
      lastSeenMessageId: null,
      unreadCount: 0,
    })),
  },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: {} },
  },
}));

const { default: ChatTab } = require("@/app/(tabs)/chat");

function mockGroupsFetch(groups: unknown[]) {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (String(url).includes("/api/chat/groups")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ groups }),
      });
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

describe("Trips tab (chat groups list)", () => {
  jest.setTimeout(25000);

  beforeEach(() => {
    mockPush.mockClear();
    mockClerkAuth.isSignedIn = false;
    mockClerkAuth.isLoaded = true;
    mockClerkAuth.getToken.mockReset();
    mockClerkAuth.getToken.mockResolvedValue(null);
    mockCurrentUser.isAdmin = false;
    mockCurrentUser.isAssociate = false;
    mockCurrentUser.associatePartner = null;
    mockCurrentUser.travelUser = null;
    mockCurrentUser.isLoading = false;
    global.fetch = jest.fn();
  });

  it("shows trip chats login prompt when logged out", () => {
    render(<ChatTab />);

    expect(screen.getByTestId("chat-login-prompt")).toBeTruthy();
    expect(screen.getByText("Your Trip Chats")).toBeTruthy();
    expect(
      screen.getByText(/Login to see your trip group chats/i)
    ).toBeTruthy();
    expect(screen.getByTestId("login-button")).toBeTruthy();
  });

  it("navigates to login when tapping Login from Trips", () => {
    render(<ChatTab />);

    fireEvent.press(screen.getByTestId("login-button"));

    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("shows traveller empty state after groups load when signed in", async () => {
    mockClerkAuth.isSignedIn = true;
    mockClerkAuth.getToken.mockResolvedValue("test-token");
    mockCurrentUser.travelUser = { id: "u1", name: "Ravi Kumar", isApproved: true };
    mockGroupsFetch([]);

    render(<ChatTab />);

    await waitFor(
      () => {
        expect(screen.getByText("No trip groups yet")).toBeTruthy();
      },
      { timeout: 8000 }
    );
    expect(screen.getByText(/You'll be added to your trip group once your booking is confirmed/i)).toBeTruthy();
    expect(screen.getByText("Ravi Kumar")).toBeTruthy();
    expect(screen.queryByTestId("trips-fab-new-group")).toBeNull();
    expect(mockClerkAuth.getToken).toHaveBeenCalled();
  });

  it("shows admin empty state and opens new group modal from FAB", async () => {
    mockClerkAuth.isSignedIn = true;
    mockClerkAuth.getToken.mockResolvedValue("test-token");
    mockCurrentUser.isAdmin = true;
    mockCurrentUser.travelUser = { id: "u1", name: "Admin User", isApproved: true };
    mockGroupsFetch([]);

    render(<ChatTab />);

    await waitFor(
      () => {
        expect(screen.getByText("No trip groups yet")).toBeTruthy();
      },
      { timeout: 8000 }
    );
    expect(
      screen.getByText(/Create a group to start chatting with your tour travellers/i)
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId("trips-fab-new-group"));

    expect(screen.getByText("New Trip Group")).toBeTruthy();
    expect(screen.getByText("Group Name *")).toBeTruthy();
    fireEvent.press(screen.getByTestId("trips-modal-cancel"));
    await waitFor(
      () => {
        expect(screen.queryByText("New Trip Group")).toBeNull();
      },
      { timeout: 8000 }
    );
  });

  it("admin creates a trip group via modal (POST /api/chat/groups)", async () => {
    mockClerkAuth.isSignedIn = true;
    mockClerkAuth.getToken.mockResolvedValue("admin-token");
    mockCurrentUser.isAdmin = true;
    mockCurrentUser.travelUser = { id: "adm1", name: "Admin", isApproved: true };

    (global.fetch as jest.Mock).mockImplementation((url: string, init?: RequestInit) => {
      const u = String(url);
      if (!u.includes("/api/chat/groups")) {
        return Promise.reject(new Error(`unexpected: ${u}`));
      }
      if (init?.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ id: "new-group" }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ groups: [] }) });
    });

    render(<ChatTab />);

    await waitFor(
      () => {
        expect(screen.getByTestId("trips-fab-new-group")).toBeTruthy();
      },
      { timeout: 8000 }
    );

    fireEvent.press(screen.getByTestId("trips-fab-new-group"));
    fireEvent.changeText(screen.getByTestId("trips-modal-group-name"), "Ladakh June");
    fireEvent.press(screen.getByTestId("trips-modal-create"));

    await waitFor(
      () => {
        const calls = (global.fetch as jest.Mock).mock.calls;
        const post = calls.find((c) => c[1]?.method === "POST");
        expect(post).toBeTruthy();
        expect(JSON.parse((post![1] as RequestInit).body as string)).toMatchObject({
          name: "Ladakh June",
        });
      },
      { timeout: 8000 }
    );

    await waitFor(
      () => {
        expect(screen.queryByText("New Trip Group")).toBeNull();
      },
      { timeout: 8000 }
    );
  });

  it("renders group row and navigates to chat thread on press", async () => {
    mockClerkAuth.isSignedIn = true;
    mockClerkAuth.getToken.mockResolvedValue("test-token");
    mockCurrentUser.travelUser = { id: "u1", name: "Ravi Kumar", isApproved: true };
    mockGroupsFetch([
      {
        id: "g1",
        name: "Shimla Winter",
        description: null,
        tourStartDate: "2026-12-10",
        tourEndDate: "2026-12-15",
        myRole: "MEMBER",
        members: [{ id: "m1", travelAppUser: { name: "Ravi Kumar" } }],
        lastMessage: {
          id: "msg1",
          content: "Hello team",
          messageType: "TEXT",
          createdAt: new Date().toISOString(),
          sender: { name: "Ravi Kumar" },
        },
      },
    ]);

    render(<ChatTab />);

    await waitFor(
      () => {
        expect(screen.getByText("Shimla Winter")).toBeTruthy();
      },
      { timeout: 8000 }
    );

    fireEvent.press(screen.getByText("Shimla Winter"));
    expect(mockPush).toHaveBeenCalledWith("/chat/g1");
  });
});
