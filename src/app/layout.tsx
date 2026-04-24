import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'

import { ModalProvider } from '@/providers/modal-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { AppShell } from '@/components/app-shell'

import './globals.css'

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
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}

