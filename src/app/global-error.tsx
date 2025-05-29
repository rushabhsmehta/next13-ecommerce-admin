'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 p-4">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="h-12 w-12" />
            <h1 className="text-2xl font-bold">Application Error</h1>
          </div>
          <p className="text-muted-foreground text-center max-w-md">
            A critical error occurred in the application. Please try refreshing the page or contact support if the problem persists.
          </p>
          <div className="flex space-x-2">
            <Button
              onClick={() => reset()}
              variant="default"
              size="lg"
            >
              Try again
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              size="lg"
            >
              Reload Application
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 w-full max-w-4xl">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Error details (development only)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-4 rounded-md overflow-auto max-h-60">
                {error.message}
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  );
}
