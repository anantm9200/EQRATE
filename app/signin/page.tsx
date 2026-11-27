import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {SignInForm} from '@/components/auth-forms';
import {auth} from '@/auth';
import {safeNext} from '@/lib/safe-next';
export const metadata:Metadata={title:'Sign in — CREQOR',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function SignIn({searchParams}:{searchParams:Promise<{next?:string}>}){
 const next=safeNext((await searchParams).next);
 if((await auth())?.user?.id)redirect(next);
 return <section className="ac-shell"><div className="ac-card">
  <span className="in-kicker">CREQOR ACCOUNT</span><h1>Sign in</h1>
  <p>Your saved research, valuations and watchlists are kept in your private workspace on CREQOR’s own infrastructure.</p>
  <SignInForm next={next}/></div></section>;
}
