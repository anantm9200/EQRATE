import type {MetadataRoute} from 'next';
export default function sitemap():MetadataRoute.Sitemap {
 const base=process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,'')||'http://localhost:3000';
 return ['/','/explore','/lab','/compare','/watchlist','/intelligence','/analyst','/research','/methodology','/verification'].map(path=>({
   url:base+path,lastModified:new Date(),changeFrequency:path==='/'?'weekly':'monthly',priority:path==='/'?1:0.7
 }));
}