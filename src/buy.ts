import {
  calculateBuyCosts,
  type BuyCostInput,
  type BuyCostResult,
} from "./buyCalculator";

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`매매비용 화면 요소를 찾을 수 없습니다: ${selector}`);
  return element;
}

const wonFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });

function formatWon(value: number): string {
  return `${wonFormatter.format(Math.round(value))}원`;
}

function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

function wonToManwonInput(value: number): string {
  return String(Number((value / 10_000).toFixed(2)));
}

export function initBuyCalculator(): void {
  const form = requiredElement<HTMLFormElement>("#buy-form");
  const purchasePriceInput = requiredElement<HTMLInputElement>("#purchase-price");
  const legalBaseFeeInput = requiredElement<HTMLInputElement>("#legal-base-fee");
  const bondCostInput = requiredElement<HTMLInputElement>("#bond-cost-input");
  const brokerageRateInput = requiredElement<HTMLInputElement>("#brokerage-rate-input");
  const brokerageFeeInput = requiredElement<HTMLInputElement>("#brokerage-fee-input");
  const acquisitionTaxRateInput = requiredElement<HTMLInputElement>("#acquisition-tax-rate");
  const acquisitionTaxInput = requiredElement<HTMLInputElement>("#acquisition-tax-input");
  const installmentMonthInputs = Array.from(form.ownerDocument.querySelectorAll<HTMLInputElement>('input[name="installmentMonths"]'));

  function selectedBrokerageRate(): number {
    return brokerageRateInput.value.trim() ? Number(brokerageRateInput.value) : Number.NaN;
  }

  function selectedInstallmentMonths(): number {
    const selected = installmentMonthInputs.find((input) => input.checked);
    return selected ? Number(selected.value) : 6;
  }

  function parseManwon(input: HTMLInputElement): number {
    return input.value.trim() ? Number(input.value) * 10_000 : 0;
  }

  function getValues(): BuyCostInput {
    return {
      purchasePrice: parseManwon(purchasePriceInput),
      brokerageRate: selectedBrokerageRate(),
      legalBaseFee: parseManwon(legalBaseFeeInput),
      bondCost: parseManwon(bondCostInput),
      acquisitionTaxRate: acquisitionTaxRateInput.value.trim() ? Number(acquisitionTaxRateInput.value) : Number.NaN,
    };
  }

  function setError(input: HTMLInputElement, errorId: string, message: string): void {
    input.setAttribute("aria-invalid", message ? "true" : "false");
    requiredElement<HTMLElement>(`#${errorId}`).textContent = message;
  }

  function validate(values: BuyCostInput): boolean {
    const priceMessage = !Number.isFinite(values.purchasePrice) || values.purchasePrice < 10_000 || values.purchasePrice > 100_000_000_000
      ? "1만원 이상 1,000억원 이하로 입력해 주세요."
      : "";
    const legalMessage = !Number.isFinite(values.legalBaseFee) || values.legalBaseFee < 0 || values.legalBaseFee > 100_000_000
      ? "0만원 이상 10,000만원 이하로 입력해 주세요."
      : "";
    const bondMessage = !Number.isFinite(values.bondCost) || values.bondCost < 0 || values.bondCost > 1_000_000_000
      ? "0만원 이상 100,000만원 이하로 입력해 주세요."
      : "";
    const brokerageRateMessage = !Number.isFinite(values.brokerageRate) || values.brokerageRate < 0.2 || values.brokerageRate > 0.6
      ? "0.2% 이상 0.6% 이하로 입력해 주세요."
      : "";
    const acquisitionTaxRateMessage = !Number.isFinite(values.acquisitionTaxRate) || values.acquisitionTaxRate < 0 || values.acquisitionTaxRate > 20
      ? "0% 이상 20% 이하로 입력해 주세요."
      : "";

    setError(purchasePriceInput, "purchase-price-error", priceMessage);
    setError(brokerageRateInput, "brokerage-rate-error", brokerageRateMessage);
    setError(legalBaseFeeInput, "legal-fee-error", legalMessage);
    setError(bondCostInput, "bond-cost-error", bondMessage);
    setError(acquisitionTaxRateInput, "acquisition-tax-rate-error", acquisitionTaxRateMessage);
    return !(priceMessage || brokerageRateMessage || legalMessage || bondMessage || acquisitionTaxRateMessage);
  }

  function setText(selector: string, text: string): void {
    requiredElement<HTMLElement>(selector).textContent = text;
  }

  function renderInstallment(acquisitionTax?: number): void {
    const months = selectedInstallmentMonths();
    setText("#installment-months-label", `${months}개월`);
    setText("#monthly-acquisition-tax", acquisitionTax === undefined ? "—" : formatWon(acquisitionTax / months));
  }

  function renderEmpty(): void {
    setText("#buy-total-cost", "—");
    setText("#buy-purchase-total", "—");
    setText("#buy-extra-excluding-tax", "—");
    setText("#buy-extra-including-tax", "—");
    setText("#buy-total-excluding-tax", "—");
    setText("#provisional-deposit", "—");
    setText("#contract-balance", "—");
    setText("#interim-payment", "—");
    setText("#final-payment", "—");
    setText("#brokerage-fee", "—");
    setText("#legal-base-cost", "—");
    setText("#bond-cost", "—");
    setText("#legal-total", "—");
    setText("#acquisition-tax", "—");
    setText("#extra-cost-total", "—");
    renderInstallment();
  }

  function render(values: BuyCostInput, result: BuyCostResult): void {
    requiredElement<HTMLElement>("#buy-total-cost").innerHTML =
      `${wonFormatter.format(Math.round(result.totalRequired))}<small>원</small>`;
    setText("#buy-purchase-total", formatWon(values.purchasePrice));
    setText("#buy-extra-excluding-tax", formatWon(result.extraCostExcludingTax));
    setText("#buy-extra-including-tax", formatWon(result.extraCostIncludingTax));
    requiredElement<HTMLElement>("#buy-total-excluding-tax").innerHTML =
      `${wonFormatter.format(Math.round(result.totalRequiredExcludingTax))}<small>원</small>`;

    setText("#provisional-deposit", formatWon(result.provisionalDeposit));
    setText("#contract-balance", formatWon(result.contractBalance));
    setText("#interim-payment", formatWon(result.interimPayment));
    setText("#final-payment", formatWon(result.finalPayment));

    setText("#brokerage-rate-label", `매매가액의 ${formatPercent(values.brokerageRate)}`);
    setText("#brokerage-fee", formatWon(result.brokerageFee));
    setText("#legal-base-cost", formatWon(result.legalBaseFee));
    setText("#bond-cost", formatWon(result.bondCost));
    setText("#legal-total", formatWon(result.legalTotal));
    setText("#acquisition-rate-label", `매매가액의 ${formatPercent(values.acquisitionTaxRate)}`);
    setText("#acquisition-tax", formatWon(result.acquisitionTax));
    setText("#extra-cost-total", formatWon(result.extraCostIncludingTax));
    renderInstallment(result.acquisitionTax);
  }

  function calculateAndRender(): void {
    if (!purchasePriceInput.value.trim()) {
      setError(purchasePriceInput, "purchase-price-error", "");
      renderEmpty();
      return;
    }

    const values = getValues();
    if (!validate(values)) return;
    const result = calculateBuyCosts(values);
    brokerageFeeInput.value = wonToManwonInput(result.brokerageFee);
    acquisitionTaxInput.value = wonToManwonInput(result.acquisitionTax);
    render(values, result);
  }

  function applyAutomaticPurchaseCosts(): void {
    const purchasePrice = parseManwon(purchasePriceInput);
    if (!purchasePriceInput.value.trim() || !Number.isFinite(purchasePrice) || purchasePrice <= 0) {
      bondCostInput.value = "";
      brokerageFeeInput.value = "";
      acquisitionTaxInput.value = "";
      calculateAndRender();
      return;
    }

    bondCostInput.value = wonToManwonInput(purchasePrice * 0.002);
    calculateAndRender();
  }

  purchasePriceInput.addEventListener("input", applyAutomaticPurchaseCosts);
  legalBaseFeeInput.addEventListener("input", calculateAndRender);
  bondCostInput.addEventListener("input", calculateAndRender);
  brokerageRateInput.addEventListener("input", calculateAndRender);
  acquisitionTaxRateInput.addEventListener("input", calculateAndRender);
  installmentMonthInputs.forEach((input) => input.addEventListener("change", calculateAndRender));
  form.addEventListener("submit", (event) => event.preventDefault());

  renderEmpty();
}
