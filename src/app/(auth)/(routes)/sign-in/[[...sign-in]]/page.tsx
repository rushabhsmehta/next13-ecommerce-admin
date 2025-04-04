"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const allowedEmail = process.env.NEXT_PUBLIC_AUTHORIZED_ADMIN_EMAIL;

export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const error = searchParams.get("error");

  useEffect(() => {
    console.log("User loaded:", isLoaded);
    console.log("Current error parameter:", error);
    console.log("Allowed email:", allowedEmail);
    
    if (isLoaded && user) {
      const currentUserEmail = user.primaryEmailAddress?.emailAddress;
      console.log("Current user email:", currentUserEmail);
      
      // If the user is authorized, redirect to the protected page.
      if (currentUserEmail === allowedEmail) {
        console.log("Authorized user detected, redirecting to /inquiries...");
        
        // Use a stronger redirect approach for more reliable URL update
        if (window.location.href.includes("error=unauthorized_email")) {
          // Hard redirect to completely refresh the page and clear query params
          window.location.href = "/inquiries";
        } else {
          // If no error param, can use the router for a smoother transition
          router.replace("/inquiries");
        }
      }
    }
  }, [isLoaded, user, error, router]);

  // Only show unauthorized alert if error exists and the user's email does not match the allowed email.
  const showUnauthorizedAlert =
    error === "unauthorized_email" &&
    user?.primaryEmailAddress?.emailAddress !== allowedEmail;

  // If user is loaded and authorized, show a redirecting message.
  if (isLoaded && user && user.primaryEmailAddress?.emailAddress === allowedEmail) {
    return <p>Welcome, authorized user! Redirecting...</p>;
  }

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