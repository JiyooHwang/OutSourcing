// =============================================================
// 외주처 엑셀/CSV 일괄 업로드
// 의존: 전역 XLSX (SheetJS, index.html에서 CDN으로 로드)
// =============================================================

// 엑셀 헤더 → vendor 필드 매핑 (대소문자 무시)
const VENDOR_HEADER_MAP = {
  // 외주처명
  "외주처명": "name", "외주처": "name", "이름": "name", "업체명": "name",
  "name": "name", "vendor": "name",
  // 담당자
  "담당자": "contactPerson", "담당": "contactPerson",
  "contact": "contactPerson", "person": "contactPerson",
  // 연락처
  "연락처": "phone", "전화": "phone", "전화번호": "phone",
  "phone": "phone", "tel": "phone", "mobile": "phone",
  // 이메일
  "이메일": "email", "메일": "email", "email": "email", "e-mail": "email",
  // 분류
  "분류": "category", "구분": "category", "카테고리": "category",
  "category": "category",
  // 사업자
  "사업자등록번호": "businessNumber", "사업자번호": "businessNumber",
  "사업자": "businessNumber", "business": "businessNumber",
  // 은행
  "은행": "bankName", "은행명": "bankName", "bank": "bankName",
  // 계좌
  "계좌번호": "bankAccount", "계좌": "bankAccount", "account": "bankAccount",
  // 주소
  "주소": "address", "address": "address",
  // 메모
  "메모": "notes", "비고": "notes", "특이사항": "notes",
  "notes": "notes", "memo": "notes", "remarks": "notes",
};

function mapExcelRowToVendor(row) {
  const result = {
    name: "", contactPerson: "", email: "", phone: "",
    businessNumber: "", address: "", category: "",
    bankName: "", bankAccount: "", notes: "",
  };
  for (const key of Object.keys(row)) {
    const headerRaw = String(key).trim();
    const headerLow = headerRaw.toLowerCase();
    const field = VENDOR_HEADER_MAP[headerRaw] || VENDOR_HEADER_MAP[headerLow];
    if (field) {
      const val = row[key];
      result[field] = val === null || val === undefined ? "" : String(val).trim();
    }
  }
  return result;
}

