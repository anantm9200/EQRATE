import type {NextRequest} from 'next/server';
import {proxyIntelligence} from '@/lib/engine-proxy';
export const runtime='nodejs';
/** Assessment result, readiness review, DCF sensitivity and scenarios, computed only by the private DGX engine. Inputs are user-supplied; no sign-in required. */
export async function POST(req:NextRequest){return proxyIntelligence(req,'/v1/intelligence/assessment','intel-assessment');}
