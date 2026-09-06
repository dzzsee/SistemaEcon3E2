import { Sora, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const sora = Sora({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sora' })
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
})

export const metadata = {
  title: 'SistemaEcon3E2 — Cuotas semanales',
  description: 'Gestión económica de cuotas semanales para el grupo 3ro E2',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d0e12',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${sora.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}