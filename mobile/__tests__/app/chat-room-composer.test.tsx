const mockGetToken = jest.fn(() => Promise.resolve("tok"));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ groupId: "g1" }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useNavigation: () => ({
    addListener: jest.fn(() => jest.fn()),
    setOptions: jest.fn(),
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock("@clerk/expo", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    travelUser: { id: "u-me", name: "Test User", isApproved: true },
    isAdmin: false,
    isAssociate: false,
    associatePartner: null,
    isLoading: false,
  }),
}));

jest.mock("@/hooks/useUnread", () => ({
  useUnread: () => ({ clear: jest.fn(), set: jest.fn() }),
}));

jest.mock("@/lib/chat/cache", () => ({
  chatCache: {
    loadMessages: jest.fn(async () => []),
    getGroupState: jest.fn(async () => ({
      groupId: "g1",
      lastSeenMessageId: null,
      unreadCount: 0,
    })),
    upsertMessages: jest.fn(async () => {}),
    setLastSeen: jest.fn(async () => {}),
  },
}));

jest.mock("@/lib/chat/outbox", () => {
  const enqueue = jest.fn(
    async (groupId: string, payload: { messageType: string; content?: string | null }) => ({
      clientId: "cid-test",
      groupId,
      payload,
      status: "pending" as const,
      attempts: 0,
      lastError: null,
      createdAt: Date.now(),
    })
  );
  return {
    chatOutbox: {
      enqueue,
      list: jest.fn(async () => []),
      flush: jest.fn(async () => ({ sentClientIds: [] as string[], failedClientIds: [] as string[] })),
    },
  };
});

jest.mock("@/lib/chat/api", () => ({
  editMessage: jest.fn(),
  deleteMessage: jest.fn(),
  markMessagesRead: jest.fn(async () => {}),
}));

jest.mock("@/lib/chat/upload", () => ({
  uploadChatAttachment: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })),
  MediaTypeOptions: { Images: "Images" },
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 19.076, longitude: 72.8777 },
  })),
  Accuracy: { Balanced: 2 },
}));

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import ChatRoom from "@/app/chat/[groupId]";
import { chatOutbox } from "@/lib/chat/outbox";

const enqueueMock = chatOutbox.enqueue as jest.Mock;

function setupFetch() {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    const u = String(url);
    if (u.includes("/api/chat/groups/g1/messages")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ messages: [], hasMore: false, nextCursor: null }),
      });
    }
    if (u.includes("/api/chat/groups/g1/members")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          group: { name: "Test Trip" },
          members: [],
        }),
      });
    }
    return Promise.reject(new Error(`unexpected fetch: ${u}`));
  });
}

describe("Trips chat room (composer)", () => {
  jest.setTimeout(120000);

  beforeEach(() => {
    jest.useRealTimers();
    mockGetToken.mockClear();
    enqueueMock.mockClear();
    global.fetch = jest.fn();
    setupFetch();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("enqueues a text message when Send is pressed", async () => {
    render(<ChatRoom />);

    await waitFor(
      () => {
        expect(screen.getByTestId("chat-composer-input")).toBeTruthy();
      },
      { timeout: 8000 }
    );

    fireEvent.changeText(screen.getByTestId("chat-composer-input"), "Hello from Trips");
    await waitFor(
      () => {
        expect(screen.getByTestId("chat-send-button")).not.toBeDisabled();
      },
      { timeout: 8000 }
    );
    fireEvent.press(screen.getByTestId("chat-send-button"));

    await waitFor(
      () => {
        expect(enqueueMock).toHaveBeenCalledWith(
          "g1",
          expect.objectContaining({
            messageType: "TEXT",
            content: "Hello from Trips",
          })
        );
      },
      { timeout: 8000 }
    );
  });
});
