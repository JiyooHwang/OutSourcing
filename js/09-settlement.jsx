// =============================================================
// 월별 외주비 결산 탭
//   - 회차별 행 + 1월~12월 컬럼
//   - 날짜 기준: 지급완료는 paidDate, 그 외는 dueDate (없으면 제외)
//   - CSV 내보내기로 재무팀에 전달
// =============================================================

function SettlementView({ data }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [statusFilter, setStatusFilter] = useState(""); // "" = 전체 (취소 제외)

  const vendorById = useMemo(() => {
    const m = {};
    for (const v of data.vendors) m[v.id] = v;
    return m;
  }, [data.vendors]);

  const projectById = useMemo(() => {
    const m = {};
    for (const p of data.projects || []) m[p.id] = p;
    return m;
  }, [data.projects]);

  // 사용 가능한 연도 후보 (있는 데이터 기준)
  const availableYears = useMemo(() => {
    const set = new Set([currentYear]);
    for (const pay of data.payments) {
      for (const inst of pay.installments) {
        if (inst.status === "CANCELED") continue;
        const d = pickDate(inst);
        if (!d) continue;
        const y = new Date(d).getFullYear();
        if (!Number.isNaN(y)) set.add(y);
      }
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [data.payments, currentYear]);

  const rows = useMemo(() => {
    const result = [];
    for (const pay of data.payments) {
      const project = projectById[pay.projectId];
      const vendor = vendorById[pay.vendorId];
      for (const inst of pay.installments) {
        if (inst.status === "CANCELED") continue;
        if (statusFilter && inst.status !== statusFilter) continue;
        const dateStr = pickDate(inst);
        if (!dateStr) continue;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) continue;
        if (d.getFullYear() !== year) continue;

        const month = d.getMonth();
        const amt = Number(inst.amount) || 0;
        const monthly = new Array(12).fill(0);
        monthly[month] = amt;

        result.push({
          projectName: project ? project.name : pay.projectName || "(프로젝트 없음)",
          vendorName: vendor ? vendor.name : "(외주처 삭제됨)",
          manager: pay.manager || (project && project.manager) || "",
          role: pay.role || "",
          category: pay.category || "",
          installmentLabel: INSTALLMENT_LABEL[inst.type] || inst.type,
          status: inst.status,
          date: dateStr,
          monthly,
          total: amt,
          currency: pay.currency || "KRW",
        });
      }
    }
    // 프로젝트 → 외주처 → 날짜 정렬
    result.sort((a, b) => {
      if (a.projectName !== b.projectName) return a.projectName.localeCompare(b.projectName);
      if (a.vendorName !== b.vendorName) return a.vendorName.localeCompare(b.vendorName);
      return a.date.localeCompare(b.date);
    });
    return result;
  }, [data.payments, year, statusFilter, vendorById, projectById]);

  const monthlyTotals = useMemo(() => {
    const t = new Array(12).fill(0);
    for (const r of rows) for (let i = 0; i < 12; i++) t[i] += r.monthly[i];
    return t;
  }, [rows]);

  const yearTotal = useMemo(
    () => rows.reduce((s, r) => s + r.total, 0),
    [rows]
  );

  const paidTotal = useMemo(
    () => rows.filter((r) => r.status === "PAID").reduce((s, r) => s + r.total, 0),
    [rows]
  );

  const pendingTotal = useMemo(
    () =>
      rows
        .filter((r) => r.status === "PENDING" || r.status === "OVERDUE")
        .reduce((s, r) => s + r.total, 0),
    [rows]
  );

  function exportCsv() {
    const headers = [
      "프로젝트","외주처","담당자","역할","분류","회차","상태","기준일",
      "1월","2월","3월","4월","5월","6월",
      "7월","8월","9월","10월","11월","12월",
      "합계",
    ];
    const dataRows = rows.map((r) => [
      r.projectName, r.vendorName, r.manager, r.role, r.category,
      r.installmentLabel, STATUS_LABEL[r.status] || r.status,
      r.date,
      ...r.monthly,
      r.total,
    ]);
    // 월별 합계 행
    dataRows.push([
      "월별 합계","","","","","","","",
      ...monthlyTotals,
      yearTotal,
    ]);
    downloadCsv(`settlement_${year}.csv`, headers, dataRows);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">월별 외주비 결산</h2>
        <p className="text-slate-600 mt-1">
          재무팀 전달용 결산표. 지급완료는 지급일 기준, 그 외는 지급기한 기준으로 집계합니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Btn variant="secondary" small onClick={() => setYear(year - 1)}>
            ◀
          </Btn>
          <Select
            className="!w-24 text-center"
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
            {!availableYears.includes(year) && (
              <option value={year}>{year}년</option>
            )}
          </Select>
          <Btn variant="secondary" small onClick={() => setYear(year + 1)}>
            ▶
          </Btn>
        </div>
        <Select
          className="max-w-[160px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">전체 (취소 제외)</option>
          <option value="PAID">지급완료만</option>
          <option value="PENDING">미지급만</option>
          <option value="OVERDUE">연체만</option>
        </Select>
        <div className="flex-1" />
        <Btn variant="secondary" onClick={exportCsv}>
          CSV 내보내기
        </Btn>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label={`${year}년 총계`} value={formatCurrency(yearTotal)} />
        <SummaryCard label="지급완료" value={formatCurrency(paidTotal)} tone="emerald" />
        <SummaryCard label="미지급/연체" value={formatCurrency(pendingTotal)} tone="amber" />
      </div>

      <Card>
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] settlement-scroll">
          <table className="text-xs w-full min-w-max">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <Th2 sticky>프로젝트</Th2>
                <Th2>외주처</Th2>
                <Th2>담당자</Th2>
                <Th2>역할/분류</Th2>
                <Th2>회차</Th2>
                <Th2>상태</Th2>
                <Th2>기준일</Th2>
                {MONTH_LABELS.map((m) => (
                  <Th2 key={m} align="right">{m}</Th2>
                ))}
                <Th2 align="right">합계</Th2>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={20} className="text-center text-slate-500 py-10">
                    {year}년 결산 항목이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 border-b border-slate-100">
                    <Td2 sticky bold>{r.projectName}</Td2>
                    <Td2>{r.vendorName}</Td2>
                    <Td2>{r.manager || "-"}</Td2>
                    <Td2>
                      {r.role || "-"}
                      {r.category && (
                        <span className="text-slate-400"> / {r.category}</span>
                      )}
                    </Td2>
                    <Td2>{r.installmentLabel}</Td2>
                    <Td2>
                      <span
                        className={
                          "inline-block rounded px-1.5 py-0.5 text-xs font-medium " +
                          STATUS_BADGE[r.status]
                        }
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </Td2>
                    <Td2>{formatDate(r.date)}</Td2>
                    {r.monthly.map((amt, mi) => (
                      <Td2 key={mi} align="right">
                        {amt > 0 ? formatCurrency(amt, r.currency) : "-"}
                      </Td2>
                    ))}
                    <Td2 align="right" bold>
                      {formatCurrency(r.total, r.currency)}
                    </Td2>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-blue-50 sticky bottom-0">
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-2 font-semibold text-slate-800 border-t-2 border-slate-300 sticky left-0 bg-blue-50"
                  >
                    월별 합계
                  </td>
                  {monthlyTotals.map((t, i) => (
                    <td
                      key={i}
                      className="px-3 py-2 text-right font-semibold text-slate-800 border-t-2 border-slate-300 whitespace-nowrap"
                    >
                      {t > 0 ? formatCurrency(t) : "-"}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold text-slate-900 border-t-2 border-slate-300 whitespace-nowrap">
                    {formatCurrency(yearTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <div className="text-xs text-slate-500">
        ※ 집계 기준일: 지급완료 = 지급일, 미지급/연체 = 지급기한. 날짜가 없는 회차는 표에서 제외됩니다.
      </div>
    </div>
  );
}

const MONTH_LABELS = [
  "1월","2월","3월","4월","5월","6월",
  "7월","8월","9월","10월","11월","12월",
];

function pickDate(inst) {
  if (inst.status === "PAID" && inst.paidDate) return inst.paidDate;
  return inst.dueDate || "";
}

// 결산표 전용 셀 (좁고 sticky 지원). 02-ui.jsx의 Th/Td와 분리.
function Th2(props) {
  const align = props.align;
  const sticky = props.sticky;
  return (
    <th
      className={
        "px-3 py-2 font-medium text-slate-600 border-b border-slate-200 bg-slate-50 whitespace-nowrap " +
        (align === "right" ? "text-right " : "text-left ") +
        (sticky ? "sticky left-0 z-20" : "")
      }
    >
      {props.children}
    </th>
  );
}

function Td2(props) {
  const align = props.align;
  const bold = props.bold;
  const sticky = props.sticky;
  return (
    <td
      className={
        "px-3 py-2 whitespace-nowrap " +
        (align === "right" ? "text-right " : "") +
        (bold ? "font-medium " : "") +
        (sticky ? "sticky left-0 bg-white z-10" : "")
      }
    >
      {props.children}
    </td>
  );
}
