import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
            Access to this domain is restricted to aagamholiday@gmail.com only.
          </AlertDescription>
        </Alert>
      )}
      <SignIn />
    </div>
  );
};
