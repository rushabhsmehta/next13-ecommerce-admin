import Link from "next/link";

import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="max-w-md text-muted-foreground">
        Your account does not have permission to open this page. Contact an organization owner if you
        need access.
      </p>
      <Button asChild>
        <Link href="/sign-in">Back to sign in</Link>
      </Button>
    </div>
  );
}
