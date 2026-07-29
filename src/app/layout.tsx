import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'BirdTrail - Birding Travel Tracker',
  description: 'Track your birding trips, stays, food discoveries, and bird sightings',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#fff',
              color: '#1e3d29',
              border: '1px solid #dceedd',
            },
          }}
        />
        {children}
      </body>
    </html>
  )
}