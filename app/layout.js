import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Mature Response',
  description: 'A local-first communication coach. Decide whether and how to respond to a message, or how to word something you need to say.',
};

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: browser extensions (Jetski, Grammarly, etc.) inject
    // attributes into <html>/<body> before React hydrates. This is the documented
    // fix so those injections don't throw a hydration mismatch.
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Navbar />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
