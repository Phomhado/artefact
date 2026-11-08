import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import '@/styles/globals.css';
import '@/styles/workspace.css';

export const metadata: Metadata = {
  title: 'Daybook | Your tasks, in focus',
  description: 'A simple place to manage your tasks.',
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
