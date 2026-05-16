import { ApiError } from "../../lib/api";

jest.mock("../../lib/network", () => ({
  refreshNetworkSnapshot: jest.fn(),
}));

jest.mock("../../lib/resolve-auth-token", () => ({
  resolveMobileAuthToken: jest.fn(),
}));

const mockDownloadAsync = jest.fn();
const mockGetInfoAsync = jest.fn();
const mockDeleteAsync = jest.fn();
jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  documentDirectory: "file:///doc/",
  downloadAsync: (...args: any[]) => mockDownloadAsync(...args),
  getInfoAsync: (...args: any[]) => mockGetInfoAsync(...args),
  deleteAsync: (...args: any[]) => mockDeleteAsync(...args),
}));

const mockSharingIsAvailable = jest.fn();
const mockSharingShareAsync = jest.fn();
jest.mock("expo-sharing", () => ({
  __esModule: true,
  isAvailableAsync: (...a: any[]) => mockSharingIsAvailable(...a),
  shareAsync: (...a: any[]) => mockSharingShareAsync(...a),
  default: {
    isAvailableAsync: (...a: any[]) => mockSharingIsAvailable(...a),
    shareAsync: (...a: any[]) => mockSharingShareAsync(...a),
  },
}));

const { refreshNetworkSnapshot } = jest.requireMock("../../lib/network") as {
  refreshNetworkSnapshot: jest.Mock;
};
const { resolveMobileAuthToken } = jest.requireMock(
  "../../lib/resolve-auth-token"
) as {
  resolveMobileAuthToken: jest.Mock;
};

import { downloadAndShareExport } from "../../lib/exports";

describe("downloadAndShareExport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refreshNetworkSnapshot.mockResolvedValue({ isOnline: true });
    resolveMobileAuthToken.mockResolvedValue("test-token");
    mockSharingIsAvailable.mockResolvedValue(true);
    mockSharingShareAsync.mockResolvedValue(undefined);
  });

  it("hard-blocks when offline (no fetch attempted)", async () => {
    refreshNetworkSnapshot.mockResolvedValueOnce({ isOnline: false });
    await expect(
      downloadAndShareExport("inquiries-contacts", async () => "tok")
    ).rejects.toBeInstanceOf(ApiError);
    expect(mockDownloadAsync).not.toHaveBeenCalled();
  });

  it("returns 401 when no auth token is available", async () => {
    resolveMobileAuthToken.mockResolvedValueOnce(null);
    await expect(
      downloadAndShareExport("inquiries-contacts", async () => null)
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(mockDownloadAsync).not.toHaveBeenCalled();
  });

  it("downloads with Bearer auth and opens the share sheet", async () => {
    mockDownloadAsync.mockResolvedValue({
      uri: "file:///cache/inquiries-contacts-2026-05-14.csv",
      status: 200,
    });
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1234 });

    const result = await downloadAndShareExport(
      "inquiries-contacts",
      async () => "test-token"
    );

    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);
    const [url, fileUri, opts] = mockDownloadAsync.mock.calls[0];
    expect(url).toContain("/api/export/inquiries-contacts");
    expect(fileUri).toMatch(/^file:\/\/\/cache\/inquiries-contacts-/);
    expect(opts.headers.Authorization).toBe("Bearer test-token");
    expect(mockSharingShareAsync).toHaveBeenCalled();
    expect(result.bytes).toBe(1234);
  });

  it("maps a 403 download response to a FORBIDDEN ApiError and cleans up", async () => {
    mockDownloadAsync.mockResolvedValue({
      uri: "file:///cache/x.csv",
      status: 403,
    });

    await expect(
      downloadAndShareExport("queries-contacts", async () => "t")
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
    expect(mockDeleteAsync).toHaveBeenCalledWith(
      "file:///cache/x.csv",
      expect.any(Object)
    );
  });
});
