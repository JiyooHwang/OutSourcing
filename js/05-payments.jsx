// =============================================================
// 외주비 관리 / 외주비 폼 (선금/중도금/잔금 분할 결제)
// =============================================================

const EMPTY_PAYMENT = {
  vendorId: "",
  projectName: "",
  description: "",
  totalAmount: "",
  currency: "KRW",
  notes: "",
  installments: [makeInstallment("FINAL")],
};

function PaymentsView({ data, setData }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const vendorById = useMemo(() => {
    const map = {};
    for (const v of data.vendors) map[v.id] = v;
    return map;
  }, [data.vendors]);

  const filtered = useMemo(() => {
    return data.payments
      .filter((p) => !vendorFilter || p.vendorId === vendorFilter)
      .filter((p) => !statusFilter || p.installments.some((i) => i.status === statusFilter))
      .slice()
      .sort((a, b) => {
        // 가장 가까운 미지급 회차의 dueDate 기준 오름차순
        const aNext = nextDue(a);
        const bNext = nextDue(b);
        if (aNext !== bNext) return aNext.localeCompare(bNext);
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
  }, [data.payments, statusFilter, vendorFilter]);

  const totals = useMemo(() => {
    const t = { pending: 0, paid: 0, overdue: 0, total: 0 };
    for (const p of filtered) {
      t.total += Number(p.totalAmount) || 0;
      for (const inst of p.installments) {
        const amt = Number(inst.amount) || 0;
        if (inst.status === "PENDING") t.pending += amt;
        else if (inst.status === "PAID") t.paid += amt;
        else if (inst.status === "OVERDUE") t.overdue += amt;
      }
    }
    return t;
  }, [filtered]);

  function openCreate() {
    if (data.vendors.length === 0) {
      alert("먼저 외주처를 등록해주세요.");
      return;
    }
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(p) {
    setEditing(p);
    setShowForm(true);
  }

  function savePayment(form) {
    if (editing) {
      setData({
        ...data,
        payments: data.payments.map((p) =>
          p.id === editing.id ? { ...p, ...form } : p
        ),
      });
    } else {
      setData({
        ...data,
        payments: [
          { id: uid(), createdAt: new Date().toISOString(), ...form },
          ...data.payments,
        ],
      });
    }
    setShowForm(false);
    setEditing(null);
  }

  function deletePayment(p) {
    if (!confirm(`'${p.projectName}' 외주비를 삭제하시겠습니까?`)) return;
    setData({
      ...data,
      payments: data.payments.filter((x) => x.id !== p.id),
    });
  }

  function markNextPaid(p) {
    const idx = p.installments.findIndex(
      (i) => i.status === "PENDING" || i.status === "OVERDUE"
    );
    if (idx < 0) {
      alert("지급할 회차가 없습니다.");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const nextInstallments = p.installments.map((inst, i) =>
      i === idx ? { ...inst, status: "PAID", paidDate: today } : inst
    );
    setData({
      ...data,
      payments: data.payments.map((x) =>
        x.id === p.id ? { ...x, installments: nextInstallments } : x
      ),
    });
  }

  function exportCsv() {
    const headers = [
      "외주처","프로젝트","총액","통화","회차","회차금액","상태",
      "지급기한","지급일","설명","메모","등록일",
    ];
    const rows = [];
    for (const p of filtered) {
      const vendorName = vendorById[p.vendorId]?.name || "(삭제됨)";
      for (const inst of p.installments) {
        rows.push([
          vendorName, p.projectName, p.totalAmount, p.currency,
          INSTALLMENT_LABEL[inst.type], inst.amount, STATUS_LABEL[inst.status],
          inst.dueDate, inst.paidDate, p.description, p.notes,
          p.createdAt ? p.createdAt.slice(0, 10) : "",
        ]);
      }
    }
    downloadCsv(`payments_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">외주비 관리</h2>
          <p className="text-slate-600 mt-1">선금·중도금·잔금 분할 지급을 추적합니다.</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={exportCsv}>CSV 내보내기</Btn>
          <Btn onClick={openCreate}>+ 외주비 추가</Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <SummaryCard label="계약 총액 (필터 기준)" value={formatCurrency(totals.total)} />
        <SummaryCard label="미지급 합계" value={formatCurrency(totals.pending)} tone="amber" />
        <SummaryCard label="지급완료 합계" value={formatCurrency(totals.paid)} tone="emerald" />
        <SummaryCard label="연체 합계" value={formatCurrency(totals.overdue)} tone="red" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select className="max-w-xs" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
          <option value="">전체 외주처</option>
          {data.vendors.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </Select>
        <Select className="max-w-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">전체 상태</option>
          <option value="PENDING">미지급</option>
          <option value="PAID">지급완료</option>
          <option value="OVERDUE">연체</option>
          <option value="CANCELED">취소</option>
        </Select>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>외주처</Th>
              <Th>프로젝트</Th>
              <Th align="right">총액</Th>
              <Th>지급 진행</Th>
              <Th>다음 지급예정</Th>
              <Th align="right">관리</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-slate-500 py-6">
                  {data.payments.length === 0
                    ? "등록된 외주비가 없습니다. '+ 외주비 추가' 버튼을 눌러주세요."
                    : "필터에 해당하는 외주비가 없습니다."}
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const next = p.installments.find(
                  (i) => i.status === "PENDING" || i.status === "OVERDUE"
                );
                const paidCount = p.installments.filter((i) => i.status === "PAID").length;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 align-top">
                    <Td bold>{vendorById[p.vendorId]?.name || "(삭제됨)"}</Td>
                    <Td>
                      <div>{p.projectName}</div>
                      {p.description && (
                        <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>
                      )}
                    </Td>
                    <Td align="right">{formatCurrency(p.totalAmount, p.currency)}</Td>
                    <Td>
                      <div className="text-xs text-slate-500 mb-1">
                        {paidCount}/{p.installments.length} 회차 지급
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.installments.map((inst, i) => (
                          <span
                            key={i}
                            className={
                              "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium " +
                              STATUS_BADGE[inst.status]
                            }
                            title={`${INSTALLMENT_LABEL[inst.type]}: ${formatCurrency(inst.amount, p.currency)} · ${STATUS_LABEL[inst.status]}${inst.dueDate ? ` · 기한 ${formatDate(inst.dueDate)}` : ""}${inst.paidDate ? ` · 지급 ${formatDate(inst.paidDate)}` : ""}`}
                          >
                            {INSTALLMENT_LABEL[inst.type]} {formatCurrency(inst.amount, p.currency)}
                          </span>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      {next ? (
                        <div>
                          <div>{INSTALLMENT_LABEL[next.type]}</div>
                          <div className="text-xs text-slate-500">
                            {next.dueDate ? formatDate(next.dueDate) : "기한 미정"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">완료</span>
                      )}
                    </Td>
                    <Td align="right">
                      {next && (
                        <Btn variant="secondary" small onClick={() => markNextPaid(p)}>
                          다음 회차 지급
                        </Btn>
                      )}
                      <span className="ml-2">
                        <Btn variant="secondary" small onClick={() => openEdit(p)}>편집</Btn>
                      </span>
                      <span className="ml-2">
                        <Btn variant="danger" small onClick={() => deletePayment(p)}>삭제</Btn>
                      </span>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </Card>

      {showForm && (
        <PaymentForm
          vendors={data.vendors}
          initial={editing || { ...EMPTY_PAYMENT, vendorId: data.vendors[0]?.id || "" }}
          isEdit={!!editing}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSave={savePayment}
        />
      )}
    </div>
  );
}

// 정렬용: 가장 가까운 미지급/연체 회차의 dueDate (없으면 9999)
function nextDue(p) {
  for (const inst of p.installments) {
    if (inst.status === "PENDING" || inst.status === "OVERDUE") {
      return inst.dueDate || "9999";
    }
  }
  return "9999";
}

function PaymentForm({ vendors, initial, isEdit, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_PAYMENT, ...initial }));

  const installmentSum = useMemo(
    () => form.installments.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [form.installments]
  );
  const total = Number(form.totalAmount) || 0;
  const sumDiff = total - installmentSum;

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyPreset(preset) {
    const t = Number(form.totalAmount) || 0;
    const last = preset.types.length - 1;
    let acc = 0;
    const installments = preset.types.map((type, i) => {
      const amt =
        i === last
          ? Math.max(0, t - acc) // 잔금: 누적 보정
          : Math.round(t * preset.ratios[i]);
      acc += amt;
      const existing = form.installments.find((x) => x.type === type);
      return existing
        ? { ...existing, amount: amt }
        : makeInstallment(type, amt);
    });
    setForm((f) => ({ ...f, installments }));
  }

  function toggleType(type) {
    const exists = form.installments.find((i) => i.type === type);
    if (exists) {
      setForm((f) => ({
        ...f,
        installments: f.installments.filter((i) => i.type !== type),
      }));
    } else {
      const next = [...form.installments, makeInstallment(type)];
      next.sort(
        (a, b) => INSTALLMENT_TYPES.indexOf(a.type) - INSTALLMENT_TYPES.indexOf(b.type)
      );
      setForm((f) => ({ ...f, installments: next }));
    }
  }

  function updateInstallment(type, key, value) {
    setForm((f) => ({
      ...f,
      installments: f.installments.map((i) =>
        i.type === type ? { ...i, [key]: value } : i
      ),
    }));
  }

  function distributeEvenly() {
    const t = Number(form.totalAmount) || 0;
    const n = form.installments.length;
    if (n === 0) return;
    const base = Math.floor(t / n);
    setForm((f) => ({
      ...f,
      installments: f.installments.map((inst, i) => ({
        ...inst,
        amount: i === n - 1 ? t - base * (n - 1) : base,
      })),
    }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.vendorId) { alert("외주처를 선택해주세요."); return; }
    if (!form.projectName.trim()) { alert("프로젝트명은 필수입니다."); return; }
    if (form.installments.length === 0) { alert("최소 1회차 이상 등록해주세요."); return; }
    if (Math.abs(sumDiff) > 0.01) {
      const msg = `회차 합계(${formatCurrency(installmentSum, form.currency)})가 총액(${formatCurrency(total, form.currency)})과 다릅니다. 그대로 저장할까요?`;
      if (!confirm(msg)) return;
    }
    onSave({
      ...form,
      totalAmount: total,
      installments: form.installments.map((i) => ({
        ...i,
        amount: Number(i.amount) || 0,
      })),
    });
  }

  return (
    <Modal title={isEdit ? "외주비 편집" : "외주비 추가"} onClose={onCancel}>
      <form onSubmit={submit} className="space-y-5">
        {/* 기본 정보 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="외주처 *">
            <Select required value={form.vendorId} onChange={(e) => update("vendorId", e.target.value)}>
              <option value="">선택</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="프로젝트명 *">
            <Input required value={form.projectName} onChange={(e) => update("projectName", e.target.value)} />
          </Field>
          <Field label="외주비 총액 *">
            <Input
              type="number" min="0" step="1" required
              value={form.totalAmount}
              onChange={(e) => update("totalAmount", e.target.value)}
            />
          </Field>
          <Field label="통화">
            <Select value={form.currency} onChange={(e) => update("currency", e.target.value)}>
              <option value="KRW">KRW</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="JPY">JPY</option>
              <option value="CNY">CNY</option>
            </Select>
          </Field>
          <Field label="설명" full>
            <Input value={form.description} onChange={(e) => update("description", e.target.value)} />
          </Field>
        </div>

        {/* 분할 결제 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h4 className="font-semibold text-slate-800">지급 회차</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                선금/중도금/잔금을 선택하고 금액·기한을 입력하세요.
              </p>
            </div>
            <Btn variant="secondary" small onClick={distributeEvenly}>균등 분할</Btn>
          </div>

          {/* 프리셋 */}
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map((p) => (
              <Btn key={p.key} variant="secondary" small onClick={() => applyPreset(p)}>
                {p.label}
              </Btn>
            ))}
          </div>

          {/* 타입 토글 */}
          <div className="flex gap-4 mb-3">
            {INSTALLMENT_TYPES.map((type) => {
              const enabled = !!form.installments.find((i) => i.type === type);
              return (
                <label key={type} className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={enabled} onChange={() => toggleType(type)} />
                  {INSTALLMENT_LABEL[type]}
                </label>
              );
            })}
          </div>

          {/* 회차별 입력 */}
          {form.installments.length === 0 ? (
            <div className="text-sm text-slate-500 py-2">회차를 1개 이상 선택하세요.</div>
          ) : (
            <div className="space-y-3">
              {form.installments.map((inst) => (
                <div key={inst.type} className="border border-slate-200 rounded-md p-3 bg-slate-50">
                  <div className="text-sm font-medium text-slate-700 mb-2">
                    {INSTALLMENT_LABEL[inst.type]}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="금액">
                      <Input
                        type="number" min="0" step="1"
                        value={inst.amount}
                        onChange={(e) => updateInstallment(inst.type, "amount", e.target.value)}
                      />
                    </Field>
                    <Field label="지급기한">
                      <Input
                        type="date"
                        value={inst.dueDate}
                        onChange={(e) => updateInstallment(inst.type, "dueDate", e.target.value)}
                      />
                    </Field>
                    <Field label="상태">
                      <Select
                        value={inst.status}
                        onChange={(e) => updateInstallment(inst.type, "status", e.target.value)}
                      >
                        <option value="PENDING">미지급</option>
                        <option value="PAID">지급완료</option>
                        <option value="OVERDUE">연체</option>
                        <option value="CANCELED">취소</option>
                      </Select>
                    </Field>
                    <Field label="지급일">
                      <Input
                        type="date"
                        value={inst.paidDate}
                        onChange={(e) => updateInstallment(inst.type, "paidDate", e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 합계 검증 */}
          <div className="mt-3 text-sm flex items-center justify-between flex-wrap gap-2">
            <span className="text-slate-600">
              회차 합계: <strong>{formatCurrency(installmentSum, form.currency)}</strong>
              {" / 총액 "}{formatCurrency(total, form.currency)}
            </span>
            {Math.abs(sumDiff) > 0.01 && (
              <span className="text-amber-700 text-xs">
                {sumDiff > 0
                  ? `부족 ${formatCurrency(sumDiff, form.currency)}`
                  : `초과 ${formatCurrency(-sumDiff, form.currency)}`}
              </span>
            )}
          </div>
        </div>

        <Field label="메모">
          <Textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="secondary" type="button" onClick={onCancel}>취소</Btn>
          <Btn type="submit">{isEdit ? "저장" : "등록"}</Btn>
        </div>
      </form>
    </Modal>
  );
}
