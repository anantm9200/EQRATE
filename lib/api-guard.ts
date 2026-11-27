import {NextResponse} from 'next/server';
/**
 * CSRF defence for cookie-authenticated mutations: the request must be JSON and come
 * from this site's own origin (SameSite=Lax cookies already block most cross-site posts).
 */
export function sameOriginJson(req:Request):NextResponse|null{
 const origin=req.headers.get('origin');
 const host=req.headers.get('x-forwarded-host')||req.headers.get('host');
 if(!origin||!host)return NextResponse.json({error:'Origin required'},{status:403});
 let o:URL;try{o=new URL(origin);}catch{return NextResponse.json({error:'Bad origin'},{status:403});}
 if(o.host!==host)return NextResponse.json({error:'Cross-site request refused'},{status:403});
 if(req.method!=='DELETE'&&!(req.headers.get('content-type')||'').startsWith('application/json'))
  return NextResponse.json({error:'JSON required'},{status:415});
 return null;
}
/** Maps an engine error to a safe website response without leaking internals. */
export function engineError(e:unknown){
 const status=(e as {status?:number}).status;
 const body=(e as {body?:{error?:string;code?:string}}).body;
 if(status&&[400,401,403,404,409,429].includes(status))
  return NextResponse.json({error:body?.error||'Request refused',code:body?.code},{status});
 return NextResponse.json({error:'Workspace service unavailable; your data is unchanged.'},{status:503});
}
