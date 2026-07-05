export function calculateLoan({ principal, annualRate, months, method }) {
  if (!Number.isFinite(principal) || principal <= 0) throw new Error("대출금액이 올바르지 않습니다.");
  if (!Number.isFinite(annualRate) || annualRate < 0) throw new Error("대출금리가 올바르지 않습니다.");
  if (!Number.isInteger(months) || months <= 0) throw new Error("대출기간이 올바르지 않습니다.");

  const monthlyRate = annualRate / 100 / 12;
  const schedule = [];
  let balance = principal;

  if (method === "equal-payment") {
    const fixedPayment = monthlyRate === 0
      ? principal / months
      : principal * monthlyRate * (1 + monthlyRate) ** months / ((1 + monthlyRate) ** months - 1);

    for (let month = 1; month <= months; month += 1) {
      const interest = balance * monthlyRate;
      let principalPayment = fixedPayment - interest;
      let payment = fixedPayment;
      if (month === months) {
        principalPayment = balance;
        payment = principalPayment + interest;
      }
      balance = Math.max(0, balance - principalPayment);
      schedule.push({ month, payment, principal: principalPayment, interest, balance });
    }
  } else if (method === "equal-principal") {
    const fixedPrincipal = principal / months;
    for (let month = 1; month <= months; month += 1) {
      const interest = balance * monthlyRate;
      const principalPayment = month === months ? balance : fixedPrincipal;
      const payment = principalPayment + interest;
      balance = Math.max(0, balance - principalPayment);
      schedule.push({ month, payment, principal: principalPayment, interest, balance });
    }
  } else if (method === "bullet") {
    for (let month = 1; month <= months; month += 1) {
      const interest = balance * monthlyRate;
      const principalPayment = month === months ? principal : 0;
      const payment = principalPayment + interest;
      balance = month === months ? 0 : principal;
      schedule.push({ month, payment, principal: principalPayment, interest, balance });
    }
  } else {
    throw new Error("지원하지 않는 상환방법입니다.");
  }

  const totalInterest = schedule.reduce((sum, item) => sum + item.interest, 0);
  return {
    schedule,
    monthlyPayment: schedule[0].payment,
    totalInterest,
    totalPayment: principal + totalInterest,
  };
}
