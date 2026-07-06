export interface BuyCostInput {
  purchasePrice: number;
  brokerageRate: number;
  legalBaseFee: number;
  bondCost: number;
  acquisitionTaxRate: number;
}

export interface BuyCostResult {
  provisionalDeposit: number;
  contractBalance: number;
  interimPayment: number;
  finalPayment: number;
  brokerageFee: number;
  legalBaseFee: number;
  bondCost: number;
  legalTotal: number;
  acquisitionTax: number;
  extraCostExcludingTax: number;
  extraCostIncludingTax: number;
  totalRequiredExcludingTax: number;
  totalRequired: number;
}

export const ACQUISITION_TAX_ESTIMATE_RATE = 3.3;

function assertRate(name: string, value: number, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name}이(가) 올바르지 않습니다.`);
  }
}

export function calculateBuyCosts(input: BuyCostInput): BuyCostResult {
  if (!Number.isFinite(input.purchasePrice) || input.purchasePrice <= 0) {
    throw new Error("매매가액이 올바르지 않습니다.");
  }
  if (!Number.isFinite(input.legalBaseFee) || input.legalBaseFee < 0) {
    throw new Error("법무사 인건비와 등기비용이 올바르지 않습니다.");
  }
  if (!Number.isFinite(input.bondCost) || input.bondCost < 0) {
    throw new Error("국민주택채권 비용이 올바르지 않습니다.");
  }

  assertRate("중개수수료율", input.brokerageRate, 0.2, 0.6);
  assertRate("취득세율", input.acquisitionTaxRate, 0, 20);

  const provisionalDeposit = input.purchasePrice * 0.03;
  const contractBalance = input.purchasePrice * 0.07;
  const interimPayment = input.purchasePrice * 0.4;
  const finalPayment = input.purchasePrice * 0.5;
  const brokerageFee = input.purchasePrice * input.brokerageRate / 100;
  const legalTotal = input.legalBaseFee + input.bondCost;
  const acquisitionTax = input.purchasePrice * input.acquisitionTaxRate / 100;
  const extraCostExcludingTax = brokerageFee + legalTotal;
  const extraCostIncludingTax = extraCostExcludingTax + acquisitionTax;

  return {
    provisionalDeposit,
    contractBalance,
    interimPayment,
    finalPayment,
    brokerageFee,
    legalBaseFee: input.legalBaseFee,
    bondCost: input.bondCost,
    legalTotal,
    acquisitionTax,
    extraCostExcludingTax,
    extraCostIncludingTax,
    totalRequiredExcludingTax: input.purchasePrice + extraCostExcludingTax,
    totalRequired: input.purchasePrice + extraCostIncludingTax,
  };
}
