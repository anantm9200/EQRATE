import {auth} from '@/auth';
/** Resolves the signed-in user and the organisation they act in (requested, else personal). */
export async function currentIdentity(requestedOrg?:string|null){
 const s=await auth();
 if(!s?.user?.id)return null;
 const orgs=s.user.orgs||[];
 const org=(requestedOrg&&orgs.find(o=>o.orgId===requestedOrg))||orgs.find(o=>o.personal)||orgs[0];
 return {userId:s.user.id,email:s.user.email||'',name:s.user.name||'',orgs,org:org||null};
}
