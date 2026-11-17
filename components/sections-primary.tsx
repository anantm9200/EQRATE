import Link from 'next/link';
import {DetailSplit,FeatureGallery,ProcessTimeline,ComparisonTable,QuestionSection,RouteTiles,StatementBand,StatusOverview} from './section-kit';

export function HomeSections(){return <>
 <FeatureGallery eyebrow="EXPLORE THE PLATFORM" title="Every angle. One connected picture." description="Company discovery, analysis and evidence review are related questions—not isolated dashboards." cols={4} items={[
 {eyebrow:'01 / DISCOVERY',title:'Company intelligence',description:'Resolve the official issuer and research its corporate identity.',href:'/explore',tag:'SEC CONNECTION REQUIRED'},
 {eyebrow:'02 / VALUATION',title:'Valuation laboratory',description:'Build deterministic DCF cases and inspect sensitivity to assumptions.',href:'/lab',tag:'INTERACTIVE'},
 {eyebrow:'03 / COMPARISON',title:'Peer comparison',description:'Compare annual issuer-reported facts side by side with their filing dates.',href:'/compare',tag:'SEC CONNECTION REQUIRED'},
 {eyebrow:'04 / VERIFICATION',title:'Evidence standards',description:'Understand what qualifies as a primary source and why missing proof matters.',href:'/verification',tag:'RESEARCH FRAMEWORK'},
 {eyebrow:'05 / INTELLIGENCE',title:'Market context',description:'Explore the questions behind company actions, capital structure and risk.',href:'/intelligence',tag:'RESEARCH FRAMEWORK'},
 {eyebrow:'06 / RESEARCH',title:'Research centre',description:'Follow how inputs, documents and assumptions become defensible findings.',href:'/research',tag:'METHODOLOGY'},
 {eyebrow:'07 / ANALYST',title:'Private AI analyst',description:'Challenge questions with evidence through an authenticated DGX gateway.',href:'/analyst',tag:'REQUIRES CONFIGURATION'},
 {eyebrow:'08 / WORKSPACE',title:'Personal watchlist',description:'Keep your company research starting points in this browser.',href:'/watchlist',tag:'LOCAL-ONLY'}
 ]}/>
 <DetailSplit eyebrow="A DIFFERENT APPROACH" title="A valuation should explain itself." description="A number without its inputs is an assertion. CREQOR separates source documents, financial calculations and analytical interpretation." visual="valuation" points={[
  {title:'Start from a defensible identity',description:'Resolve identifiers before matching securities, legal entities or financial statements.'},
  {title:'Show the mechanics',description:'Translate cash flow, capital structure and growth assumptions into a repeatable model.'},
  {title:'Preserve the uncertainty',description:'Different source dates, unsupported prices and incomplete disclosures stay visible.'}
 ]} href="/methodology" linkLabel="Understand the model standards"/>
 <ProcessTimeline eyebrow="THE WORKFLOW" title="From question to defensible answer." description="A practical research sequence for evaluating a business without presenting assumptions as facts." steps={[
 {title:'Identify',description:'Start with the legal issuer, identifiers and jurisdiction.',foot:'COMPANY EXPLORER'},
 {title:'Investigate',description:'Locate dated statements, disclosures and supporting evidence.',foot:'RESEARCH + VERIFICATION'},
 {title:'Value',description:'Model cash flows and reconcile enterprise and equity value.',foot:'VALUATION LAB'},
 {title:'Challenge',description:'Stress-test scenarios, document caveats and compare peers.',foot:'ANALYST + COMPARISON'}
 ]}/>
 <ComparisonTable eyebrow="THE IMPORTANT DISTINCTION" title="Listed and unlisted are not the same." description="The valuation label depends on whether an observable market price exists." headers={['QUESTION','LISTED COMPANY','UNLISTED COMPANY']} rows={[
 {metric:'Headline measurement',a:'Equity market capitalisation when a current traded price and matched share count are available.',b:'Estimated equity valuation, subject to method and evidence quality.'},
 {metric:'Market price',a:'Observable only when an appropriately sourced, dated exchange price is available.',b:'Not observable on a public exchange.'},
 {metric:'Methods',a:'Market cap, trading multiples and fundamental valuation as separately sourced measures.',b:'DCF, relevant comparable transactions, peers and asset approaches.'},
 {metric:'Confidence',a:'Affected by share-class data, corporate actions, liquidity and recency.',b:'Affected by reporting quality, illiquidity, discounts and model sensitivity.'}
 ]}/>
 <StatusOverview eyebrow="WHAT IS ACTUALLY AVAILABLE" title="Capability, not theatre." description="The current product distinguishes working tools from integrations still being connected." items={[
 {feature:'Discounted cash-flow scenario modelling',status:'Available',detail:'Interactive assumptions, bear/base/bull scenarios and sensitivity table with hypothetical starting figures.'},
 {feature:'Local company watchlist',status:'Available',detail:'Browser-only storage. No user account, alerts, or cross-device sync.'},
 {feature:'Official US issuer search and reported facts',status:'Configured separately',detail:'Requires the authorised SEC connection and server configuration to operate.'},
 {feature:'Private DGX-powered analyst',status:'Configured separately',detail:'Server-side model gateway remains disabled until authenticated infrastructure is provided.'},
 {feature:'Global listed/unlisted prices, scores and research coverage',status:'Planned',detail:'Requires licensed market data, registry adapters, quality controls and review.'}
 ]}/>
 <QuestionSection title="The questions worth asking." description="Research is most useful when the limits are clear." questions={[
 {question:'Can CREQOR determine a company’s market capitalisation?',answer:'For listed shares, a defensible market cap needs a dated market price multiplied by the applicable share count. The required live price data is not connected in this release. The modelling lab currently produces hypothetical discounted cash-flow estimates instead.'},
 {question:'Can it estimate the value of an unlisted business?',answer:'The methodology supports thinking through private-company valuation, but an actual company assessment requires audited financials, a capitalisation table, appropriate peer inputs and assumptions. Do not label a modelled private equity value as an observed stock-exchange market cap.'},
 {question:'Will AI generate the financial figures?',answer:'The deterministic calculator—not a language model—performs the available DCF arithmetic. A DGX-hosted model can help analyse evidence only when its secure gateway is configured. Generated interpretation is not source verification.'},
 {question:'Can the platform give buy or sell recommendations?',answer:'CREQOR is currently a research and modelling tool, not a regulated advisory or credit-rating service. An illustrative valuation, company comparison or AI interpretation should not be treated as an investment recommendation.'}
 ]}/>
 <RouteTiles title="Start with the question you have." items={[
 {href:'/explore',label:'Who is the issuer?',description:'Company identity and SEC research starting points'},
 {href:'/lab',label:'What could it be worth?',description:'Inspect DCF assumptions and sensitivity'},
 {href:'/verification',label:'Where is the evidence?',description:'Source confidence and review criteria'}
 ]}/>
 </>;}

