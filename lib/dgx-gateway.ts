/**
 * Server-only connection to CREQOR's private DGX engine.
 * Endpoint is configured by the operator, never by the requesting browser.
 */
export function dgxGatewayConfigured():boolean{
 return Boolean(process.env.DGX_ENGINE_HTTPS_URL&&process.env.DGX_ENGINE_TOKEN);
}
function endpoint(path:string){
 const base=process.env.DGX_ENGINE_HTTPS_URL||'';
 if(!/^\/v1\/(status|search|research|financials\/\d{1,10})$/.test(path))
  throw new Error('DGX_UNSUPPORTED_ROUTE');
 const url=new URL(base);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
  url.pathname!=='/'||!url.hostname||url.port&&url.port!=='443')
  throw new Error('DGX_GATEWAY_REQUIRES_HTTPS');
 return new URL(path,url);
}
export async function callDgxEngine<T>(path:string,options:{
 method?:'GET'|'POST';body?:object;timeoutMs?:number
}={}):Promise<T>{
 if(!dgxGatewayConfigured())throw new Error('DGX_ENGINE_NOT_CONNECTED');
 const token=process.env.DGX_ENGINE_TOKEN!;
 if(token.length<32)throw new Error('DGX_ENGINE_TOKEN_TOO_SHORT');
 const clientId=process.env.DGX_ACCESS_CLIENT_ID||'';
 const clientSecret=process.env.DGX_ACCESS_CLIENT_SECRET||'';
 if(Boolean(clientId)!==Boolean(clientSecret))throw new Error('DGX_ACCESS_CREDENTIAL_PAIR_REQUIRED');
 const headers:Record<string,string>={'Authorization':'Bearer '+token,
  'Accept':'application/json','Content-Type':'application/json'};
 if(clientId){headers['CF-Access-Client-Id']=clientId;headers['CF-Access-Client-Secret']=clientSecret;}
 const response=await fetch(endpoint(path),{method:options.method||'GET',headers,
  body:options.body?JSON.stringify(options.body):undefined,
  signal:AbortSignal.timeout(Math.max(1000,Math.min(options.timeoutMs||9000,50000))),cache:'no-store'});
 if(!response.ok)throw new Error('DGX_ENGINE_UPSTREAM_'+response.status);
 const size=Number(response.headers.get('content-length')||0);
 if(size>1000000)throw new Error('DGX_ENGINE_RESPONSE_TOO_LARGE');
 const text=await response.text();
 if(text.length>1000000)throw new Error('DGX_ENGINE_RESPONSE_TOO_LARGE');
 return JSON.parse(text) as T;
}
export type DgxStatus={
 status:string;storage:string;
 counts:{leiEntities:number;secTickerAssociations:number;secFinancialFacts:number;researchRuns:number};
 aiConfigured:boolean;note:string;
};
