import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import Layout from '@/components/Layout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Time Management System',
  description: 'A comprehensive timesheet management system'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <AuthProvider>
          <NotificationProvider>
            <Layout>{children}</Layout>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 