function VendorImportModal({ existingVendors, onCancel, onImport }) {
  const [step, setStep] = useState("select"); // select | preview
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState(null);
  const [overwriteDup, setOverwriteDup] = useState(false);
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (typeof XLSX === "undefined") {
      setError("엑셀 파서(SheetJS)가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      if (!sheet) {
        setError("시트를 찾을 수 없습니다.");
        return;
      }
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (rows.length === 0) {
        setError("데이터 행이 없습니다. 첫 행은 헤더로 사용됩니다.");
        return;
      }

      const mapped = rows.map(mapExcelRowToVendor);
      const valid = mapped.filter((v) => v.name);
      const skippedNoName = mapped.length - valid.length;

      const existingNames = new Set(
        existingVendors.map((v) => v.name.trim().toLowerCase())
      );
      const annotated = valid.map((v) => ({
        ...v,
        isDuplicate: existingNames.has(v.name.trim().toLowerCase()),
      }));

      setParsed({
        sheetName,
        totalRows: rows.length,
        skippedNoName,
        vendors: annotated,
      });
      setStep("preview");
    } catch (err) {
      console.error(err);
      setError("파일 파싱 실패: " + err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function doImport() {
    const list = overwriteDup
      ? parsed.vendors
      : parsed.vendors.filter((v) => !v.isDuplicate);
    onImport(list, overwriteDup);
  }

  function downloadTemplate() {
    const headers = [
      "외주처명","분류","담당자","연락처","이메일",
      "사업자등록번호","은행","계좌번호","주소","메모",
    ];
    const sample = [
      "예시 외주처","개발","홍길동","010-0000-0000","sample@example.com",
      "000-00-00000","국민은행","123-456-789","서울시 ...","비고",
    ];
    downloadCsv("vendor_template.csv", headers, [sample]);
  }

  const newCount = parsed
    ? parsed.vendors.filter((v) => !v.isDuplicate).length
    : 0;
  const dupCount = parsed
    ? parsed.vendors.filter((v) => v.isDuplicate).length
    : 0;

  return (
    <Modal title="엑셀로 외주처 일괄 등록" onClose={onCancel}>
      {step === "select" && (
        <div className="space-y-4">
          <div className="text-sm text-slate-600">
            엑셀(.xlsx, .xls) 또는 CSV 파일을 업로드하면 외주처를 한 번에 등록할 수 있습니다.
            첫 행은 헤더로 사용되며, 아래 항목명을 인식합니다.
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1">
            <div className="font-medium text-slate-700">자동 인식되는 헤더</div>
            <div>
              <code className="font-semibold">외주처명</code> (필수) ·
              <code> 담당자</code> · <code>연락처</code> · <code>이메일</code> ·
              <code> 분류</code> · <code>사업자등록번호</code> · <code>은행</code> ·
              <code> 계좌번호</code> · <code>주소</code> · <code>메모</code>
            </div>
            <div className="text-slate-500">
              영문(name, phone, email 등)도 인식합니다.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFile}
            />
            <Btn onClick={() => fileRef.current?.click()}>파일 선택</Btn>
            <Btn variant="secondary" onClick={downloadTemplate}>
              샘플 CSV 다운로드
            </Btn>
          </div>

          {error && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {step === "preview" && parsed && (
        <div className="space-y-4">
          <div className="text-sm text-slate-600">
            시트 <strong>{parsed.sheetName}</strong>에서{" "}
            <strong>{parsed.vendors.length}</strong>개 외주처 인식
            {parsed.skippedNoName > 0 && (
              <span className="text-slate-500">
                {" "}(외주처명 없는 {parsed.skippedNoName}건은 제외)
              </span>
            )}
          </div>

          <div className="flex gap-4 text-sm">
            <span className="text-emerald-700">신규 {newCount}건</span>
            <span className="text-amber-700">중복 {dupCount}건</span>
          </div>

          {dupCount > 0 && (
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={overwriteDup}
                onChange={(e) => setOverwriteDup(e.target.checked)}
              />
              중복된 외주처도 덮어쓰기 (같은 이름은 새 정보로 갱신)
            </label>
          )}

          <div className="border border-slate-200 rounded max-h-80 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-600 sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">외주처명</th>
                  <th className="px-2 py-1.5 text-left font-medium">담당자</th>
                  <th className="px-2 py-1.5 text-left font-medium">연락처</th>
                  <th className="px-2 py-1.5 text-left font-medium">분류</th>
                  <th className="px-2 py-1.5 text-left font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {parsed.vendors.map((v, i) => (
                  <tr
                    key={i}
                    className={
                      "border-t border-slate-100 " +
                      (v.isDuplicate ? "bg-amber-50 text-slate-500" : "")
                    }
                  >
                    <td className="px-2 py-1 font-medium">{v.name}</td>
                    <td className="px-2 py-1">{v.contactPerson || "-"}</td>
                    <td className="px-2 py-1">{v.phone || "-"}</td>
                    <td className="px-2 py-1">{v.category || "-"}</td>
                    <td className="px-2 py-1">
                      {v.isDuplicate ? (
                        <span className="text-amber-700">중복</span>
                      ) : (
                        <span className="text-emerald-700">신규</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="secondary" type="button" onClick={() => setStep("select")}>
              ← 다른 파일
            </Btn>
            <Btn variant="secondary" type="button" onClick={onCancel}>
              취소
            </Btn>
            <Btn
              type="button"
              onClick={doImport}
              disabled={overwriteDup ? parsed.vendors.length === 0 : newCount === 0}
            >
              {overwriteDup
                ? `${parsed.vendors.length}건 가져오기`
                : `${newCount}건 가져오기`}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}