export function ExplorerSections(){return <>
 <DetailSplit eyebrow="THE ISSUER FIRST" title="A company name is not enough." description="Similar names, corporate groups and multiple securities are easy to confuse. The first layer is about knowing which legal entity the research actually refers to." visual="coverage" points={[
  {title:'Canonical identifiers',description:'CIK, ticker and exchange help distinguish a registered issuer from a brand or a different share class.'},
  {title:'Context with every record',description:'Fiscal periods, filing dates and jurisdictions determine how a statement can be interpreted.'},
  {title:'A clear boundary',description:'The current explorer covers US SEC identifiers only when its official data connection is configured.'}
 ]}/>
 <FeatureGallery eyebrow="WHAT TO CHECK" title="Four layers of entity research." cols={4} items={[
 {eyebrow:'IDENTITY',title:'Legal entity',description:'Confirm the precise issuer and the jurisdiction of its filings.'},
 {eyebrow:'SECURITY',title:'Listing and class',description:'Separate shares, tickers, exchanges and ownership interests.'},
 {eyebrow:'REPORTING',title:'Financial statements',description:'Examine the matching filing period and reporting unit.'},
 {eyebrow:'RELATIONSHIPS',title:'Corporate structure',description:'Do not assume the subsidiary, trademark owner or operating company is the listed issuer.'}
 ]}/>
 <ComparisonTable eyebrow="COVERAGE WITHOUT CONFUSION" title="What the explorer can identify." headers={['ATTRIBUTE','CURRENT US SEC WORKFLOW','NOT YET AN INTEGRATED SOURCE']} rows={[
 {metric:'Entity name and CIK',a:'Official SEC company ticker directory, when enabled.',b:'Automated reconciliation across global company registries.'},
 {metric:'Ticker and exchange',a:'SEC-reported identifiers for available issuers.',b:'Licensed real-time exchange quotes and full share-class pricing.'},
 {metric:'Financial highlights',a:'Source-linked selected SEC XBRL facts on issuer pages.',b:'Assured global private-company financial statements.'},
 {metric:'Group relationships',a:'Must be individually checked against primary records.',b:'A verified consolidated worldwide ownership graph.'}
 ]}/>
 <QuestionSection title="Searching responsibly." questions={[
 {question:'Why do two companies sometimes have similar names?',answer:'Brands, subsidiaries and holding companies can share names. Confirm the CIK, jurisdiction, filing entity and security identifiers before comparing their numbers.'},
 {question:'Why is a ticker not enough for a valuation?',answer:'A ticker identifies a security, not its full capitalisation structure. Accurate market-cap work also requires the relevant share class, the applicable share count and a dated price.'},
 {question:'Does CREQOR already cover India, UAE, Namibia and other private markets?',answer:'No. These geographies require their own verified registry connectors, permissions and data contracts. The explorer must not imply that the US SEC connection gives worldwide coverage.'}
 ]}/>
 <RouteTiles items={[
 {href:'/compare',label:'Compare SEC issuers',description:'Use exact identifiers and reported annual financial facts'},
 {href:'/verification',label:'Verify a claim',description:'Understand how evidence is treated'},
 {href:'/lab',label:'Test a valuation',description:'Explore a transparent hypothetical cash-flow model'}
 ]}/>
 </>;}

