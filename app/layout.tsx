import type { Metadata } from 'next';
import './sky.css';

export const metadata: Metadata = {
  title: 'Luvy Dovey · A shared universe',
  description: 'Leave a little piece of your heart among the stars.',
  referrer: 'no-referrer'
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
