import {WatchlistSections} from '@/components/sections-secondary';
import WatchlistClient from '@/components/watchlist-client';
export const metadata={title:'My watchlist',description:'A local-only company watchlist for research, without cloud sync or misleading alerts.'};
export default function Watchlist(){return <><section className="page-hero"><span className="eyebrow">SAVE / RETURN / RESEARCH</span><h1>Keep the right<br/><em>companies in view.</em></h1><p>Collect the SEC issuers you want to research again. A minimal watchlist that stays in this browser.</p></section><section className="body-wrap"><WatchlistClient/></section>
 <WatchlistSections/>
 </>}