export function LabSections(){return <>
 <ProcessTimeline eyebrow="THE FINANCIAL MODEL" title="From operating cash to equity." description="The core DCF relationship is deterministic. The assumptions and the enterprise-to-equity bridge should always remain visible." steps={[
 {title:'Forecast cash flow',description:'Start with free cash flow and project it for the selected horizon.',foot:'USER INPUTS'},
 {title:'Discount to today',description:'Apply a required return to the future cash flows.',foot:'DISCOUNT RATE'},
 {title:'Add continuing value',description:'Estimate terminal value from sustainable long-run growth.',foot:'GROWTH BELOW WACC'},
 {title:'Bridge to equity',description:'Reconcile enterprise value and net debt, then divide by diluted shares.',foot:'SHARE COUNT'}
 ]}/>
 <DetailSplit eyebrow="SCENARIOS THAT TEACH" title="There is no single inevitable number." description="A small movement in growth or discount rate can create a large change in model value. The lab exposes these sensitivities instead of hiding them in a headline." visual="valuation" points={[
  {title:'Bear / base / bull',description:'Switch between explicit model variations to understand how outlook changes an estimate.'},
  {title:'Sensitivity table',description:'Inspect the interaction between terminal growth and the discount rate.'},
  {title:'Reproducible mathematics',description:'All outputs are deterministic and trace back to entered assumptions—not AI-generated prices.'}
 ]}/>
 <FeatureGallery eyebrow="MODELS & LIMITATIONS" title="A serious valuation uses more than one lens." cols={4} items={[
 {eyebrow:'AVAILABLE',title:'Discounted cash flow',description:'Illustrative scenario model with live recalculation and sensitivity.',tag:'INTERACTIVE NOW'},
 {eyebrow:'METHODOLOGY',title:'Trading comparables',description:'Would require sourced peer fundamentals, prices, dates and normalised metrics.',tag:'NOT CONNECTED'},
 {eyebrow:'METHODOLOGY',title:'Transaction multiples',description:'Would depend on deal terms, transaction structure and comparable scope.',tag:'NOT CONNECTED'},
 {eyebrow:'METHODOLOGY',title:'Asset-based value',description:'Would require independently supported asset and liability adjustments.',tag:'NOT CONNECTED'}
 ]}/>
 <ComparisonTable eyebrow="MAKE THE LANGUAGE PRECISE" title="Enterprise value is not equity value." headers={['TERM','WHAT IT REPRESENTS','WHY IT MATTERS']} rows={[
 {metric:'Enterprise value',a:'Modelled value of operating business before the financing bridge.',b:'Cannot be presented as share-owner value without adjustments.'},
 {metric:'Net debt',a:'Debt less cash, plus any relevant model-specific adjustments.',b:'Bridges the value from the operating enterprise to equity.'},
 {metric:'Equity value',a:'Enterprise value adjusted for net debt and other claims.',b:'The estimated value attributable to equity holders.'},
 {metric:'Per-share estimate',a:'Equity value divided by the matched fully diluted share count.',b:'Not a stock-exchange market price.'}
 ]}/>
 <QuestionSection title="What changes the answer?" questions={[
 {question:'Why does the model change when WACC moves?',answer:'WACC is the discount rate applied to future cash flows. A higher discount rate generally reduces their present value; the effect can be substantial when much of the value comes from later years.'},
 {question:'Why must terminal growth stay below the discount rate?',answer:'The perpetual growth formula requires the discount rate to exceed the terminal growth rate. Otherwise the continuing-value calculation would be mathematically invalid or economically misleading.'},
 {question:'Is the starting USD figure a company estimate?',answer:'No. The initial values are explicitly hypothetical training inputs. Replace them with verifiable financials and document their sources before using the output for actual research.'},
 {question:'Can the DCF alone prove a USD 2.4 billion company value?',answer:'No. A defensible valuation must establish the relevant legal entity, audited financials, share ownership, capital structure, model inputs, relevant peer evidence and an independent review. A target amount cannot be assumed first and then “proved” by selecting inputs.'}
 ]}/>
 <RouteTiles items={[
 {href:'/methodology',label:'Read the formulas',description:'Understand assumptions, scores and disclosures'},
 {href:'/compare',label:'Examine peers',description:'Compare source-reported company financials'},
 {href:'/analyst',label:'Question the assumptions',description:'Use the protected research gateway when configured'}
 ]}/>
 </>;}

