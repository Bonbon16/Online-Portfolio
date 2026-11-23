import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
const sans = GeistSans;
const mono = GeistMono;
const url = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const metadata: Metadata = { metadataBase: new URL(url), title: 'Vhon Eric Mercado — Developer', description: 'Portfolio of Vhon Eric Mercado, a computer science student and aspiring software developer.', openGraph: { title: 'Vhon Eric Mercado — Developer', description: 'Thoughtful interfaces. Useful software.', type: 'website', images: ['/opengraph-image'] }, twitter: { card: 'summary_large_image', images: ['/opengraph-image'] } };
/*
 * Runs before first paint:
 *  - `js`: enables the "hidden until animated in" states (without JS, everything is simply visible).
 *  - theme: dark unless the visitor chose light.
 *  - boot: the terminal boot overlay plays once per browser session (~1.1s), then `is-booted` dismisses it and starts
 *    the hero entrance. Repeat visits in the same session and reduced-motion users skip straight to `is-booted`.
 *    This timer is the single source of truth, so the overlay can never get stuck even if the app fails to load.
 */
const headScript = `(function(){var h=document.documentElement;h.classList.add('js');
try{var t=localStorage.getItem('theme');if(t!=='light')h.classList.add('dark')}catch(e){h.classList.add('dark')}
var skip=true;try{skip=matchMedia('(prefers-reduced-motion: reduce)').matches||sessionStorage.getItem('vm-booted')==='1';if(!skip)sessionStorage.setItem('vm-booted','1')}catch(e){}
if(skip){h.classList.add('is-booted','boot-skip')}else{setTimeout(function(){h.classList.add('is-booted')},1150)}})();`;
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html: headScript}} /></head><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>; }
