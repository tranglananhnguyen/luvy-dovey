import type { Metadata } from 'next';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { deployedStarlightRune, readStarlightRune } from '../lib/starlight-rune';
import './fonts.css';
import './sky.css';

const localStarlightRune = '/fonts/starlight-rune-personal-use.ttf';
const starlightRune = readStarlightRune() ? deployedStarlightRune
  : existsSync(join(process.cwd(), 'public', localStarlightRune)) ? localStarlightRune : null;

export const metadata: Metadata = {
  title: 'Luvy Dovey · A shared universe',
  description: 'A place for wishes, memories, and words worth keeping.',
  referrer: 'no-referrer'
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-starlight-rune={starlightRune ? true : undefined}>
      <head>
        {starlightRune && <>
          <style>{`@font-face{font-family:"Starlight Rune";font-weight:400;font-display:swap;src:url("${starlightRune}") format("truetype")}`}</style>
          <link rel="preload" href={starlightRune} as="font" type="font/ttf" crossOrigin="anonymous" />
        </>}
        <link rel="preload" href="/fonts/dm-sans-normal-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      {/* Extensions such as Grammarly can add body attributes before hydration. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
