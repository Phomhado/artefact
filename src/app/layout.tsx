import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@/styles/globals.css';
import '@/styles/workspace.css';

export const metadata: Metadata = {
  title: 'Daybook | Task manager',
  description: 'Create, edit, and delete tasks.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
