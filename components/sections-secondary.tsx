import {DetailSplit,FeatureGallery,ProcessTimeline,ComparisonTable,QuestionSection,RouteTiles,StatementBand,StatusOverview} from './section-kit';

export function ResearchSections(){return <>
 <DetailSplit eyebrow="THE WORK BEHIND EVERY FINDING" title="Show the source. Show the reasoning." description="Good research lets someone trace a conclusion back to a filing, date, currency, method and reviewer. That is the standard CREQOR is designed around." visual="evidence" points={[
  {title:'Source provenance',description:'Record the origin, publication date, entity identifier and exact statement being relied upon.'},
  {title:'Financial reconciliation',description:'Check units, periods, consolidated scope and any amended or conflicting figures.'},
  {title:'Analytical independence',description:'Keep deterministic arithmetic separate from AI commentary or the issuer’s promotional claims.'}
 ]}/>
 <FeatureGallery eyebrow="RESEARCH FORMATS" title="Different questions need different reports." cols={4} items={[
 {eyebrow:'IDENTITY BRIEF',title:'Company profile',description:'Legal identity, sector, group context, filing scope and limitations.',tag:'FRAMEWORK'},
 {eyebrow:'VALUATION NOTE',title:'Model assessment',description:'Assumptions, comparable methods, sensitivity and equity bridge.',tag:'FRAMEWORK'},
 {eyebrow:'EVENT ANALYSIS',title:'Corporate actions',description:'Terms, dates, approvals, counterparty claims and event status.',tag:'FRAMEWORK'},
 {eyebrow:'QUALITY REVIEW',title:'Evidence review',description:'Missing information, source conflicts, recency and corroboration.',tag:'FRAMEWORK'}
 ]}/>
 <ComparisonTable eyebrow="QUALITY CONTROL" title="What a research note should preserve." headers={['ELEMENT','WHAT TO INCLUDE','WHAT TO AVOID']} rows={[
 {metric:'Source',a:'Official filing, document, issuer identifier and link.',b:'Unattributed percentages or unnamed “industry sources”.'},
 {metric:'Time',a:'Statement period, publication date and transaction stage.',b:'Current-sounding claims from older documents.'},
 {metric:'Calculation',a:'Method, formula, adjustments and assumptions.',b:'Rounded headline values without a reproducible bridge.'},
 {metric:'Uncertainty',a:'Contradictions, missing data and unresolved questions.',b:'Silently replacing missing inputs with assumptions.'},
 {metric:'Review',a:'Scope and status of analytical review.',b:'Implying human verification where none occurred.'}
 ]}/>
 <StatementBand eyebrow="RESEARCH INTEGRITY" statement="A missing answer is better than a manufactured one." description="CREQOR’s research library will expand as source integrations and review procedures become operational. There are no fabricated company reports presented as verified research." href="/verification" label="Examine evidence requirements"/>
 <QuestionSection title="A sharper research process." questions={[
 {question:'Does a citation automatically verify a claim?',answer:'No. A link may be authentic but irrelevant, outdated, preliminary or about a different entity. Verification requires that the document actually supports the specific claim.'},
 {question:'How should amended filings be handled?',answer:'Preserve both the earlier and amended versions with filing timestamps. Explain whether the new facts restate, correct or merely supplement the previous report.'},
 {question:'Can AI write research reports independently?',answer:'AI can help structure questions and interpret provided documents when a secure analyst service is configured, but publishing company-specific conclusions requires verified evidence, reproducible arithmetic and appropriate review.'}
 ]}/>
 <RouteTiles items={[
 {href:'/verification',label:'Inspect verification',description:'Understand documented claim states'},
 {href:'/methodology',label:'Review methods',description:'See valuation, confidence and disclosure rules'},
 {href:'/analyst',label:'Explore the analyst',description:'Private inference workflow, when configured'}
 ]}/>
 </>;}

