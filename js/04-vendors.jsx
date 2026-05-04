// =============================================================
// 외주처 목록 / 외주처 폼
// =============================================================

const EMPTY_VENDOR = {
  name: "",
  category: "",
  contactPerson: "",
  phone: "",
  email: "",
  businessNumber: "",
  bankName: "",
  bankAccount: "",
  address: "",
  notes: "",
};

function VendorsView({ data, setData }) {
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data.vendors;
    return data.vendors.filter((v) =>
      [v.name, v.contactPerson, v.category]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(term))
    );
  }, [data.vendors, q]);

  const paymentCountByVendor = useMemo(() => {
    const map = {};
    for (const p of data.payments) {
      map[p.vendorId] = (map[p.vendorId] || 0) + 1;
    }
    return map;
  }, [data.payments]);

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(v) {
    setEditing(v);
    setShowForm(true);
  }

  function saveVendor(form) {
    if (editing) {
      setData({
        ...data,
        vendors: data.vendors.map((v) =>
          v.id === editing.id ? { ...v, ...form } : v
        ),
      });
    } else {
      setData({
        ...data,
        vendors: [
          { id: uid(), createdAt: new Date().toISOString(), ...form },
          ...data.vendors,
        ],
      });
    }
    setShowForm(false);
    setEditing(null);
  }

  function importVendors(list, overwriteDup) {
    const now = new Date().toISOString();
    const existingByName = new Map(
      data.vendors.map((v) => [(v.name || "").trim().toLowerCase(), v])
    );

    const updatedExisting = new Map();
    const toAppend = [];

    for (const incoming of list) {
      const key = incoming.name.trim().toLowerCase();
      const existing = existingByName.get(key);
      if (existing) {
        if (overwriteDup) {
          // 빈 값은 기존 값 유지, 채워진 값만 덮어씀
          const merged = { ...existing };
          for (const f of Object.keys(incoming)) {
            if (f === "isDuplicate") continue;
            if (incoming[f]) merged[f] = incoming[f];
          }
          updatedExisting.set(existing.id, merged);
        }
      } else {
        const clean = Object.assign({}, incoming);
        delete clean.isDuplicate;
        toAppend.push(Object.assign({ id: uid(), createdAt: now }, clean));
      }
    }

    setData({
      ...data,
      vendors: [
        ...toAppend,
        ...data.vendors.map((v) => updatedExisting.get(v.id) || v),
      ],
    });
    setShowImport(false);
    alert(
      `가져오기 완료: 신규 ${toAppend.length}건, 갱신 ${updatedExisting.size}건`
    );
  }

  function deleteVendor(v) {
    const count = paymentCountByVendor[v.id] || 0;
    const msg =
      count > 0
        ? `'${v.name}' 외주처를 삭제하시겠습니까? 관련 외주비 ${count}건도 함께 삭제됩니다.`
        : `'${v.name}' 외주처를 삭제하시겠습니까?`;
    if (!confirm(msg)) return;
    setData({
      ...data,
      vendors: data.vendors.filter((x) => x.id !== v.id),
      payments: data.payments.filter((p) => p.vendorId !== v.id),
    });
  }

  function exportCsv() {
    const headers = [
      "외주처명","분류","담당자","연락처","이메일","사업자등록번호",
      "은행","계좌번호","주소","메모","외주비 건수","등록일",
    ];
    const rows = filtered.map((v) => [
      v.name, v.category, v.contactPerson, v.phone, v.email, v.businessNumber,
      v.bankName, v.bankAccount, v.address, v.notes,
      paymentCountByVendor[v.id] || 0,
      v.createdAt ? v.createdAt.slice(0, 10) : "",
    ]);
    downloadCsv(`vendors_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">외주처 목록</h2>
          <p className="text-slate-600 mt-1">외주 협력업체 정보를 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={exportCsv}>CSV 내보내기</Btn>
          <Btn variant="secondary" onClick={() => setShowImport(true)}>
            엑셀 업로드
          </Btn>
          <Btn onClick={openCreate}>+ 외주처 추가</Btn>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          className="max-w-xs"
          placeholder="외주처명 / 담당자 / 분류 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>외주처명</Th>
              <Th>담당자</Th>
              <Th>연락처</Th>
              <Th>이메일</Th>
              <Th>분류</Th>
              <Th>외주비 건수</Th>
              <Th align="right">관리</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-500 py-6">
                  {data.vendors.length === 0
                    ? "등록된 외주처가 없습니다. '+ 외주처 추가' 버튼을 눌러주세요."
                    : "검색 결과가 없습니다."}
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <Td bold>{v.name}</Td>
                  <Td>{v.contactPerson || "-"}</Td>
                  <Td>{v.phone || "-"}</Td>
                  <Td>{v.email || "-"}</Td>
                  <Td>{v.category || "-"}</Td>
                  <Td>{paymentCountByVendor[v.id] || 0}</Td>
                  <Td align="right">
                    <Btn variant="secondary" small onClick={() => openEdit(v)}>편집</Btn>
                    <span className="ml-2">
                      <Btn variant="danger" small onClick={() => deleteVendor(v)}>삭제</Btn>
                    </span>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      {showForm && (
        <VendorForm
          initial={editing || EMPTY_VENDOR}
          isEdit={!!editing}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSave={saveVendor}
        />
      )}

      {showImport && (
        <VendorImportModal
          existingVendors={data.vendors}
          onCancel={() => setShowImport(false)}
          onImport={importVendors}
        />
      )}
    </div>
  );
}

function VendorForm({ initial, isEdit, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_VENDOR, ...initial }));

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("외주처명은 필수입니다.");
      return;
    }
    onSave(form);
  }

  return (
    <Modal title={isEdit ? "외주처 편집" : "외주처 추가"} onClose={onCancel}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="외주처명 *">
            <Input required value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="분류">
            <Input placeholder="예: 디자인, 개발, 번역" value={form.category} onChange={(e) => update("category", e.target.value)} />
          </Field>
          <Field label="담당자">
            <Input value={form.contactPerson} onChange={(e) => update("contactPerson", e.target.value)} />
          </Field>
          <Field label="연락처">
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </Field>
          <Field label="이메일">
            <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </Field>
          <Field label="사업자등록번호">
            <Input value={form.businessNumber} onChange={(e) => update("businessNumber", e.target.value)} />
          </Field>
          <Field label="은행">
            <Input value={form.bankName} onChange={(e) => update("bankName", e.target.value)} />
          </Field>
          <Field label="계좌번호">
            <Input value={form.bankAccount} onChange={(e) => update("bankAccount", e.target.value)} />
          </Field>
          <Field label="주소" full>
            <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
          </Field>
          <Field label="메모" full>
            <Textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="secondary" type="button" onClick={onCancel}>취소</Btn>
          <Btn type="submit">{isEdit ? "저장" : "등록"}</Btn>
        </div>
      </form>
    </Modal>
  );
}
