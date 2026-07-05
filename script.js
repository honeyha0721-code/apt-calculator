import { calculateLoan } from "./calculator.js";

const form = document.querySelector("#loan-form");
const amountInput = document.querySelector("#loan-amount");
const amountKorean = document.querySelector("#amount-korean");
const termInput = document.querySelector("#loan-term");
const termUnit = document.querySelector("#term-unit");
const rateInput = document.querySelector("#interest-rate");
const scheduleBody = document.querySelector("#schedule-body");
const scheduleToggle = document.querySelector("#schedule-toggle");
const scheduleCaption = document.querySelector("#schedule-caption");
const resultPanel = document.querySelector("#result-panel");

let currentSchedule = [];
let showFullSchedule = false;

const wonFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

function parseAmount(value) {
  return Number(String(value).replace(/[^0-9]/g, ""));
}

function formatWon(value) {
  return `${wonFormatter.format(Math.round(value))}원`;
}

function formatKoreanAmount(value) {
  if (!value) return "";
  const eok = Math.floor(value / 100_000_000);
  const man = Math.floor((value % 100_000_000) / 10_000);
  const won = value % 10_000;
  const parts = [];
  if (eok) parts.push(`${wonFormatter.format(eok)}억`);
  if (man) parts.push(`${wonFormatter.format(man)}만`);
  if (won) parts.push(`${wonFormatter.format(won)}`);
  return `${parts.join(" ")}원`;
}

function setError(input, errorId, message) {
  input.setAttribute("aria-invalid", message ? "true" : "false");
  document.querySelector(`#${errorId}`).textContent = message;
}

function getValues() {
  const principal = parseAmount(amountInput.value);
  const term = Number(termInput.value);
  const annualRate = Number(rateInput.value);
  const months = termUnit.value === "years" ? term * 12 : term;
  const method = form.elements.repaymentMethod.value;
  return { principal, term, annualRate, months, method };
}

function validate(values) {
  let valid = true;
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
  if (amountMessage || termMessage || rateMessage) valid = false;
  return valid;
}

function methodLabel(method) {
  return {
    "equal-payment": "원리금균등",
    "equal-principal": "원금균등",
    bullet: "만기일시",
  }[method];
}

function renderSchedule() {
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

function renderResult(values, result) {
  const termText = termUnit.value === "years" ? `${values.term}년` : `${values.term}개월`;
  document.querySelector("#result-condition").textContent = `${formatKoreanAmount(values.principal)} · ${termText} · 연 ${values.annualRate}% · ${methodLabel(values.method)}`;

  const paymentLabel = document.querySelector("#payment-label");
  const paymentNote = document.querySelector("#payment-note");
  if (values.method === "equal-principal") {
    paymentLabel.textContent = "첫 달 상환액";
    paymentNote.textContent = "매달 갚는 원금은 같고 이자가 줄어 상환액도 점차 감소합니다.";
  } else if (values.method === "bullet") {
    paymentLabel.textContent = "매월 납부이자";
    paymentNote.textContent = `마지막 달에는 원금과 이자를 합쳐 ${formatWon(result.schedule.at(-1).payment)}을 상환합니다.`;
  } else {
    paymentLabel.textContent = "매월 상환액";
    paymentNote.textContent = "원금과 이자를 합쳐 매달 납부하는 예상 금액입니다.";
  }

  document.querySelector("#monthly-payment").innerHTML = `${wonFormatter.format(Math.round(result.monthlyPayment))}<small>원</small>`;
  document.querySelector("#total-principal").textContent = formatWon(values.principal);
  document.querySelector("#total-interest").textContent = formatWon(result.totalInterest);
  document.querySelector("#total-payment").textContent = formatWon(result.totalPayment);

  const principalRatio = values.principal / result.totalPayment * 100;
  const interestRatio = 100 - principalRatio;
  document.querySelector("#principal-ratio").textContent = `${percentFormatter.format(principalRatio)}%`;
  document.querySelector("#interest-ratio").textContent = `${percentFormatter.format(interestRatio)}%`;
  document.querySelector("#principal-bar").style.width = `${principalRatio}%`;
  document.querySelector("#interest-bar").style.width = `${interestRatio}%`;

  currentSchedule = result.schedule;
  showFullSchedule = false;
  renderSchedule();
}

function calculateAndRender({ shouldScroll = false } = {}) {
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
