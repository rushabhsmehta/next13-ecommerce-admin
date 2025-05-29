import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center space-y-4">
      <div className="flex items-center space-x-2 text-muted-foreground">
        <FileQuestion className="h-12 w-12" />
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-lg">404</p>
        </div>
      </div>      <p className="text-muted-foreground text-center max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex space-x-2">
        <Button asChild>
          <Link href="/" className="flex items-center space-x-2">
            <Home className="h-4 w-4" />
            <span>Go Home</span>
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            Go to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
