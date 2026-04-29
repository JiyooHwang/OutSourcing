// =============================================================
// 프로젝트 페이지 (프로젝트 탭 + 프로젝트 별 외주비 목록)
// =============================================================

function ProjectsView({ data, setData, selectedProjectId, setSelectedProjectId }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // 선택된 프로젝트가 없거나 사라졌으면 첫 프로젝트 자동 선택
  useEffect(() => {
    if (data.projects.length === 0) {
      if (selectedProjectId) setSelectedProjectId(null);
      return;
    }
    const exists = data.projects.find((p) => p.id === selectedProjectId);
    if (!exists) setSelectedProjectId(data.projects[0].id);
  }, [data.projects, selectedProjectId, setSelectedProjectId]);

  const project = useMemo(
    () => data.projects.find((p) => p.id === selectedProjectId),
    [data.projects, selectedProjectId]
  );

  const projectPayments = useMemo(
    () => data.payments.filter((pay) => pay.projectId === selectedProjectId),
    [data.payments, selectedProjectId]
  );

  const vendorById = useMemo(() => {
    const map = {};
    for (const v of data.vendors) map[v.id] = v;
    return map;
  }, [data.vendors]);

  const totalSum = useMemo(
    () => projectPayments.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0),
    [projectPayments]
  );

  function openCreateProject() {
    setEditing(null);
    setShowForm(true);
  }

  function openEditProject() {
    if (!project) return;
    setEditing(project);
    setShowForm(true);
  }

  function saveProject(form) {
    if (editing) {
      setData({
        ...data,
        projects: data.projects.map((p) =>
          p.id === editing.id ? { ...p, ...form } : p
        ),
      });
    } else {
      const newProject = {
        id: uid(),
        createdAt: new Date().toISOString(),
        ...form,
      };
      setData({ ...data, projects: [newProject, ...data.projects] });
      setSelectedProjectId(newProject.id);
    }
    setShowForm(false);
    setEditing(null);
  }

  function deleteCurrentProject() {
    if (!project) return;
    const linked = data.payments.filter((p) => p.projectId === project.id).length;
    const msg =
      linked > 0
        ? `'${project.name}' 프로젝트를 삭제하시겠습니까? 연결된 외주비 ${linked}건도 함께 삭제됩니다.`
        : `'${project.name}' 프로젝트를 삭제하시겠습니까?`;
    if (!confirm(msg)) return;
    setData({
      ...data,
      projects: data.projects.filter((p) => p.id !== project.id),
      payments: data.payments.filter((p) => p.projectId !== project.id),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">프로젝트 상세</h2>
        <p className="text-slate-600 mt-1">
          프로젝트별로 외주비 내역을 한눈에 봅니다.
        </p>
      </div>

      {/* 프로젝트 탭 */}
      <Card>
        <div className="p-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500 mr-2">프로젝트</span>
          {data.projects.length === 0 ? (
            <span className="text-sm text-slate-400">
              등록된 프로젝트가 없습니다.
            </span>
          ) : (
            data.projects.map((p) => (
              <ProjectTab
                key={p.id}
                active={p.id === selectedProjectId}
                onClick={() => setSelectedProjectId(p.id)}
              >
                {p.name}
              </ProjectTab>
            ))
          )}
        </div>
      </Card>

      {/* 액션 */}
      <div className="flex gap-2">
        <Btn onClick={openCreateProject}>+ 프로젝트 추가</Btn>
        {project && (
          <Btn variant="secondary" onClick={openEditProject}>
            현재 프로젝트 편집
          </Btn>
        )}
        {project && (
          <Btn variant="danger" onClick={deleteCurrentProject}>
            현재 프로젝트 삭제
          </Btn>
        )}
      </div>

      {/* 선택된 프로젝트 정보 */}
      {project && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-amber-700">PROJECT</span>
            <span className="text-base font-semibold text-slate-800">
              {project.name}
            </span>
          </div>
          <div>
            <div className="text-xs text-amber-700 mb-0.5">제목</div>
            <div className="text-2xl font-bold text-slate-900">{project.name}</div>
          </div>
          {project.manager && (
            <div className="text-sm text-slate-600">담당자: {project.manager}</div>
          )}
          {project.description && (
            <div className="text-sm text-slate-600">{project.description}</div>
          )}
        </div>
      )}

      {/* 프로젝트별 외주비 목록 */}
      {project && (
        <ProjectPaymentTable
          project={project}
          payments={projectPayments}
          vendorById={vendorById}
          totalSum={totalSum}
        />
      )}

      {showForm && (
        <ProjectForm
          initial={editing || EMPTY_PROJECT}
          isEdit={!!editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={saveProject}
        />
      )}
    </div>
  );
}

function ProjectTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-1.5 text-sm font-medium rounded-md transition-colors " +
        (active
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200")
      }
    >
      {children}
    </button>
  );
}

function ProjectPaymentTable({ project, payments, vendorById, totalSum }) {
  return (
    <Card>
      <Table>
        <thead>
          <tr>
            <Th wide>프로젝트</Th>
            <Th wide>담당자</Th>
            <Th wide>역할</Th>
            <Th wide>분류</Th>
            <Th wide>외주처</Th>
            <Th wide align="right">금액</Th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-slate-500 py-10">
                이 프로젝트에 등록된 외주비가 없습니다. '외주비 관리' 탭에서
                추가해주세요.
              </td>
            </tr>
          ) : (
            <Fragment>
              {payments.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-50">
                  <Td wide bold>{project.name}</Td>
                  <Td wide>{pay.manager || project.manager || "-"}</Td>
                  <Td wide>{pay.role || "-"}</Td>
                  <Td wide>{pay.category || "-"}</Td>
                  <Td wide>{vendorById[pay.vendorId]?.name || "-"}</Td>
                  <Td wide align="right">
                    {formatCurrency(pay.totalAmount, pay.currency)}
                  </Td>
                </tr>
              ))}
              <tr className="bg-blue-50">
                <td colSpan={3} className="px-4 py-4 border-b border-slate-100 align-top font-semibold text-slate-700">
                  합계
                </td>
                <td colSpan={2} className="px-4 py-4 border-b border-slate-100 align-top font-semibold text-slate-700">
                  총 합계
                </td>
                <td className="px-4 py-4 border-b border-slate-100 align-top text-right font-bold text-slate-900">
                  {formatCurrency(totalSum)}
                </td>
              </tr>
            </Fragment>
          )}
        </tbody>
      </Table>
    </Card>
  );
}

function ProjectForm({ initial, isEdit, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_PROJECT, ...initial }));

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("프로젝트명은 필수입니다.");
      return;
    }
    onSave(form);
  }

  return (
    <Modal title={isEdit ? "프로젝트 편집" : "프로젝트 추가"} onClose={onCancel}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="프로젝트명 *">
          <Input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </Field>
        <Field label="담당자">
          <Input
            value={form.manager}
            onChange={(e) => update("manager", e.target.value)}
          />
        </Field>
        <Field label="설명">
          <Input
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>
        <Field label="메모">
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="secondary" type="button" onClick={onCancel}>
            취소
          </Btn>
          <Btn type="submit">{isEdit ? "저장" : "등록"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

// 콜스팬 지원을 위해 Td를 약간 확장한 헬퍼 (간단히 inline 사용)
// Td는 colSpan을 받지 않으므로 이 파일에서만 보조 사용
