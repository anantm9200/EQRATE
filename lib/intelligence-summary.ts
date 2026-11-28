import {computeAssessment,type Assessment,type AssessmentResult} from './assessment';
import {reviewAssessment} from './research-intelligence';
import {runForensicIntelligence,type IntelligenceReport} from './forensic-intelligence';

/** Per-assessment figures a portfolio list needs: the libraries run once per record, nothing more. */
export type PortfolioSummary={id:string;result:AssessmentResult;criticalFindings:number;forensic:IntelligenceReport['summary']};
export function portfolioSummary(a:Assessment,asOf?:string):PortfolioSummary{
 const result=computeAssessment(a);
 const review=asOf===undefined?reviewAssessment(a):reviewAssessment(a,asOf);
 const forensic=(asOf===undefined?runForensicIntelligence(a):runForensicIntelligence(a,asOf)).summary;
 return {id:a.id,result,criticalFindings:review.findings.filter(f=>f.level==='critical').length,forensic};
}
/** Equity value shown for a saved record: manual market cap for listed issuers when available, else the weighted model. */
export function headlineValue(a:Pick<Assessment,'kind'>,result:AssessmentResult):number|null{
 return a.kind==='listed'?result.marketCap??result.blended:result.blended;
}
