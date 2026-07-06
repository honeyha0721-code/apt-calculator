import { calculateLoan, type LoanResult, type PaymentRow, type RepaymentMethod } from "./calculator";
import { initBuyCalculator } from "./buy";
import { initRouter } from "./router";

interface FormValues {
  principal: number;
  term: number;
  annualRate: number;
  months: number;
  method: RepaymentMethod | null;
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`필수 화면 요소를 찾을 수 없습니다: ${selector}`);
  return element;
}

const form = requiredElement<HTMLFormElement>("#loan-form");
const amountInput = requiredElement<HTMLInputElement>("#loan-amount");
const termInput = requiredElement<HTMLInputElement>("#loan-term");
const rateInput = requiredElement<HTMLInputElement>("#interest-rate");
const resultPanel = requiredElement<HTMLElement>("#result-panel");
const scheduleBody = requiredElement<HTMLTableSectionElement>("#schedule-body");
const scheduleToggle = requiredElement<HTMLButtonElement>("#schedule-toggle");
const scheduleCaption = requiredElement<HTMLElement>("#schedule-caption");

let currentSchedule: PaymentRow[] = [];
let showFullSchedule = false;

const wonFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

function parseAmount(value: string): number {
  if (!value.trim()) return 0;
  return Number(value) * 100_000_000;
}

function formatWon(value: number): string {
  return `${wonFormatter.format(Math.round(value))}원`;
}

function setError(input: HTMLInputElement, errorId: string, message: string): void {
  input.setAttribute("aria-invalid", message ? "true" : "false");
  requiredElement<HTMLElement>(`#${errorId}`).textContent = message;
}

function setMethodError(message: string): void {
  requiredElement<HTMLElement>("#method-error").textContent = message;
}

function getSelectedMethod(): RepaymentMethod | null {
  const selected = form.querySelector<HTMLInputElement>('input[name="repaymentMethod"]:checked');
  return selected ? selected.value as RepaymentMethod : null;
}

function getValues(): FormValues {
  const principal = parseAmount(amountInput.value);
  const term = Number(termInput.value);
  const annualRate = rateInput.value.trim() ? Number(rateInput.value) : Number.NaN;
  const months = term * 12;

  return { principal, term, annualRate, months, method: getSelectedMethod() };
}

function validate(values: FormValues): boolean {
  const amountMessage = values.principal < 1_000_000 || values.principal > 100_000_000_000
    ? "0.01억원 이상 1,000억원 이하로 입력해 주세요."
    : "";
  const termMessage = !Number.isInteger(values.term) || values.term < 1 || values.term > 50
    ? "1년 이상 50년 이하로 입력해 주세요."
    : "";
  const rateMessage = !Number.isFinite(values.annualRate) || values.annualRate < 0 || values.annualRate > 50
    ? "0% 이상 50% 이하로 입력해 주세요."
    : "";
  const methodMessage = values.method ? "" : "상환방법을 선택해 주세요.";

  setError(amountInput, "amount-error", amountMessage);
  setError(termInput, "term-error", termMessage);
  setError(rateInput, "rate-error", rateMessage);
  setMethodError(methodMessage);
  return !(amountMessage || termMessage || rateMessage || methodMessage);
}

function renderSchedule(): void {
  const visibleRows = showFullSchedule ? currentSchedule : currentSchedule.slice(0, 24);
  scheduleBody.innerHTML = visibleRows.map((item) => `
    <tr>
      <td>${item.month}개월</td>
      <td>${formatWon(item.payment)}</td>
      <td>${formatWon(item.principal)}</td>
      <td>${formatWon(item.interest)}</td>
      <td>${formatWon(item.balance)}</td>
    </tr>
  `).join("");

  const hasMore = currentSchedule.length > 24;
  scheduleToggle.hidden = !hasMore;
  scheduleToggle.textContent = showFullSchedule ? "간단히 보기" : "전체 기간 펼쳐 보기";
  scheduleToggle.setAttribute("aria-expanded", String(showFullSchedule));
  scheduleCaption.textContent = showFullSchedule
    ? `전체 ${currentSchedule.length}개월의 원리금 상환액입니다.`
    : hasMore
      ? `첫 24개월 동안의 원리금 상환액입니다. 전체 ${currentSchedule.length}개월의 원리금 상환액을 펼쳐볼 수 있어요.`
      : `전체 ${currentSchedule.length}개월의 원리금 상환액입니다.`;
}

function renderResult(values: FormValues, result: LoanResult): void {
  requiredElement<HTMLElement>("#monthly-payment").innerHTML =
    `${wonFormatter.format(Math.round(result.monthlyPayment))}<small>원</small>`;
  requiredElement<HTMLElement>("#total-principal").textContent = formatWon(values.principal);
  requiredElement<HTMLElement>("#total-interest").textContent = formatWon(result.totalInterest);
  requiredElement<HTMLElement>("#total-payment").textContent = formatWon(result.totalPayment);

  const principalRatio = values.principal / result.totalPayment * 100;
  const interestRatio = 100 - principalRatio;
  requiredElement<HTMLElement>("#principal-ratio").textContent = `${percentFormatter.format(principalRatio)}%`;
  requiredElement<HTMLElement>("#interest-ratio").textContent = `${percentFormatter.format(interestRatio)}%`;
  requiredElement<HTMLElement>("#principal-bar").style.width = `${principalRatio}%`;
  requiredElement<HTMLElement>("#interest-bar").style.width = `${interestRatio}%`;

  currentSchedule = result.schedule;
  showFullSchedule = false;
  renderSchedule();
}

function calculateAndRender({ shouldScroll = false } = {}): void {
  const values = getValues();
  if (!validate(values) || !values.method) return;

  const result = calculateLoan({
    principal: values.principal,
    annualRate: values.annualRate,
    months: values.months,
    method: values.method,
  });
  renderResult(values, result);

  if (shouldScroll && window.matchMedia("(max-width: 900px)").matches) {
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

amountInput.addEventListener("input", () => setError(amountInput, "amount-error", ""));
termInput.addEventListener("input", () => setError(termInput, "term-error", ""));
rateInput.addEventListener("input", () => setError(rateInput, "rate-error", ""));
form.querySelectorAll<HTMLInputElement>('input[name="repaymentMethod"]').forEach((input) => {
  input.addEventListener("change", () => setMethodError(""));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  calculateAndRender({ shouldScroll: true });
});

scheduleToggle.addEventListener("click", () => {
  showFullSchedule = !showFullSchedule;
  renderSchedule();
});

initBuyCalculator();
initRouter();
