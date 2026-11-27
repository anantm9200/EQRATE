'use client';
import {useState} from 'react';
import Link from 'next/link';
import {signIn} from 'next-auth/react';

export function SignInForm({next}:{next:string}){
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [needCode,setNeedCode]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError('');
  const f=new FormData(e.currentTarget);
  const r=await signIn('credentials',{email:f.get('email'),password:f.get('password'),totp:f.get('totp')||'',redirect:false});
  setBusy(false);
  if(r?.code==='mfa_required'&&!needCode){setNeedCode(true);setError('');return;}
  if(!r||r.error){setError(needCode?'Code not accepted. Use the current code from your app or a recovery code.':'Email or password not recognised, or sign-in is temporarily unavailable.');return;}
  window.location.assign(next);
 }
 return <form className="ac-form" onSubmit={submit} aria-describedby={error?'ac-error':undefined}>
  <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
  <label>Password<input name="password" type="password" autoComplete="current-password" required minLength={1} maxLength={200}/></label>
  {needCode&&<label>Authenticator code (or recovery code)<input name="totp" autoComplete="one-time-code" inputMode="numeric" required maxLength={20} autoFocus/></label>}
  {error&&<p id="ac-error" role="alert" className="ac-error">{error}</p>}
  <button type="submit" disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
  <p className="ac-alt">New to CREQOR? <Link href={'/signup?next='+encodeURIComponent(next)}>Create an account</Link></p>
 </form>;
}

export function SignUpForm({next}:{next:string}){
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError('');
  const f=new FormData(e.currentTarget);
  const body={name:f.get('name'),email:f.get('email'),password:f.get('password')};
  const r=await fetch('/api/account/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok){setBusy(false);setError((await r.json().catch(()=>null))?.error||'Account could not be created.');return;}
  const s=await signIn('credentials',{email:body.email,password:body.password,redirect:false});
  setBusy(false);
  if(!s||s.error){window.location.assign('/signin');return;}
  window.location.assign(next);
 }
 return <form className="ac-form" onSubmit={submit} aria-describedby={error?'ac-error':undefined}>
  <label>Name<input name="name" autoComplete="name" maxLength={120}/></label>
  <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
  <label>Password<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={200} aria-describedby="ac-pw-help"/></label>
  <small id="ac-pw-help">At least 12 characters. A memorable phrase works well.</small>
  {error&&<p id="ac-error" role="alert" className="ac-error">{error}</p>}
  <button type="submit" disabled={busy}>{busy?'Creating account…':'Create account'}</button>
  <p className="ac-alt">Already registered? <Link href={'/signin?next='+encodeURIComponent(next)}>Sign in</Link></p>
 </form>;
}