export function CompareSections(){return <>
 <DetailSplit eyebrow="COMPARATIVE RESEARCH" title="Same columns. Different realities." description="A fair peer analysis starts by comparing like with like. Issuer-reported numbers may use different periods, accounting choices or capital structures." visual="comparison" points={[
  {title:'Matched reporting periods',description:'Use filing dates and period ends before drawing trends from two sets of annual results.'},
  {title:'Comparable definitions',description:'Revenue, cash flows and equity should represent the same units and financial concepts.'},
  {title:'A comparison is not a conclusion',description:'Larger revenue does not automatically mean stronger credit, higher market value or a better investment.'}
 ]}/>
 <FeatureGallery eyebrow="SEVEN REPORTED METRICS" title="Know what you are comparing." cols={4} items={[
 {eyebrow:'01 / SCALE',title:'Revenue',description:'The top-line size of operations, subject to sector and accounting context.'},
 {eyebrow:'02 / PROFIT',title:'Net income',description:'Residual earnings after reported costs and other charges.'},
 {eyebrow:'03 / OPERATIONS',title:'Operating income',description:'A look at reported earnings before non-operating items.'},
 {eyebrow:'04 / LIQUIDITY',title:'Operating cash flow',description:'Cash generated or used by operating activities.'},
 {eyebrow:'05 / BALANCE SHEET',title:'Assets',description:'Resources recorded on an issuer’s balance sheet.'},
 {eyebrow:'06 / OWNERSHIP',title:'Stockholders’ equity',description:'The book-value claim of equity owners, not market cap.'},
 {eyebrow:'07 / CASH',title:'Cash equivalents',description:'Reported liquid balance-sheet resources; definitions vary.'}
 ]}/>
 <ProcessTimeline eyebrow="COMPARE WITHOUT DISTORTION" title="A four-step peer review." steps={[
 {title:'Confirm identity',description:'Match two different, exact US tickers or CIKs.'},
 {title:'Read reporting dates',description:'Check source period ends and filing timestamps.'},
 {title:'Study the gaps',description:'Leave unavailable facts unavailable; never substitute a fabricated zero.'},
 {title:'Ask what differs',description:'Consider sector, capital structure, accounting and geography.'}
 ]}/>
 <QuestionSection title="The comparison questions." questions={[
 {question:'Does the comparison include current stock prices?',answer:'No. This workflow compares selected official annual filing facts when the SEC integration is available. Live stock pricing and market capitalisation require a separately sourced and licensed feed.'},
 {question:'Can I compare a private company against a listed peer?',answer:'Not yet through this interface. A valid private-company comparison would require independently supported, normalised financial statements and appropriate adjustments for liquidity and control.'},
 {question:'What does a missing comparison value mean?',answer:'It means the selected fact is unavailable in the supported source mapping; it does not mean that the company reported zero.'}
 ]}/>
 <RouteTiles items={[
 {href:'/explore',label:'Check company identities',description:'Resolve issuer tickers and CIKs'},
 {href:'/lab',label:'Run a valuation scenario',description:'Understand the assumptions behind value'},
 {href:'/methodology',label:'Understand limitations',description:'Read the source and calculation policies'}
 ]}/>
 </>;}

