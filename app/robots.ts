import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{
 const base=process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,'')||'https://creqor.vercel.app';
 if(process.env.VERCEL_ENV!=='production'&&!process.env.NEXT_PUBLIC_SITE_URL)return {rules:{userAgent:'*',disallow:'/'}};
 return {rules:{userAgent:'*',allow:'/',disallow:['/api/','/account','/signin','/signup']},sitemap:base+'/sitemap.xml'};
}