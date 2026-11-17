import type { Metadata } from 'next';
import { Poppins, Inter } from 'next/font/google';
import './globals.css';
import SiteShell from '@/components/site-shell';
const poppins=Poppins({subsets:['latin'],weight:['400','500','600','700'],variable:'--font-poppins',display:'swap'});
const inter=Inter({subsets:['latin'],variable:'--font-inter',display:'swap'});
export const metadata: Metadata = {
 title:{default:'CREQOR — Intelligence you can verify',template:'%s | CREQOR'},
 description:'Discover companies, examine evidence, explore valuation scenarios and question financial claims. Independent intelligence built on traceable sources.',
 applicationName:'CREQOR',
 openGraph:{type:'website',siteName:'CREQOR',title:'CREQOR — Intelligence you can verify',description:'Company intelligence. Evidence-led valuation. Verifiable research.'},
 robots:process.env.NEXT_PUBLIC_SITE_URL?{index:true,follow:true}:{index:false,follow:false}
};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body className={poppins.variable+' '+inter.variable}><SiteShell>{children}</SiteShell></body></html>;
}