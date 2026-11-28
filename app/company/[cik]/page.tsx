import {permanentRedirect} from 'next/navigation';
/** SEC company records are disabled by owner policy; company research lives in the global directory. */
export default function CompanyPage(){permanentRedirect('/directory');}
