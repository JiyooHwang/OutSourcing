// =============================================================
// 메인 App + 마운트
// 이 파일은 마지막에 로드되어야 합니다.
// =============================================================

function App() {
  const [data, setData] = useState(() => loadData());
  const [tab, setTab] = useState("dashboard");
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  useEffect(() => {
    saveData(data);
  }, [data]);

  function changeTab(next) {
    setSelectedPaymentId(null);
    setTab(next);
  }

  // 외주비 목록의 프로젝트명 클릭 → 프로젝트 페이지로 이동
  function goToProject(projectId) {
    setSelectedProjectId(projectId);
    setSelectedPaymentId(null);
    setTab("projects");
  }

  // (구) 외주비 상세 페이지로 가는 fallback. 현재는 비활성화 — 프로젝트 페이지로 이동.
  function selectPayment(id) {
    const payment = data.payments.find((p) => p.id === id);
    if (payment && payment.projectId) {
      goToProject(payment.projectId);
    } else {
      setSelectedPaymentId(id);
      setTab("payments");
    }
  }

  function backToList() {
    setSelectedPaymentId(null);
  }

  const stats = useMemo(() => {
    let pendingAmount = 0, paidAmount = 0;
    let pendingCount = 0, paidCount = 0, overdueCount = 0;
    for (const p of data.payments) {
      for (const inst of p.installments) {
        const amt = Number(inst.amount) || 0;
        if (inst.status === "PENDING")      { pendingAmount += amt; pendingCount++; }
        else if (inst.status === "PAID")    { paidAmount    += amt; paidCount++; }
        else if (inst.status === "OVERDUE") { overdueCount++; }
      }
    }
    return {
      vendorCount: data.vendors.length,
      pendingAmount, pendingCount,
      paidAmount, paidCount,
      overdueCount,
    };
  }, [data]);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <h1 className="text-lg font-bold">외주업체 관리</h1>
          <nav className="flex gap-1">
            <NavButton active={tab === "dashboard"} onClick={() => changeTab("dashboard")}>
              대시보드
            </NavButton>
            <NavButton active={tab === "vendors"} onClick={() => changeTab("vendors")}>
              외주처 목록
            </NavButton>
            <NavButton active={tab === "payments"} onClick={() => changeTab("payments")}>
              외주비 관리
            </NavButton>
            <NavButton active={tab === "projects"} onClick={() => changeTab("projects")}>
              프로젝트
            </NavButton>
          </nav>
          <DataMenu data={data} setData={setData} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === "dashboard" && (
          <Dashboard stats={stats} onNavigate={changeTab} />
        )}
        {tab === "vendors" && (
          <VendorsView data={data} setData={setData} />
        )}
        {tab === "payments" && (
          selectedPaymentId
            ? <PaymentDetailView
                data={data}
                setData={setData}
                paymentId={selectedPaymentId}
                onBack={backToList}
              />
            : <PaymentsView
                data={data}
                setData={setData}
                onSelectPayment={selectPayment}
              />
        )}
        {tab === "projects" && (
          <ProjectsView
            data={data}
            setData={setData}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
          />
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-6 text-xs text-slate-400">
        데이터는 이 브라우저의 localStorage에 저장됩니다. 다른 사람과 공유하려면
        '데이터 → 내보내기'로 JSON을 보내주세요.
      </footer>
    </div>
  );
}

function NavButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-2 text-sm font-medium rounded-md transition-colors " +
        (active
          ? "bg-slate-900 text-white"
          : "text-slate-700 hover:text-slate-900 hover:bg-slate-100")
      }
    >
      {children}
    </button>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