export function MethodologySections(){return <>
 <ProcessTimeline eyebrow="FINANCIAL LOGIC" title="A method is a series of decisions." description="Even the right formula can produce a misleading number when the entity, date or share count is wrong." steps={[
 {title:'Define the claim',description:'Determine whether the question asks about market cap, enterprise value, equity value or a private estimate.'},
 {title:'Collect the inputs',description:'Document cash flows, share counts, dates, debt and other relevant claims.'},
 {title:'Run the model',description:'Apply the disclosed formula and independently check sensitivities.'},
 {title:'Attach the caveats',description:'Explain unsupported assumptions, source conflicts and coverage limitations.'}
 ]}/>
 <ComparisonTable eyebrow="VALUE TERMINOLOGY" title="Four terms. Four different jobs." headers={['MEASURE','BASIC LOGIC','INTERPRETATION']} rows={[
 {metric:'Listed market cap',a:'Matched current share price × applicable shares outstanding.',b:'Observed trading-based equity measure, if both sourced inputs are available.'},
 {metric:'Enterprise value',a:'Equity value + net debt and other attributable financial claims.',b:'Capital-structure-inclusive measure of enterprise value.'},
 {metric:'Modelled equity value',a:'Modelled enterprise value less relevant non-equity claims.',b:'An estimate that depends on chosen assumptions and model context.'},
 {metric:'Per-share implied value',a:'Modelled equity value ÷ matched fully diluted shares.',b:'Not necessarily the traded share price.'}
 ]}/>
 <DetailSplit eyebrow="CONFIDENCE IS A SEPARATE QUESTION" title="Accuracy and confidence aren't interchangeable." description="A calculation can be arithmetically correct while its financial inputs remain weak. CREQOR's proposed confidence approach considers the evidence separately from the valuation." visual="evidence" points={[
  {title:'Reliability',description:'Evaluate the source type, issuer match, audit context and source independence.'},
  {title:'Relevance',description:'Check whether facts match the same entity, currency, financial period and capital structure.'},
  {title:'Recency and contradictions',description:'Surface superseded values, filing amendments and competing records rather than hiding them.'}
 ]}/>
 <StatusOverview eyebrow="METHODOLOGY STATUS" title="Published standards versus working engines." items={[
 {feature:'DCF arithmetic and sensitivity',status:'Available',detail:'Deterministic calculator in the valuation lab with independently testable formulas.'},
 {feature:'Intelligence score weighting framework',status:'Planned',detail:'The displayed proposed scoring dimensions are not production ratings for actual companies.'},
 {feature:'Verified confidence scoring and jurisdictional ratings',status:'Planned',detail:'Evidence thresholds, calibration, governance controls and any applicable permissions remain necessary.'}
 ]}/>
 <QuestionSection title="Before trusting any valuation." questions={[
 {question:'Is CREQOR a registered rating agency?',answer:'The current product does not claim registration as a credit rating agency, investment adviser or licensed market-data provider. Any expansion into regulated ratings or advisory activity must satisfy the applicable requirements first.'},
 {question:'Can an unlisted company have a market cap?',answer:'A private company may have an estimated equity value based on a transaction or a valuation model, but it does not have an observable stock-exchange market capitalisation in the same sense as a publicly traded security.'},
 {question:'What happens when source documents conflict?',answer:'Conflicts should remain visible, the scope and dates should be reconciled, and confidence should be adjusted downward when a contradiction cannot be resolved.'},
 {question:'Are sample valuation outputs investment advice?',answer:'No. The sample inputs are hypothetical. Even a properly sourced valuation is a model estimate that requires context and does not guarantee a future price or return.'}
 ]}/>
 <RouteTiles items={[
 {href:'/lab',label:'Try the DCF laboratory',description:'Inspect calculation and sensitivity directly'},
 {href:'/verification',label:'See source requirements',description:'Evidence states, conflicts and review'},
 {href:'/research',label:'Read the research process',description:'How evidence becomes a defensible note'}
 ]}/>
 </>;}

