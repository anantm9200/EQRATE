/**
 * Auth.js (NextAuth v5) configuration. Passwords are verified by the private DGX
 * engine; the website keeps only an encrypted session cookie with the user id and
 * organisation memberships. AUTH_SECRET must be set in the deployment environment.
 */
import NextAuth,{type DefaultSession} from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import {callDgxEngine,dgxGatewayConfigured} from '@/lib/dgx-gateway';

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
  credentials:{email:{type:'email'},password:{type:'password'}},
  async authorize(raw){
   if(!dgxGatewayConfigured())return null;
   const email=typeof raw?.email==='string'?raw.email.trim().toLowerCase().slice(0,254):'';
   const password=typeof raw?.password==='string'?raw.password.slice(0,200):'';
   if(!email||!password)return null;
   try{
    const v=await callDgxEngine<{userId:string;email:string;name:string|null;orgs:OrgMembership[]}>('/v1/auth/verify',
     {method:'POST',body:{email,password},timeoutMs:10000});
    return {id:v.userId,email:v.email,name:v.name,orgs:v.orgs};
   }catch{return null;}
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
