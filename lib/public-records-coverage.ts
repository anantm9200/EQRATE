/**
 * Official GLEIF Golden Copy release metadata, not a count of CREQOR-ingested rows.
 * The GLEIF official endpoint documents the current global LEI reference pool.
 */
export const GOLDEN_COPY_METADATA_URL='https://goldencopy.gleif.org/api/v2/golden-copies/publishes/lei2/latest';
export type GoldenCopyMetadata={
 publishDate:string;recordCount:number;csvUrl:string;csvArchiveBytes:number;
 source:'GLEIF';kind:'official-public-coverage';
};
type GoldenResponse={data?:{
 publish_date?:unknown;full_file?:{csv?:{url?:unknown;record_count?:unknown;size?:unknown;format?:unknown}};
}};
export function parseGoldenCopyMetadata(input:unknown):GoldenCopyMetadata{
 const obj=input as GoldenResponse;
 const data=obj?.data;
 const csv=data?.full_file?.csv;
 const count=Number(csv?.record_count);
 const bytes=Number(csv?.size);
 const date=String(data?.publish_date||'');
 const url=String(csv?.url||'').replaceAll('\\/','/');
 if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T]/.test(date)||!Number.isSafeInteger(count)||
    count<100000||count>100000000||!Number.isSafeInteger(bytes)||bytes<=0||bytes>1500000000)
   throw new Error('GLEIF_METADATA_INVALID');
 let parsed:URL;
 try{parsed=new URL(url);}catch{throw new Error('GLEIF_METADATA_INVALID_URL');}
 if(parsed.protocol!=='https:'||!['goldencopy.gleif.org','leidata-preview.gleif.org'].includes(parsed.hostname)||
    !/^\/storage\/golden-copy-files\/\d{4}\/\d{2}\/\d{2}\/\d+\/[a-zA-Z0-9-]+\.csv\.zip$/.test(parsed.pathname)||
    parsed.username||parsed.password||parsed.port||parsed.search)
   throw new Error('GLEIF_METADATA_UNTRUSTED_URL');
 return {publishDate:date,recordCount:count,csvUrl:parsed.toString(),
  csvArchiveBytes:bytes,source:'GLEIF',kind:'official-public-coverage'};
}
export async function fetchGoldenCopyMetadata():Promise<GoldenCopyMetadata>{
 const r=await fetch(GOLDEN_COPY_METADATA_URL,{
  headers:{Accept:'application/json','User-Agent':'CREQOR official LEI research https://creqor.vercel.app'},
  signal:AbortSignal.timeout(10000),
  next:{revalidate:7200}
 });
 if(!r.ok)throw new Error('GLEIF_GOLDEN_COPY_UNAVAILABLE');
 return parseGoldenCopyMetadata(await r.json());
}