export function IntelligenceSections(){return <>
 <ProcessTimeline eyebrow="HOW A SIGNAL BECOMES INSIGHT" title="From event to interpretation." description="A market intelligence system must separate a verified event from speculation about its impact." steps={[
 {title:'Detect',description:'Identify an event or a documented filing worth investigating.'},
 {title:'Confirm',description:'Locate the original announcement, regulator filing or reliable issuer record.'},
 {title:'Contextualise',description:'Assess dates, counterparties, ownership, currencies and sector context.'},
 {title:'Assess',description:'Present supported implications, uncertainties and alternative interpretations.'}
 ]}/>
 <DetailSplit eyebrow="RESEARCH LAYERS" title="A headline is only the beginning." description="Corporate events, reporting changes and ownership claims should connect back to the issuer and the supporting record—not become unsourced intelligence scores." visual="intelligence" points={[
  {title:'Corporate actions',description:'Distinguish announcements, approvals, proposed transactions and completed transactions.'},
  {title:'Financial signals',description:'Track changes in reported earnings, assets, cash flow, leverage and other documented fundamentals.'},
  {title:'Governance and transparency',description:'Treat contradictory disclosures and unresolved ownership information as important risk context.'}
 ]}/>
 <FeatureGallery eyebrow="AREAS OF COVERAGE" title="Questions worth monitoring." cols={4} items={[
 {eyebrow:'MARKET STRUCTURE',title:'Capital changes',description:'Share issuances, classes, splits, buybacks and claims on equity.',tag:'SOURCE-DEPENDENT'},
 {eyebrow:'OWNERSHIP',title:'Corporate relationships',description:'Subsidiaries, proposed combinations and control interests.',tag:'SOURCE-DEPENDENT'},
 {eyebrow:'FINANCIALS',title:'Reporting movements',description:'Changes in cash generation, leverage and working capital.',tag:'SOURCE-DEPENDENT'},
 {eyebrow:'GOVERNANCE',title:'Disclosure quality',description:'Filing revisions, contradictory facts and disclosure gaps.',tag:'SOURCE-DEPENDENT'}
 ]}/>
 <StatusOverview eyebrow="COVERAGE STATUS" title="Intelligence with explicit boundaries." items={[
 {feature:'Research framework for market and corporate events',status:'Available',detail:'The taxonomy and evidence standards are published on this page.'},
 {feature:'Linked US issuer research',status:'Configured separately',detail:'Official SEC connector is needed before company-specific evidence becomes available.'},
 {feature:'Continuous global market surveillance',status:'Planned',detail:'Requires source licensing, compliant data collection, monitoring jobs, alert delivery and human review.'}
 ]}/>
 <QuestionSection title="What makes a signal credible?" questions={[
 {question:'Can a company announcement be treated as a completed corporate action?',answer:'No. A proposal, board approval, regulator consent and completed transaction are different stages. Each must be supported and dated separately.'},
 {question:'Does a trademark, branch count or number of staff prove a market capitalisation?',answer:'No. Those may matter as operating or intangible-asset context but do not independently establish a publicly traded equity value. A valuation must account for actual economic rights, attributable earnings, obligations and supporting evidence.'},
 {question:'Will CREQOR automatically publish breaking financial news?',answer:'Not in the current release. Automated feeds, source verification and editorial review need to be implemented before live company-specific monitoring can be represented as operational.'}
 ]}/>
 <RouteTiles items={[
 {href:'/verification',label:'Evidence verification',description:'Explore documented confidence and claim states'},
 {href:'/research',label:'Research framework',description:'See the investigation and review sequence'},
 {href:'/explore',label:'Find the issuer',description:'Start with an exact company record'}
 ]}/>
 </>;}
