import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import { HelplineFAB } from '@/components/agri/helpline-fab';
import { I18nProvider } from '@/context/i18n-provider';

export const metadata: Metadata = {
  title: 'Agri Saadhan',
  description: 'Digital solutions for modern agriculture',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <I18nProvider>
          <FirebaseClientProvider>
            {children}
            <HelplineFAB />
          </FirebaseClientProvider>
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
