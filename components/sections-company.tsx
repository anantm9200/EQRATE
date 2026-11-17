import {DetailSplit,ProcessTimeline,QuestionSection,RouteTiles,StatusOverview} from './section-kit';

export function CompanyProfileSections({name,cik}:{name:string;cik:string}){return <>
 <ProcessTimeline eyebrow="UNDERSTANDING THIS RECORD" title="What to do with an issuer profile." steps={[
 {title:'Verify the identity',description:'Match this company name and CIK to the original SEC submissions page.'},
 {title:'Inspect the periods',description:'Read each reported financial value with its filing date and corresponding reporting period.'},
 {title:'Document assumptions',description:'Keep any hypothetical model assumptions distinct from official reported metrics.'},
 {title:'Challenge the conclusion',description:'Ask what evidence remains absent before describing the company’s market value.'}
 ]}/>
 <DetailSplit eyebrow="EVIDENCE BEFORE VALUE" title="The right questions come before a market cap." description={'This profile is an evidence starting point for '+name+'. An SEC identifier and financial highlights cannot, on their own, establish a current market capitalisation.'} visual="evidence" points={[
  {title:'What we know',description:'The official US issuer identifier and any eligible XBRL facts retrievable through the connected SEC source.'},
  {title:'What we still need',description:'A relevant current share price, matching share count and properly reconciled corporate actions.'},
  {title:'What we do not infer',description:'No invented ratings, price targets, buy recommendations or unsupported financial performance claims.'}
 ]}/>
 <StatusOverview eyebrow="SOURCE READINESS" title="What this issuer page represents." items={[
 {feature:'Official company identifier',status:'Available',detail:'SEC CIK '+cik+' identifies the issuer represented in this retrieved record.'},
 {feature:'Selected issuer-reported financial facts',status:'Configured separately',detail:'Availability depends on SEC XBRL facts, reporting concepts and individual filing periods.'},
 {feature:'Current market cap and company rating',status:'Planned',detail:'Market pricing, matched share counts, governance standards and source checks are not yet connected.'}
 ]}/>
 <QuestionSection title="Reading the company profile." questions={[
 {question:'Is the SEC CIK proof of an issuer’s current market value?',answer:'No. A CIK identifies the registrant. Market capitalisation depends on a sourced market price and the appropriate share count on a consistent date.'},
 {question:'Why do different financial highlights use different dates?',answer:'US SEC companyfacts provides concept-specific financial entries. Their eligible reporting periods and filed dates may not align perfectly. Compare dates before treating the figures as a single snapshot.'},
 {question:'Is an unavailable financial metric equivalent to zero?',answer:'No. Unavailable means the eligible source mapping did not yield a supported metric. CREQOR does not silently replace it with zero.'}
 ]}/>
 <RouteTiles items={[
 {href:'/compare',label:'Compare with another issuer',description:'Use official annual figures and exact identifiers'},
 {href:'/lab',label:'Model a valuation',description:'Review hypothetical discounted cash flow mechanics'},
 {href:'/verification',label:'Inspect source confidence',description:'Understand claim-level evidence states'}
 ]}/>
 </>;}
