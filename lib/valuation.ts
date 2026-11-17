export type DcfInput = {
  baseFreeCashFlow: number;
  annualGrowth: number;
  discountRate: number;
  terminalGrowth: number;
  forecastYears: number;
  netDebt: number;
  sharesOutstanding?: number;
};
export type DcfResult = {
  enterpriseValue: number;
  equityValue: number;
  projectedCashFlows: number[];
  terminalValue: number;
  impliedPerShare: number | null;
};
export function calculateMarketCap(pricePerShare: number, applicableShares: number): number {
  if (![pricePerShare, applicableShares].every(Number.isFinite) || pricePerShare < 0 || applicableShares < 0) {
    throw new Error('Price and applicable share count must be non-negative finite numbers.');
  }
  return pricePerShare * applicableShares;
}
export function calculateDcf(input: DcfInput): DcfResult {
  const {baseFreeCashFlow,annualGrowth,discountRate,terminalGrowth,forecastYears,netDebt,sharesOutstanding}=input;
  if (![baseFreeCashFlow,annualGrowth,discountRate,terminalGrowth,forecastYears,netDebt].every(Number.isFinite)) {
    throw new Error('Inputs must be finite numbers.');
  }
  if (!Number.isInteger(forecastYears) || forecastYears < 1 || forecastYears > 30) {
    throw new Error('Forecast years must be between 1 and 30.');
  }
  if (discountRate <= terminalGrowth || discountRate <= -1 || annualGrowth <= -1 || terminalGrowth <= -1) {
    throw new Error('Discount rate must exceed terminal growth; rates must be greater than -100%.');
  }
  if (sharesOutstanding !== undefined && (!Number.isFinite(sharesOutstanding) || sharesOutstanding <= 0)) {
    throw new Error('Share count must be a positive finite number.');
  }
  const projectedCashFlows: number[] = [];
  let presentValue = 0;
  for (let year=1;year<=forecastYears;year++) {
    const cashFlow=baseFreeCashFlow*Math.pow(1+annualGrowth,year);
    projectedCashFlows.push(cashFlow);
    presentValue+=cashFlow/Math.pow(1+discountRate,year);
  }
  const last=projectedCashFlows[projectedCashFlows.length-1];
  const terminalValue=(last*(1+terminalGrowth))/(discountRate-terminalGrowth);
  const enterpriseValue=presentValue+terminalValue/Math.pow(1+discountRate,forecastYears);
  const equityValue=enterpriseValue-netDebt;
  return { enterpriseValue,equityValue,projectedCashFlows,terminalValue,
    impliedPerShare: sharesOutstanding === undefined ? null : equityValue/sharesOutstanding };
}
export function formatNumber(value: number, currency='USD') {
  return new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:1}).format(value);
}