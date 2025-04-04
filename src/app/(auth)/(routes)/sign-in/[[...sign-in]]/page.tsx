"use client";

import { SignIn } from "@clerk/nextjs";
import { useClerk } from "@clerk/clerk-react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function Page() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const { signOut, session } = useClerk();
  const [isProcessingSignOut, setIsProcessingSignOut] = useState(false);
  
  useEffect(() => {
    if (error === 'unauthorized_email' && session && !isProcessingSignOut) {
      // Only sign out if the user is actually authenticated
      setIsProcessingSignOut(true);
      console.log("Unauthorized email detected, signing out user");
      
      // We're using setTimeout to ensure the UI can render first
      setTimeout(() => {
        signOut().catch(err => {
          console.error("Sign out error:", err);
          setIsProcessingSignOut(false);
        });
      }, 2000);
    }
  }, [error, signOut, session, isProcessingSignOut]);
  
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
