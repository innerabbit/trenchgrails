import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'The Shape Game — Hold. Collect. Battle.',
  description:
    'NFT card game on Solana. Hold SOL, get free booster packs with 3 NFT cards each, build your deck and battle.',
  openGraph: {
    title: 'The Shape Game',
    description: 'NFT card game on Solana — hold $SHAPEGAME, collect and battle',
    siteName: 'The Shape Game',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
