"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// The authorized admin email
const AUTHORIZED_ADMIN_EMAIL = 'aagamholiday@gmail.com';

export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const error = searchParams.get("error");

  // Add debug logging to understand what's happening
  useEffect(() => {
    if (isLoaded) {
      console.log("Sign-in page loaded");
      console.log("User:", user);
      console.log("Error param:", error);
      
      if (user) {
        const userEmail = user.primaryEmailAddress?.emailAddress;
        console.log("User email:", userEmail);
        console.log("Email match:", userEmail?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase());
        
        // If user is authorized, redirect to dashboard
        if (userEmail?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
          console.log("Authorized user detected, redirecting to dashboard");
          // Use window.location for a hard redirect to clear query parameters
          window.location.href = "/";
        }
      }
    }
  }, [isLoaded, user, error]);

  // Show unauthorized alert if needed
  const showUnauthorizedAlert = error === "unauthorized_email" && isLoaded;

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {showUnauthorizedAlert && (
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Access to admin.aagamholidays.com is restricted to {AUTHORIZED_ADMIN_EMAIL} only.
          </AlertDescription>
        </Alert>
      )}
      <SignIn />
    </div>
  );
}