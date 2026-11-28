import {secGone} from '@/lib/sec-disabled';
export const runtime='nodejs';
export function GET(){return secGone();}
