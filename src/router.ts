type CalculatorRoute = "loan" | "buy";

interface RouteConfig {
  title: string;
  viewId: string;
}

const routes: Record<CalculatorRoute, RouteConfig> = {
  loan: { title: "대출 상환 계산 | 아파트 계산기", viewId: "loan-view" },
  buy: { title: "아파트 매매비용 | 아파트 계산기", viewId: "buy-view" },
};

function getRoute(): CalculatorRoute {
  return window.location.hash === "#/buy" ? "buy" : "loan";
}

function renderRoute(shouldScroll: boolean): void {
  const activeRoute = getRoute();

  (Object.keys(routes) as CalculatorRoute[]).forEach((route) => {
    const view = document.getElementById(routes[route].viewId);
    if (!view) throw new Error(`계산기 화면을 찾을 수 없습니다: ${route}`);
    view.hidden = route !== activeRoute;
  });

  document.querySelectorAll<HTMLAnchorElement>("[data-route]").forEach((link) => {
    const isActive = link.dataset.route === activeRoute;
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  document.title = routes[activeRoute].title;
  if (shouldScroll) window.scrollTo({ top: 0, behavior: "auto" });
}

export function initRouter(): void {
  if (window.location.hash !== "#/loan" && window.location.hash !== "#/buy") {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/loan`);
  }

  renderRoute(false);
  window.addEventListener("hashchange", () => renderRoute(true));
}
