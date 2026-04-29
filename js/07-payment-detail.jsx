// =============================================================
// 프로젝트 별 외주비 상세 페이지
// =============================================================

function PaymentDetailView({ data, setData, paymentId, onBack }) {
  const [showForm, setShowForm] = useState(false);
  const payment = data.payments.find((p) => p.id === paymentId);
  const vendor = payment ? data.vendors.find((v) => v.id === payment.vendorId) : null;

  if (!payment) {
    return (
      <div className="space-y-4">
        <Btn variant="secondary" onClick={onBack}>← 목록으로</Btn>
        <Card>
          <div className="p-8 text-center text-slate-500">
            프로젝트를 찾을 수 없습니다. 삭제되었을 수 있습니다.
          </div>
        </Card>
      </div>
    );
  }

  const totals = useMemo(() => {
    const t = { paid: 0, pending: 0, overdue: 0, canceled: 0 };
    for (const inst of payment.installments) {
      const amt = Number(inst.amount) || 0;
      if (inst.status === "PAID")          t.paid     += amt;
      else if (inst.status === "PENDING")  t.pending  += amt;
      else if (inst.status === "OVERDUE")  t.overdue  += amt;
      else if (inst.status === "CANCELED") t.canceled += amt;
    }
    return t;
  }, [payment]);

  const installmentSum = totals.paid + totals.pending + totals.overdue + totals.canceled;
  const sumDiff = (Number(payment.totalAmount) || 0) - installmentSum;

  function updateInstallment(idx, key, value) {
    const next = payment.installments.map((inst, i) =>
      i === idx ? { ...inst, [key]: value } : inst
    );
    setData({
      ...data,
      payments: data.payments.map((p) =>
        p.id === payment.id ? { ...p, installments: next } : p
      ),
    });
  }

  function markPaid(idx) {
    const today = new Date().toISOString().slice(0, 10);
    const next = payment.installments.map((inst, i) =>
      i === idx
        ? { ...inst, status: "PAID", paidDate: inst.paidDate || today }
        : inst
    );
    setData({
      ...data,
      payments: data.payments.map((p) =>
        p.id === payment.id ? { ...p, installments: next } : p
      ),
    });
  }

  function deletePayment() {
    if (!confirm(`'${payment.projectName}' 외주비를 삭제하시겠습니까?`)) return;
    setData({
      ...data,
      payments: data.payments.filter((p) => p.id !== payment.id),
    });
    onBack();
  }

  function savePayment(form) {
    setData({
      ...data,
      payments: data.payments.map((p) =>
        p.id === payment.id ? { ...p, ...form } : p
      ),
    });
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Btn variant="secondary" onClick={onBack}>← 목록으로</Btn>
          <div>
            <div className="text-sm text-slate-500">{vendor?.name || "(외주처 삭제됨)"}</div>
            <h2 className="text-2xl font-bold">{payment.projectName}</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => setShowForm(true)}>편집</Btn>
          <Btn variant="danger" onClick={deletePayment}>삭제</Btn>
        </div>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="외주비 총액" value={formatCurrency(payment.totalAmount, payment.currency)} />
        <SummaryCard label="지급완료" value={formatCurrency(totals.paid, payment.currency)} tone="emerald" />
        <SummaryCard label="미지급" value={formatCurrency(totals.pending, payment.currency)} tone="amber" />
        <SummaryCard label="연체" value={formatCurrency(totals.overdue, payment.currency)} tone="red" />
      </div>

      {/* 프로젝트 정보 */}
      {(payment.description || payment.notes) && (
        <Card>
          <div className="p-5 space-y-3">
            {payment.description && (
              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">설명</div>
                <div className="text-sm text-slate-700">{payment.description}</div>
              </div>
            )}
            {payment.notes && (
              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">메모</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{payment.notes}</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 회차 테이블 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">지급 회차</h3>
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>회차</Th>
                <Th align="right">금액</Th>
                <Th>상태</Th>
                <Th>지급기한</Th>
                <Th>지급일</Th>
                <Th align="right">관리</Th>
              </tr>
            </thead>
            <tbody>
              {payment.installments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500 py-6">
                    등록된 회차가 없습니다. '편집'으로 회차를 추가하세요.
                  </td>
                </tr>
              ) : (
                payment.installments.map((inst, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <Td bold>{INSTALLMENT_LABEL[inst.type]}</Td>
                    <Td align="right">{formatCurrency(inst.amount, payment.currency)}</Td>
                    <Td>
                      <Select
                        value={inst.status}
                        onChange={(e) => updateInstallment(idx, "status", e.target.value)}
                        className="max-w-[120px]"
                      >
                        <option value="PENDING">미지급</option>
                        <option value="PAID">지급완료</option>
                        <option value="OVERDUE">연체</option>
                        <option value="CANCELED">취소</option>
                      </Select>
                    </Td>
                    <Td>
                      <Input
                        type="date"
                        value={inst.dueDate}
                        onChange={(e) => updateInstallment(idx, "dueDate", e.target.value)}
                        className="max-w-[160px]"
                      />
                    </Td>
                    <Td>
                      <Input
                        type="date"
                        value={inst.paidDate}
                        onChange={(e) => updateInstallment(idx, "paidDate", e.target.value)}
                        className="max-w-[160px]"
                      />
                    </Td>
                    <Td align="right">
                      {inst.status !== "PAID" && (
                        <Btn variant="secondary" small onClick={() => markPaid(idx)}>
                          지급완료
                        </Btn>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>

        {/* 합계 검증 */}
        <div className="mt-2 text-sm text-slate-600 flex items-center justify-between flex-wrap gap-2">
          <span>
            회차 합계: <strong>{formatCurrency(installmentSum, payment.currency)}</strong>
            {" / 총액 "}{formatCurrency(payment.totalAmount, payment.currency)}
          </span>
          {Math.abs(sumDiff) > 0.01 && (
            <span className="text-amber-700 text-xs">
              {sumDiff > 0
                ? `부족 ${formatCurrency(sumDiff, payment.currency)}`
                : `초과 ${formatCurrency(-sumDiff, payment.currency)}`}
            </span>
          )}
        </div>
      </div>

      {/* 외주처 정보 */}
      {vendor && (
        <div>
          <h3 className="text-lg font-semibold mb-3">외주처 정보</h3>
          <Card>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <InfoRow label="외주처명" value={vendor.name} />
              <InfoRow label="분류" value={vendor.category} />
              <InfoRow label="담당자" value={vendor.contactPerson} />
              <InfoRow label="연락처" value={vendor.phone} />
              <InfoRow label="이메일" value={vendor.email} />
              <InfoRow label="사업자등록번호" value={vendor.businessNumber} />
              <InfoRow label="은행" value={vendor.bankName} />
              <InfoRow label="계좌번호" value={vendor.bankAccount} />
            </div>
          </Card>
        </div>
      )}

      {showForm && (
        <PaymentForm
          vendors={data.vendors}
          initial={payment}
          isEdit={true}
          onCancel={() => setShowForm(false)}
          onSave={savePayment}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex">
      <div className="w-32 text-slate-500">{label}</div>
      <div className="flex-1 text-slate-800">{value || "-"}</div>
    </div>
  );
}
