import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {SignUpForm} from '@/components/auth-forms';
import {auth} from '@/auth';
import {safeNext} from '@/lib/safe-next';
export const metadata:Metadata={title:'Create an account — CREQOR',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function SignUp({searchParams}:{searchParams:Promise<{next?:string}>}){
 const next=safeNext((await searchParams).next);
 if((await auth())?.user?.id)redirect(next);
 return <section className="ac-shell"><div className="ac-card">
  <span className="in-kicker">CREQOR ACCOUNT</span><h1>Create your research workspace</h1>
  <p>Free while CREQOR is in research preview. No payment details are requested.</p>
  <SignUpForm next={next}/></div></section>;
}
