import { UserButton, auth, SignOutButton, currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import prismadb from "@/lib/prismadb";
import { headers } from "next/headers";

const Navbar = async () => {
  const { userId } = auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Get the current user details
  const user = await currentUser();
  const fullName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user?.firstName || "User";

  // Check if we're on the associate domain
  const headersList = headers();
  const hostname = headersList.get('host') || '';
  const isAssociateDomain = hostname.includes('associate.aagamholidays.com');
  
  // Get associate info if on associate domain
  let associateInfo = null;
  if (isAssociateDomain && user) {
    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (userEmail) {
      const associatePartner = await prismadb.associatePartner.findFirst({
        where: {
          OR: [
            { gmail: userEmail },
            { email: userEmail }
          ],
          isActive: true
        }
      });
      
      if (associatePartner) {
        associateInfo = associatePartner;
      }
    }
  }

  return ( 
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <MainNav className="mx-6" />
        <div className="ml-auto flex items-center space-x-4">
          {/* User info display */}
          <div className="mr-2 text-sm">
            <span className="font-medium">
              {isAssociateDomain && associateInfo 
                ? `${associateInfo.name} (Associate Partner)` 
                : `Welcome, ${fullName}`}
            </span>
          </div>
          <SignOutButton>
            <Button variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </SignOutButton>
          <ThemeToggle />
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </div>
  );
};
 
export default Navbar;

