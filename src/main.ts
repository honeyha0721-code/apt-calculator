import { calculateLoan, type LoanResult, type PaymentRow, type RepaymentMethod } from "./calculator";

type TermUnit = "years" | "months";

interface FormValues {
  principal: number;
  term: number;
  annualRate: number;
  months: number;
  method: RepaymentMethod;
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`필수 화면 요소를 찾을 수 없습니다: ${selector}`);
  return element;
}

const form = requiredElement<HTMLFormElement>("#loan-form");
const amountInput = requiredElement<HTMLInputElement>("#loan-amount");
const amountKorean = requiredElement<HTMLElement>("#amount-korean");
const termInput = requiredElement<HTMLInputElement>("#loan-term");
const termUnit = requiredElement<HTMLSelectElement>("#term-unit");
const rateInput = requiredElement<HTMLInputElement>("#interest-rate");
const scheduleBody = requiredElement<HTMLTableSectionElement>("#schedule-body");
const scheduleToggle = requiredElement<HTMLButtonElement>("#schedule-toggle");
const scheduleCaption = requiredElement<HTMLElement>("#schedule-caption");
const resultPanel = requiredElement<HTMLElement>("#result-panel");

let currentSchedule: PaymentRow[] = [];
let showFullSchedule = false;

const wonFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

function parseAmount(value: string): number {
  return Number(value.replace(/[^0-9]/g, ""));
}

function formatWon(value: number): string {
  return `${wonFormatter.format(Math.round(value))}원`;
}

function formatKoreanAmount(value: number): string {
  if (!value) return "";

  const eok = Math.floor(value / 100_000_000);
  const man = Math.floor((value % 100_000_000) / 10_000);
  const won = value % 10_000;
  const parts: string[] = [];

  if (eok) parts.push(`${wonFormatter.format(eok)}억`);
  if (man) parts.push(`${wonFormatter.format(man)}만`);
  if (won) parts.push(wonFormatter.format(won));
  return `${parts.join(" ")}원`;
}

function setError(input: HTMLInputElement, errorId: string, message: string): void {
  input.setAttribute("aria-invalid", message ? "true" : "false");
  requiredElement<HTMLElement>(`#${errorId}`).textContent = message;
}

function getSelectedMethod(): RepaymentMethod {
  const selected = form.querySelector<HTMLInputElement>('input[name="repaymentMethod"]:checked');
  if (!selected) throw new Error("상환방법을 선택해 주세요.");
  return selected.value as RepaymentMethod;
}

function getValues(): FormValues {
  const principal = parseAmount(amountInput.value);
  const term = Number(termInput.value);
  const annualRate = Number(rateInput.value);
  const unit = termUnit.value as TermUnit;
  const months = unit === "years" ? term * 12 : term;

  return { principal, term, annualRate, months, method: getSelectedMethod() };
}

function validate(values: FormValues): boolean {
  const amountMessage = values.principal < 1_000_000 || values.principal > 100_000_000_000
    ? "100만원 이상 1,000억원 이하로 입력해 주세요."
    : "";
  const termMessage = !Number.isInteger(values.months) || values.months < 1 || values.months > 600
    ? "1개월 이상 50년 이하로 입력해 주세요."
    : "";
  const rateMessage = !Number.isFinite(values.annualRate) || values.annualRate < 0 || values.annualRate > 50
    ? "0% 이상 50% 이하로 입력해 주세요."
    : "";

  setError(amountInput, "amount-error", amountMessage);
  setError(termInput, "term-error", termMessage);
  setError(rateInput, "rate-error", rateMessage);
  return !(amountMessage || termMessage || rateMessage);
}

function methodLabel(method: RepaymentMethod): string {
  const labels: Record<RepaymentMethod, string> = {
    "equal-payment": "원리금균등",
    "equal-principal": "원금균등",
    bullet: "만기일시",
  };
  return labels[method];
}

function renderSchedule(): void {
  const rows = showFullSchedule ? currentSchedule : currentSchedule.slice(0, 12);
  scheduleBody.innerHTML = rows.map((item) => `
    <tr>
      <td>${item.month}회</td>
      <td>${formatWon(item.payment)}</td>
      <td>${formatWon(item.principal)}</td>
      <td>${formatWon(item.interest)}</td>
      <td>${formatWon(item.balance)}</td>
    </tr>
  `).join("");

  const hasMore = currentSchedule.length > 12;
  scheduleToggle.hidden = !hasMore;
  scheduleToggle.textContent = showFullSchedule ? "간단히 보기" : "전체 일정 보기";
  scheduleToggle.setAttribute("aria-expanded", String(showFullSchedule));
  scheduleCaption.textContent = showFullSchedule
    ? `전체 ${currentSchedule.length}개월의 예상 일정입니다.`
    : hasMore
      ? `처음 12개월의 예상 일정입니다. 전체 ${currentSchedule.length}개월 중 일부만 표시했어요.`
      : `전체 ${currentSchedule.length}개월의 예상 일정입니다.`;
}

function renderResult(values: FormValues, result: LoanResult): void {
  const unit = termUnit.value as TermUnit;
  const termText = unit === "years" ? `${values.term}년` : `${values.term}개월`;
  requiredElement<HTMLElement>("#result-condition").textContent =
    `${formatKoreanAmount(values.principal)} · ${termText} · 연 ${values.annualRate}% · ${methodLabel(values.method)}`;

  const paymentLabel = requiredElement<HTMLElement>("#payment-label");
  const paymentNote = requiredElement<HTMLElement>("#payment-note");

  if (values.method === "equal-principal") {
    paymentLabel.textContent = "첫 달 상환액";
    paymentNote.textContent = "매달 갚는 원금은 같고 이자가 줄어 상환액도 점차 감소합니다.";
  } else if (values.method === "bullet") {
    const finalPayment = result.schedule.at(-1);
    if (!finalPayment) throw new Error("마지막 상환 정보를 찾을 수 없습니다.");
    paymentLabel.textContent = "매월 납부이자";
    paymentNote.textContent = `마지막 달에는 원금과 이자를 합쳐 ${formatWon(finalPayment.payment)}을 상환합니다.`;
  } else {
    paymentLabel.textContent = "매월 상환액";
    paymentNote.textContent = "원금과 이자를 합쳐 매달 납부하는 예상 금액입니다.";
  }

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
  if (!validate(values)) return;

  const result = calculateLoan(values);
  renderResult(values, result);

  if (shouldScroll && window.matchMedia("(max-width: 900px)").matches) {
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

amountInput.addEventListener("input", () => {
  const amount = parseAmount(amountInput.value);
  amountInput.value = amount ? wonFormatter.format(amount) : "";
  amountKorean.textContent = formatKoreanAmount(amount);
  setError(amountInput, "amount-error", "");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  calculateAndRender({ shouldScroll: true });
});

scheduleToggle.addEventListener("click", () => {
  showFullSchedule = !showFullSchedule;
  renderSchedule();
});

calculateAndRender();
