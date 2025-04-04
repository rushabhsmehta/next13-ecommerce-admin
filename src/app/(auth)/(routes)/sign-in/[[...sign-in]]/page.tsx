"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Get authorized admin email from environment variables
const AUTHORIZED_ADMIN_EMAIL = process.env.NEXT_PUBLIC_AUTHORIZED_ADMIN_EMAIL || 'aagamholiday@gmail.com';

export default function Page() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  
  return (
    <div className="w-full flex flex-col items-center gap-4">
      {error === 'unauthorized_email' && (
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only authorized email addresses can access this application.
            Access to this domain is restricted to {AUTHORIZED_ADMIN_EMAIL} only.
          </AlertDescription>
        </Alert>
      )}
      <SignIn />
    </div>
  );
};
