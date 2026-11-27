'use client';
import {useEffect,useState} from 'react';
async function post(body:object){const r=await fetch('/api/account/mfa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed.');return d;}
/** TOTP two-factor setup: secret for any authenticator app, confirmation code, one-time recovery codes. */
export default function MfaPanel(){
 const [st,setSt]=useState<{enabled:boolean;recoveryCodesLeft:number}|null>(null);
 const [setup,setSetup]=useState<{secret:string;otpauthUri:string}|null>(null);
 const [codes,setCodes]=useState<string[]|null>(null);const [code,setCode]=useState('');const [pw,setPw]=useState('');const [err,setErr]=useState('');
 const load=()=>fetch('/api/account/mfa',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(setSt).catch(()=>setSt(null));
 useEffect(()=>{void load();},[]);
 const run=(f:()=>Promise<void>)=>{setErr('');f().catch(e=>setErr(e.message));};
 if(!st)return <p className="cq-engine-note">Two-factor status unavailable.</p>;
 if(codes)return <div className="ac-form"><p><strong>Two-factor sign-in is on.</strong> Save these recovery codes somewhere safe. Each works once if you lose your phone; they will not be shown again.</p>
  <pre className="mfa-codes">{codes.join('\n')}</pre><button type="button" onClick={()=>{setCodes(null);void load();}}>I have saved them</button></div>;
 if(st.enabled)return <form className="ac-form" onSubmit={e=>{e.preventDefault();run(async()=>{await post({action:'disable',password:pw});setPw('');await load();});}}>
  <p>Two-factor sign-in is <strong>on</strong> ({st.recoveryCodesLeft} recovery codes left).</p>
  <label>Password to turn it off<input type="password" value={pw} onChange={e=>setPw(e.target.value)} autoComplete="current-password" required/></label>
  {err&&<p role="alert" className="ac-error">{err}</p>}<button type="submit" className="ac-danger">Turn off two-factor</button></form>;
 if(!setup)return <div className="ac-form"><p>Add a code from an authenticator app (Google Authenticator, 1Password, Authy…) to every sign-in.</p>
  {err&&<p role="alert" className="ac-error">{err}</p>}<button type="button" onClick={()=>run(async()=>setSetup(await post({action:'setup'})))}>Set up two-factor sign-in</button></div>;
 return <form className="ac-form" onSubmit={e=>{e.preventDefault();run(async()=>{const d=await post({action:'enable',code});setCodes(d.recoveryCodes);setSetup(null);setCode('');});}}>
  <p>In your authenticator app, add an account with this key (or open the link on your phone):</p>
  <code className="mfa-secret">{setup.secret.replace(/(.{4})/g,'$1 ').trim()}</code>
  <a href={setup.otpauthUri}>Open in authenticator app</a>
  <label>6-digit code from the app<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} autoComplete="one-time-code" required/></label>
  {err&&<p role="alert" className="ac-error">{err}</p>}<button type="submit">Confirm and turn on</button></form>;
}
