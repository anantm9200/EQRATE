/**
 * Auth.js (NextAuth v5) configuration. Passwords are verified by the private DGX
 * engine; the website keeps only an encrypted session cookie with the user id and
 * organisation memberships. AUTH_SECRET must be set in the deployment environment.
 */
import NextAuth,{type DefaultSession} from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import {CredentialsSignin} from 'next-auth';
class MfaRequired extends CredentialsSignin{code='mfa_required'}
import {callDgxEngine,dgxGatewayConfigured,rateLimited,clientKey} from '@/lib/dgx-gateway';

export type OrgMembership={orgId:string;name:string;role:'owner'|'admin'|'analyst'|'viewer';personal:boolean;plan:string};
declare module 'next-auth'{
 interface Session{user:{id:string;orgs:OrgMembership[]}&DefaultSession['user']}
 interface User{orgs?:OrgMembership[]}
}

export const {handlers,auth,signIn,signOut}=NextAuth({
 trustHost:true,
 session:{strategy:'jwt',maxAge:60*60*12,updateAge:60*30},
 pages:{signIn:'/signin'},
 providers:[Credentials({
  credentials:{email:{type:'email'},password:{type:'password'},totp:{type:'text'}},
  async authorize(raw,request){
   if(!dgxGatewayConfigured())return null;
   // Per-client limit in addition to the engine's global sign-in limit.
   if(rateLimited(clientKey(request.headers,'signin'),10,300000))return null;
   const email=typeof raw?.email==='string'?raw.email.trim().toLowerCase().slice(0,254):'';
   const password=typeof raw?.password==='string'?raw.password.slice(0,200):'';
   if(!email||!password)return null;
   const totp=typeof raw?.totp==='string'?raw.totp.replace(/\s/g,'').slice(0,20):'';
   let v:{userId:string;email:string;name:string|null;orgs:OrgMembership[]};
   try{
    v=await callDgxEngine('/v1/auth/verify',{method:'POST',body:{email,password,...(totp?{totp}:{})},timeoutMs:10000});
   }catch(e){
    if((e as {body?:{code?:string}}).body?.code==='MFA_REQUIRED')throw new MfaRequired();
    return null;
   }
   return {id:v.userId,email:v.email,name:v.name,orgs:v.orgs};
  }
 })],
 callbacks:{
  jwt({token,user}){
   if(user){token.uid=user.id;token.orgs=user.orgs||[];}
   return token;
  },
  session({session,token}){
   session.user.id=String(token.uid||'');
   session.user.orgs=(token.orgs as OrgMembership[])||[];
   return session;
  }
 }
});
