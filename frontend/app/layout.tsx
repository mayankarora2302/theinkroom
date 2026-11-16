import type { Metadata, Viewport } from 'next';
import { DM_Sans, Instrument_Serif } from 'next/font/google';
import { getSettings } from '@/lib/api';
import { siteName } from '@/lib/format';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const name = siteName(s);
  const description =
    s.tagline || s.homepageIntroduction || `Custom tattoo work by ${s.artistName || name}. Browse the portfolio and enquire about a piece.`;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: s.artistName && s.brandName ? `${s.brandName} — ${s.artistName}` : name, template: `%s — ${name}` },
    description,
    alternates: { canonical: '/' },
    openGraph: { type: 'website', siteName: name, locale: 'en_IN', url: '/', description },
    twitter: { card: 'summary_large_image' },
  };
}

export const viewport: Viewport = {
  themeColor: '#0f0e0d',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
