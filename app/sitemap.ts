import type {MetadataRoute} from 'next';
export default function sitemap():MetadataRoute.Sitemap {
 const base=process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,'')||'https://creqor.vercel.app';
 return ['/','/india','/engine','/coverage','/workbench','/desk','/directory','/explore','/lab','/compare','/watchlist','/intelligence','/analyst','/research','/methodology','/verification','/status'].map(path=>({
  url:base+path,lastModified:new Date(),changeFrequency:path==='/'?'weekly':'monthly',priority:path==='/'?1:0.7
 }));
}