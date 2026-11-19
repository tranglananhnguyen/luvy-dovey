import type { Metadata } from 'next';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import './fonts.css';
import './sky.css';

const starlightRune = '/fonts/starlight-rune-personal-use.ttf';
const hasStarlightRune = existsSync(join(process.cwd(), 'public', starlightRune));

export const metadata: Metadata = {
  title: 'Luvy Dovey · A shared universe',
  description: 'A place for wishes, memories, and words worth keeping.',
  referrer: 'no-referrer'
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-starlight-rune={hasStarlightRune || undefined}>
      <head>
        {hasStarlightRune && <>
          <style>{`@font-face{font-family:"Starlight Rune";font-weight:400;font-display:optional;src:url("${starlightRune}") format("truetype")}`}</style>
          <link rel="preload" href={starlightRune} as="font" type="font/ttf" crossOrigin="anonymous" />
        </>}
        <link rel="preload" href="/fonts/dm-sans-normal-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      {/* Extensions such as Grammarly can add body attributes before hydration. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
