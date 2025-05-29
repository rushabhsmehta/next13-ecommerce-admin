'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center space-y-4">
      <div className="flex items-center space-x-2 text-destructive">
        <AlertTriangle className="h-8 w-8" />
        <h2 className="text-xl font-semibold">Something went wrong!</h2>
      </div>
      <p className="text-muted-foreground text-center max-w-md">
        We apologize for the inconvenience. An error occurred while processing your request.
      </p>
      <div className="flex space-x-2">
        <Button
          onClick={() => reset()}
          variant="default"
        >
          Try again
        </Button>
        <Button
          onClick={() => window.location.href = '/'}
          variant="outline"
        >
          Go home
        </Button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 w-full max-w-2xl">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Error details (development only)
          </summary>
          <pre className="mt-2 text-xs bg-muted p-4 rounded-md overflow-auto">
            {error.message}
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
