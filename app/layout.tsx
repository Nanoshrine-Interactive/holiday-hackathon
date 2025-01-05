import type { Metadata } from 'next'
import { type ReactNode } from 'react'
import '../styles/globals.css'

import { Providers } from './providers'
import { ConnectKitButton } from 'connectkit'
import UIWrapper from './components/UIWrapper'

export const metadata: Metadata = {
  title: 'ConnectKit Next.js Example',
  description: 'By Family'
}

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{props.children}</Providers>
        <UIWrapper />
      </body>
    </html>
  )
}
