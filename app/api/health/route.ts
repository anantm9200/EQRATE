import {NextResponse} from 'next/server';
export function GET(){return NextResponse.json({
  product:'CREQOR',status:'online',
  officialRegistryConfigured:Boolean(process.env.SEC_USER_AGENT),
  privateIntelligenceConfigured:process.env.CREQOR_AI_ENABLED==='true'&&Boolean(process.env.DGX_OPENAI_BASE_URL&&process.env.DGX_MODEL&&process.env.CREQOR_ANALYST_ACCESS_TOKEN)
},{headers:{'Cache-Control':'no-store'}});}