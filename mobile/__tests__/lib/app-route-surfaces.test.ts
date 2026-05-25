import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "../..");

function exists(routeRoot: string, routePath: string) {
  return fs.existsSync(path.join(root, routeRoot, routePath));
}

describe("variant route surfaces", () => {
  it("does not expose finance or staff admin routes in the public app", () => {
    expect(exists("apps/public", "admin/finance/index.tsx")).toBe(false);
    expect(exists("apps/public", "admin/operations/index.tsx")).toBe(false);
    expect(exists("apps/public", "packages/[id].tsx")).toBe(true);
  });

  it("does not expose finance routes in the staff app", () => {
    expect(exists("apps/staff", "admin/finance/index.tsx")).toBe(false);
    expect(exists("apps/staff", "admin/reports/index.tsx")).toBe(false);
    expect(exists("apps/staff", "admin/tour-queries/[id]/finance.tsx")).toBe(false);
    expect(exists("apps/staff", "admin/operations/index.tsx")).toBe(true);
  });

  it("keeps the finance app surface finance-only", () => {
    expect(exists("apps/finance", "admin/finance/index.tsx")).toBe(true);
    expect(exists("apps/finance", "admin/operations/index.tsx")).toBe(false);
    expect(exists("apps/finance", "whatsapp/index.tsx")).toBe(false);
  });
});
