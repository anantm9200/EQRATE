import type {Metadata} from 'next';
import {Poppins,Inter} from 'next/font/google';
import './globals.css';
import './creqor-v2.css';
import './creqor-pages.css';
import './creqor-hero.css';
import './creqor-controls.css';
import './creqor-editorial.css';
import './workbench.css';
import './research-upgrade.css';
import './creqor-command.css';
import './creqor-operations.css';
import './creqor-lei.css';
import './creqor-finish.css';
import SiteShell from '@/components/site-shell';
const poppins=Poppins({subsets:['latin'],weight:['400','500','600','700'],variable:'--font-poppins',display:'swap'});
const inter=Inter({subsets:['latin'],variable:'--font-inter',display:'swap'});
export const metadata:Metadata={
 title:{default:'CREQOR — Know what the number means',template:'%s | CREQOR'},
 description:'Independent company intelligence. Discover verified issuer identities, explore transparent valuation models, and challenge financial assumptions.',
 applicationName:'CREQOR',
 metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://creqor-anant-icl.vercel.app'),
 openGraph:{type:'website',siteName:'CREQOR',title:'CREQOR — Know what the number means',description:'Company intelligence grounded in evidence.'},
 robots:process.env.VERCEL_ENV==='production'||Boolean(process.env.NEXT_PUBLIC_SITE_URL)?{index:true,follow:true}:{index:false,follow:false}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className={poppins.variable+' '+inter.variable}><SiteShell>{children}</SiteShell></body></html>}
