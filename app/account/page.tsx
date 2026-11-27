import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {currentIdentity} from '@/lib/session';
import AccountPanel from '@/components/account-panel';
export const metadata:Metadata={title:'Your account — CREQOR',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function Account(){
 const me=await currentIdentity();
 if(!me)redirect('/signin?next=/account');
 return <section className="ac-shell ac-wide"><div className="ac-head">
  <span className="in-kicker">CREQOR ACCOUNT</span><h1>{me.name||me.email}</h1>
  <p>{me.email} · Workspace: {me.org?.name||'none'} ({me.org?.role||'no role'})</p></div>
  <AccountPanel/></section>;
}