export function VerificationSections(){return <>
 <ProcessTimeline eyebrow="EVIDENCE PIPELINE" title="Verification is a sequence, not a badge." description="Every claim needs its own traceable review status and source context." steps={[
 {title:'Receive the claim',description:'Record the exact statement, amount, entity and claimed date.'},
 {title:'Find primary support',description:'Locate the filing, registry, agreement or other authoritative record.'},
 {title:'Reconcile',description:'Check contradictions, amendments, units and attribution.'},
 {title:'Label the outcome',description:'Assign a supported evidence state and preserve open questions.'}
 ]}/>
 <DetailSplit eyebrow="CHAIN OF CUSTODY" title="An evidence trail has to hold up." description="Company submitted documents, official regulator filings and third-party interpretations are not equivalent sources. A financial claim must carry provenance, date and scope." visual="evidence" points={[
  {title:'Source identity',description:'Identify the regulator, issuer, independent audit or document custodian.'},
  {title:'Document integrity',description:'Track versions, amendments and access without silently replacing earlier evidence.'},
  {title:'Decision trace',description:'Explain which exact record supports each figure and why a review status was assigned.'}
 ]}/>
 <FeatureGallery eyebrow="EVIDENCE TYPES" title="Not every document proves the same thing." cols={4} items={[
 {eyebrow:'PRIMARY',title:'Official filings',description:'Dated regulatory reports and registry records that can be linked to a legal entity.'},
 {eyebrow:'FINANCIAL',title:'Audited statements',description:'Scope, audit report, reporting currency, entity and period must match.'},
 {eyebrow:'TRANSACTION',title:'Executed agreements',description:'Terms, approvals and completion conditions matter as much as the headline amount.'},
 {eyebrow:'CONTEXT',title:'Company statements',description:'Potentially useful context—not independent proof without corroboration.'}
 ]}/>
 <ComparisonTable eyebrow="HOW CLAIMS DIFFER" title="One company. Different verification questions." headers={['CLAIM','NEEDED EVIDENCE','POTENTIAL LIMITATION']} rows={[
 {metric:'Public share price',a:'Dated exchange record, symbol, class and currency.',b:'Quote may be delayed or unlicensed for redistribution.'},
 {metric:'Shares outstanding',a:'Matching filing, class details and corporate actions.',b:'Different as-of dates can materially change market cap.'},
 {metric:'Private equity value',a:'Documented method, financial statements, cap table and assumptions.',b:'Model uncertainty, liquidity and control differences.'},
 {metric:'Sector leadership',a:'Independent market-share methodology and defined market scope.',b:'Unverified rankings can be promotional rather than factual.'}
 ]}/>
 <QuestionSection title="What does verified really mean?" questions={[
 {question:'Is a company-submitted certificate enough?',answer:'Not necessarily. The document must be authentic, applicable to the correct entity and date, and relevant to the specific claim. A company-supplied statement is not automatically independently corroborated.'},
 {question:'Can an AI system declare a financial figure verified?',answer:'AI may assist in extracting or reconciling information, but a verified label should depend on independent evidence checks and defined controls. The existing AI gateway is not a substitute for those controls.'},
 {question:'Can companies upload confidential financial documents today?',answer:'No. Secure uploads, malware scanning, storage encryption, identity and access controls and human-review workflows have not been enabled in this release.'}
 ]}/>
 <RouteTiles items={[
 {href:'/research',label:'Research process',description:'Follow the documented review approach'},
 {href:'/methodology',label:'Valuation standards',description:'Distinguish estimates from market observations'},
 {href:'/explore',label:'Check official identities',description:'Start with a recognised issuer record'}
 ]}/>
 </>;}

export function AnalystSections(){return <>
 <DetailSplit eyebrow="THE PRIVATE INTELLIGENCE LAYER" title="The model should interrogate, not invent." description="CREQOR is designed to send research questions through a protected server-side DGX gateway. The model can help analyse evidence, but calculations and official facts remain separate systems." visual="intelligence" points={[
  {title:'Private inference boundary',description:'The browser must never receive direct DGX credentials or unprotected server endpoints.'},
  {title:'Evidence-aware answers',description:'Submitted statements should be identified as provided evidence, not independently verified public facts.'},
  {title:'Deterministic financial calculations',description:'Cash-flow and sensitivity mathematics stay in tested code, independent of model prose.'}
 ]}/>
 <FeatureGallery eyebrow="RESEARCH PROMPTS" title="Ask questions that expose weaknesses." cols={4} items={[
 {eyebrow:'VALUATION',title:'Challenge a DCF',description:'Which assumptions dominate the implied equity value and how sensitive is it?'},
 {eyebrow:'QUALITY',title:'Look for contradictions',description:'Do the cited figures, filing dates and reporting currencies actually align?'},
 {eyebrow:'STRUCTURE',title:'Understand capital',description:'Which securities, liabilities and ownership interests affect equity value?'},
 {eyebrow:'COMPARISON',title:'Test peer choice',description:'Are the proposed comparables similar in sector, size, reporting and geography?'}
 ]}/>
 <ProcessTimeline eyebrow="HOW A RESEARCH REQUEST SHOULD WORK" title="From question to reviewable answer." steps={[
 {title:'Write the question',description:'Define an exact financial or documentary claim to investigate.'},
 {title:'Provide evidence',description:'Attach source excerpts, filing references or stated model assumptions.'},
 {title:'Run private inference',description:'Authenticated backend routes the request when the DGX connection is configured.'},
 {title:'Review the result',description:'Validate citations, calculations and unresolved caveats before relying on the response.'}
 ]}/>
 <StatusOverview eyebrow="HONEST SYSTEM STATUS" title="What the analyst can actually do." items={[
 {feature:'Research question and evidence interface',status:'Available',detail:'Users can compose questions, paste evidence and supply an access key.'},
 {feature:'Protected DGX inference',status:'Configured separately',detail:'Requires enabled secure endpoint, model route, API credentials and authorised access.'},
 {feature:'Automated source retrieval and autonomous multi-agent review',status:'Planned',detail:'A retrieval system, source quality checks, audit logs and operational constraints are still required.'}
 ]}/>
 <QuestionSection title="Using the analyst responsibly." questions={[
 {question:'Is the DGX analyst live on CREQOR?',answer:'Not until the secure server gateway and credentials are configured. The interface may be visible while inference remains intentionally disabled.'},
 {question:'Should I paste confidential documents into the analyst?',answer:'Do not provide confidential or personal material unless you have verified the deployment, access controls, retention policy and legal authority for its use. A secure evidence workflow remains to be completed.'},
 {question:'Can AI independently prove a company valuation?',answer:'No. A model can help challenge assumptions or summarise provided material but cannot replace signed records, verified market data, repeatable financial mathematics or qualified review.'}
 ]}/>
 <RouteTiles items={[
 {href:'/lab',label:'Work with the numbers',description:'Use the deterministic DCF model'},
 {href:'/verification',label:'Check the evidence',description:'Learn how claims earn a status'},
 {href:'/methodology',label:'Understand the limits',description:'Review valuation and AI disclosures'}
 ]}/>
 </>;}

