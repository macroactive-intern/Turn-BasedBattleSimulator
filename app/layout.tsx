import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Turn-Based Battle Simulator',
  description: 'N7 — A full-featured turn-based battle simulator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/battle">Battle</Link>
          <Link href="/replay">Replays</Link>
        </nav>
        {children}
      </body>
    </html>
  )
}
