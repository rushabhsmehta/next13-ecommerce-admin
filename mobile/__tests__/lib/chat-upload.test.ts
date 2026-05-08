jest.mock("expo-file-system", () => ({
  getInfoAsync: jest.fn(() =>
    Promise.resolve({ exists: true, isDirectory: false, size: 1234 })
  ),
}));

import { uploadChatAttachment } from "../../lib/chat/upload";

describe("uploadChatAttachment", () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  it("requests a presign, then PUTs the file body to R2", async () => {
    (global.fetch as jest.Mock)
      // 1) presign
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(""),
        json: () =>
          Promise.resolve({
            uploadUrl: "https://r2.example/upload?sig=abc",
            fileUrl: "https://cdn.example/chat/g1/image/x.jpg",
            key: "chat/g1/image/x.jpg",
            expiresIn: 600,
            contentType: "image/jpeg",
            fileName: "x.jpg",
            fileSize: 1234,
          }),
      })
      // 2) read local file
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(["fake image bytes"])),
      })
      // 3) PUT to R2
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(""),
      });

    const result = await uploadChatAttachment({
      groupId: "g1",
      uri: "file:///local/x.jpg",
      kind: "image",
      contentType: "image/jpeg",
      getToken: async () => "test-token",
    });

    expect(result.fileUrl).toBe("https://cdn.example/chat/g1/image/x.jpg");
    expect(result.key).toBe("chat/g1/image/x.jpg");
    expect(result.fileSize).toBe(1234);
    expect(global.fetch).toHaveBeenCalledTimes(3);

    // Presign call shape
    const [presignUrl, presignInit] = (global.fetch as jest.Mock).mock.calls[0];
    expect(String(presignUrl)).toContain("/api/chat/uploads/presign");
    expect(presignInit.method).toBe("POST");
    const presignBody = JSON.parse(presignInit.body);
    expect(presignBody.groupId).toBe("g1");
    expect(presignBody.kind).toBe("image");
    expect(presignBody.contentType).toBe("image/jpeg");

    // PUT call shape
    const [putUrl, putInit] = (global.fetch as jest.Mock).mock.calls[2];
    expect(putUrl).toBe("https://r2.example/upload?sig=abc");
    expect(putInit.method).toBe("PUT");
    expect(putInit.headers["Content-Type"]).toBe("image/jpeg");
  });

  it("throws when presign returns non-OK", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 413,
      text: () => Promise.resolve("file too big"),
    });

    await expect(
      uploadChatAttachment({
        groupId: "g1",
        uri: "file:///local/x.jpg",
        kind: "image",
        getToken: async () => "test-token",
      })
    ).rejects.toThrow(/Presign failed/);
  });

  it("throws when PUT to R2 fails", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            uploadUrl: "https://r2.example/upload?sig=abc",
            fileUrl: "https://cdn.example/x.jpg",
            key: "k",
            expiresIn: 600,
            contentType: "image/jpeg",
            fileName: null,
            fileSize: 0,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(["x"])),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve("forbidden"),
      });

    await expect(
      uploadChatAttachment({
        groupId: "g1",
        uri: "file:///local/x.jpg",
        kind: "image",
        contentType: "image/jpeg",
        getToken: async () => "t",
      })
    ).rejects.toThrow(/Upload failed/);
  });
});
