"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Ensure the environment variable is exposed to the client by using the NEXT_PUBLIC prefix
const allowedEmail = process.env.NEXT_PUBLIC_AUTHORIZED_ADMIN_EMAIL;

export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const error = searchParams.get('error');

  useEffect(() => {
    // Log current info for debugging
    console.log("User loaded:", isLoaded);
    console.log("Current error parameter:", error);
    console.log("Allowed email:", allowedEmail);
    if (isLoaded && user) {
      console.log("Current user email:", user.primaryEmailAddress?.emailAddress);
      // If the user is authorized and the URL still has the error parameter, remove it
      if (error === 'unauthorized_email' && user.primaryEmailAddress?.emailAddress === allowedEmail) {
        // Redirect to /sign-in without error query param
        router.push('/sign-in');
      }
    }
  }, [isLoaded, user, error, router]);

  // Only show unauthorized alert if error exists and the user's email does not match the allowed email.
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
}