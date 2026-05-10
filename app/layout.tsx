import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import { Chakra_Petch, Share_Tech_Mono } from 'next/font/google'
import './globals.css'

const chakraPetch = Chakra_Petch({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
})

const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
})

const BASE_URL = 'https://chordgenv0.weslei.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: 'CHORD.GEN /// PROGRESSION COMPOSER',
  description:
    '128-chord progression generator — hybrid instrument / terminal workstation. Real-time Web Audio synthesis, MIDI export, WAV rendering. Dark cyberpunk UI.',
  generator: 'v0.app',
  applicationName: 'CHORD.GEN',
  keywords: [
    'chord progression',
    'music generator',
    'web audio',
    'MIDI',
    'synthesizer',
    'music theory',
    'songwriting tool',
    'cyberpunk',
  ],
  authors: [{ name: 'CHORD.GEN' }],
  creator: 'CHORD.GEN',
  publisher: 'CHORD.GEN',
  robots: { index: true, follow: true },

  // Open Graph — Facebook, LinkedIn, Discord, etc.
  openGraph: {
    title: 'CHORD.GEN — 128-Chord Progression Generator',
    description:
      'Hybrid instrument / terminal workstation. Compose, play, and export chord progressions with real-time Web Audio synthesis.',
    url: BASE_URL,
    siteName: 'CHORD.GEN',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'CHORD.GEN — Cyberpunk chord progression composer',
      },
    ],
  },

  // Twitter / X
  twitter: {
    card: 'summary_large_image',
    title: 'CHORD.GEN — 128-Chord Progression Generator',
    description:
      'Hybrid instrument / terminal workstation. Compose, play, and export chord progressions with real-time Web Audio synthesis.',
    images: ['/opengraph-image.png'],
  },

  // Icons & favicon
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
        sizes: '32x32',
        type: 'image/png',
      },
      { url: '/icon-dark.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'CHORD.GEN',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0D1117' },
    { media: '(prefers-color-scheme: light)', color: '#F4F3EF' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${chakraPetch.variable} ${shareTechMono.variable}`} suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();`}
        </Script>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
