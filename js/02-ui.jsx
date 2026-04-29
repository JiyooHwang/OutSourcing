// =============================================================
// 공용 UI 컴포넌트 (Button, Input, Modal, Table 등)
// =============================================================

function Card({ children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      {children}
    </div>
  );
}

function Table({ children }) {
  return <table className="w-full text-sm">{children}</table>;
}

function Th({ children, align }) {
  return (
    <th
      className={
        "px-3 py-2 font-medium text-slate-600 border-b border-slate-200 bg-slate-50 " +
        (align === "right" ? "text-right" : "text-left")
      }
    >
      {children}
    </th>
  );
}

function Td({ children, align, bold }) {
  return (
    <td
      className={
        "px-3 py-2 border-b border-slate-100 align-middle " +
        (align === "right" ? "text-right" : "") +
        (bold ? " font-medium" : "")
      }
    >
      {children}
    </td>
  );
}

function Field({ label, full, children }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 " +
        className
      }
      {...props}
    />
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 " +
        className
      }
      {...props}
    />
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      className={
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 " +
        className
      }
      {...props}
    >
      {children}
    </select>
  );
}

function Btn({ children, variant = "primary", small, type = "button", className = "", ...props }) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const size = small ? "px-2.5 py-1 text-xs" : "px-3 py-2 text-sm";
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    secondary: "bg-white text-slate-900 border border-slate-300 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      type={type}
      className={`${base} ${size} ${styles[variant] || styles.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
