"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useClerk } from "@clerk/clerk-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

const allowedEmail = "aagamholiday@gmail.com";

export default function Page() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const [isProcessingSignOut, setIsProcessingSignOut] = useState(false);
  const [hasAttemptedSignOut, setHasAttemptedSignOut] = useState(false);

  useEffect(() => {
    // Set flag to avoid redirect loops
    const hasSignOutFlag = sessionStorage.getItem('unauthorized_signout_attempted');

    // Only trigger sign out if an unauthorized error occurs AND the user's email is not allowed.
    if (
      error === 'unauthorized_email' &&
      user?.primaryEmailAddress?.emailAddress !== allowedEmail &&
      !isProcessingSignOut &&
      !hasSignOutFlag &&
      !hasAttemptedSignOut
    ) {
      setIsProcessingSignOut(true);
      setHasAttemptedSignOut(true);
      sessionStorage.setItem('unauthorized_signout_attempted', 'true');

      console.log("Unauthorized email detected, signing out user");

      setTimeout(() => {
        signOut()
          .then(() => {
            router.push('/sign-in');
          })
          .catch(err => {
            console.error("Sign out error:", err);
            setIsProcessingSignOut(false);
          });
      }, 500);
    }

    // Clean flag when error changes
    return () => {
      if (error !== 'unauthorized_email') {
        sessionStorage.removeItem('unauthorized_signout_attempted');
      }
    };
  }, [error, signOut, router, user, isProcessingSignOut, hasAttemptedSignOut]);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {error === 'unauthorized_email' &&
        user?.primaryEmailAddress?.emailAddress !== allowedEmail && (
          <Alert variant="destructive" className="max-w-md mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              Only authorized email addresses can access this application.
              Access to this domain is restricted to <strong>{allowedEmail}</strong> only.
            </AlertDescription>
          </Alert>
        )}
      <SignIn />
    </div>
  );
}