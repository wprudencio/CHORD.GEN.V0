import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Roboto_Mono, Schibsted_Grotesk } from 'next/font/google'
import './globals.css'

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-display',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'CHORD.GEN /// PROGRESSION COMPOSER',
  description: '128 chord progression generator — hybrid instrument / terminal workstation',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${schibstedGrotesk.variable} ${robotoMono.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
