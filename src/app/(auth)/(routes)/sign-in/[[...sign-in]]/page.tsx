"use client";

import { SignIn } from "@clerk/nextjs";
import { useClerk } from "@clerk/clerk-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function Page() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const { signOut, session } = useClerk();
  const router = useRouter();
  const [isProcessingSignOut, setIsProcessingSignOut] = useState(false);
  const [hasAttemptedSignOut, setHasAttemptedSignOut] = useState(false);
  
  useEffect(() => {
    // Set a flag in sessionStorage to prevent redirect loops
    const hasSignOutFlag = sessionStorage.getItem('unauthorized_signout_attempted');
    
    if (error === 'unauthorized_email' && session && !isProcessingSignOut && !hasSignOutFlag && !hasAttemptedSignOut) {
      // Mark that we've attempted to sign out
      setIsProcessingSignOut(true);
      setHasAttemptedSignOut(true);
      sessionStorage.setItem('unauthorized_signout_attempted', 'true');
      
      console.log("Unauthorized email detected, signing out user");
      
      // We're using setTimeout to ensure the UI can render first
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
    
    // Clean up the flag when component unmounts or error changes
    return () => {
      if (error !== 'unauthorized_email') {
        sessionStorage.removeItem('unauthorized_signout_attempted');
      }
    };
  }, [error, signOut, session, isProcessingSignOut, hasAttemptedSignOut, router]);
  
  return (
    <div className="w-full flex flex-col items-center gap-4">
      {error === 'unauthorized_email' && (
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only authorized email addresses can access this application.
            Access to this domain is restricted to aagamholiday@gmail.com only.
          </AlertDescription>
        </Alert>
      )}
      <SignIn />
    </div>
  );
};