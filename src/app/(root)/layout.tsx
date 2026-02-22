import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import prismadb from '@/lib/prismadb';

export default async function SetupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }
 
  else {
    redirect(`/inquiries`);
  };

  return (
    <>
      {children}
    </>
  );
};

