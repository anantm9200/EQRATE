import {NextResponse} from 'next/server';
import {dgxGatewayConfigured} from '@/lib/dgx-gateway';
/** Configuration only. Live model health comes from the engine: /api/engine/status -> ai.reachable. */
export function GET(){return NextResponse.json({
  product:'CREQOR',status:'online',
  officialRegistryConfigured:Boolean(process.env.SEC_USER_AGENT),
  privateIntelligenceConfigured:dgxGatewayConfigured()&&Boolean(process.env.CREQOR_ANALYST_ACCESS_TOKEN)
},{headers:{'Cache-Control':'no-store'}});}
