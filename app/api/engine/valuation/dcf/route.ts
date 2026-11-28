import type {NextRequest} from 'next/server';
import {proxyIntelligence} from '@/lib/engine-proxy';
export const runtime='nodejs';
/** Batch DCF calculation over user-entered assumptions, computed only by the private DGX engine. */
export async function POST(req:NextRequest){return proxyIntelligence(req,'/v1/valuation/dcf','val-dcf');}
