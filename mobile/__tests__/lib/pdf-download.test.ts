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
  downloadAsync: (...a: any[]) => mockDownloadAsync(...a),
  getInfoAsync: (...a: any[]) => mockGetInfoAsync(...a),
  deleteAsync: (...a: any[]) => mockDeleteAsync(...a),
}));

const mockIsAvailable = jest.fn();
const mockShareAsync = jest.fn();
jest.mock("expo-sharing", () => ({
  __esModule: true,
  isAvailableAsync: (...a: any[]) => mockIsAvailable(...a),
  shareAsync: (...a: any[]) => mockShareAsync(...a),
  default: {
    isAvailableAsync: (...a: any[]) => mockIsAvailable(...a),
    shareAsync: (...a: any[]) => mockShareAsync(...a),
  },
}));

const { refreshNetworkSnapshot } = jest.requireMock("../../lib/network") as {
  refreshNetworkSnapshot: jest.Mock;
};
const { resolveMobileAuthToken } = jest.requireMock(
  "../../lib/resolve-auth-token"
) as { resolveMobileAuthToken: jest.Mock };

import { downloadAndSharePdf } from "../../lib/pdf-download";

describe("downloadAndSharePdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refreshNetworkSnapshot.mockResolvedValue({ isOnline: true });
    resolveMobileAuthToken.mockResolvedValue("tok");
    mockIsAvailable.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
  });

  it("blocks when offline before any download", async () => {
    refreshNetworkSnapshot.mockResolvedValueOnce({ isOnline: false });
    await expect(
      downloadAndSharePdf({
        endpoint: "/api/mobile/tour-queries/x/pdf",
        fileName: "x",
        getToken: async () => "t",
      })
    ).rejects.toMatchObject({ code: "OFFLINE" });
    expect(mockDownloadAsync).not.toHaveBeenCalled();
  });

  it("downloads with Bearer auth and shares", async () => {
    mockDownloadAsync.mockResolvedValue({
      uri: "file:///cache/x.pdf",
      status: 200,
    });
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 999 });
    const res = await downloadAndSharePdf({
      endpoint: "/api/mobile/tour-queries/x/pdf?variant=1",
      fileName: "Tour Query #1",
      getToken: async () => "tok",
    });
    const [, , opts] = mockDownloadAsync.mock.calls[0];
    expect(opts.headers.Authorization).toBe("Bearer tok");
    expect(res.bytes).toBe(999);
    expect(res.shared).toBe(true);
  });

  it("maps a 403 to FORBIDDEN and cleans the partial file", async () => {
    mockDownloadAsync.mockResolvedValue({
      uri: "file:///cache/x.pdf",
      status: 403,
    });
    await expect(
      downloadAndSharePdf({
        endpoint: "/api/mobile/tour-queries/x/pdf",
        fileName: "x",
        getToken: async () => "t",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
    expect(mockDeleteAsync).toHaveBeenCalled();
  });
});
