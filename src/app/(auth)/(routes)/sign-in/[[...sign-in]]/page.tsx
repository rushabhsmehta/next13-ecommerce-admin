'use client';

import { SignIn, useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const allowedEmail = process.env.AUTHORIZED_ADMIN_EMAIL;

export default function Page() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const error = searchParams.get('error');

  // Only show unauthorized alert if error exists and the user's email is not the allowed one.
  const showUnauthorizedAlert =
    error === 'unauthorized_email' &&
    user?.primaryEmailAddress?.emailAddress !== allowedEmail;

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {showUnauthorizedAlert && (
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only authorized email addresses can access this application.
            Access to this domain is restricted to {allowedEmail} only.
          </AlertDescription>
        </Alert>
      )}
      <SignIn />
    </div>
  );
};