export function WatchlistSections(){return <>
 <FeatureGallery eyebrow="YOUR PERSONAL RESEARCH DESK" title="Organise a better second look." cols={3} items={[
 {eyebrow:'01 / SAVE',title:'Start with an issuer',description:'Open an official SEC company profile and add it to your list when the registry connection is available.'},
 {eyebrow:'02 / RETURN',title:'Build your own shortlist',description:'Keep researched issuers easy to revisit in the same browser.'},
 {eyebrow:'03 / COMPARE',title:'Take the next step',description:'Use exact identifiers to run a source-based annual financial comparison.'}
 ]}/>
 <DetailSplit eyebrow="A LIGHTWEIGHT WORKSPACE" title="Keep the list simple and transparent." description="The current watchlist stores company identifiers locally on your device. It is not an investment portfolio, a live market watch or an alerting service." visual="coverage" points={[
 {title:'Browser-only storage',description:'Saved issuers remain in this browser and do not sync to an account or another device.'},
 {title:'No invented activity',description:'Prices, performance rankings, alerts and portfolio returns are not generated from the local list.'},
 {title:'Easy next actions',description:'Reopen the issuer record, inspect source details and move into comparison or valuation modelling.'}
 ]}/>
 <ComparisonTable eyebrow="WORKSPACE BOUNDARIES" title="Saved research is not live monitoring." headers={['CAPABILITY','AVAILABLE NOW','NOT INCLUDED YET']} rows={[
 {metric:'Save companies',a:'Local issuer CIK, ticker and name in browser storage.',b:'Team collaboration, account sync or shared lists.'},
 {metric:'Research records',a:'Direct links back to company pages.',b:'Persistent annotated evidence vault.'},
 {metric:'Financial alerts',a:'No scheduled price or event alerting.',b:'Licensed live quotes, notifications and event monitoring.'}
 ]}/>
 <QuestionSection title="Common workspace questions." questions={[
 {question:'Will my saved companies appear on another device?',answer:'No. The current watchlist uses local browser storage, so it does not automatically sync across devices or browsers.'},
 {question:'Does the watchlist track my investments?',answer:'No. It is a research shortlist, not a brokerage portfolio. It does not record position quantities, cost basis, current market prices or profit and loss.'},
 {question:'Why might my list be empty?',answer:'You need to save an issuer from a company record first. Clearing browser data or using private browsing can also remove a locally stored watchlist.'}
 ]}/>
 <RouteTiles items={[
 {href:'/explore',label:'Find issuers',description:'Search SEC company records'},
 {href:'/compare',label:'Compare saved companies',description:'Enter exact tickers or CIKs'},
 {href:'/lab',label:'Test value assumptions',description:'Explore the illustrative DCF calculator'}
 ]}/>
 </>;}
