import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'

import { ModalProvider } from '@/providers/modal-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { ThemeProvider } from '@/providers/theme-provider'

import './globals.css'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { DebugLogPanel } from '@/components/DebugLogPanel'

const inter = Inter({ subsets: ['latin'] })

// Required because AppSidebar reads auth state via Clerk's async APIs (headers/cookies)
// at the root layout level, which prevents static rendering for the entire tree.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Aagam Travel CRM',
  description: 'Welcome Aboard',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
          >
            <ToastProvider />
            <ModalProvider />
            <DebugLogPanel />
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset className="overflow-auto">
                {/* Sticky top bar — shows sidebar trigger on all sizes */}
                <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/95 backdrop-blur px-4 md:px-6">
                  <SidebarTrigger className="-ml-1" />
                </div>
                {children}
              </SidebarInset>
            </SidebarProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}

