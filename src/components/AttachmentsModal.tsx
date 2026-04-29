"use client";

import { useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/format";

type Attachment = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedById: string | null;
  uploadedBy: { id: string; name: string | null; email: string } | null;
};

const MAX_BYTES = 25 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AttachmentsModal({
  paymentId,
  paymentLabel,
  currentUserId,
  isAdmin,
  onClose,
  onChanged,
}: {
  paymentId: string;
  paymentLabel: string;
  currentUserId: string;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/attachments`);
      if (!res.ok) throw new Error("불러오기 실패");
      setItems(await res.json());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  async function uploadFile(file: File) {
    if (file.size > MAX_BYTES) {
      alert("파일 크기는 25MB 이하여야 합니다.");
      return;
    }
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      // 1) presign
      const presignRes = await fetch(
        `/api/payments/${paymentId}/attachments/presign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || "application/octet-stream",
          }),
        }
      );
      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        throw new Error(data.error || "업로드 URL 생성 실패");
      }
      const { uploadUrl, storageKey } = await presignRes.json();

      // 2) PUT to S3 with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader(
          "Content-Type",
          file.type || "application/octet-stream"
        );
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`업로드 실패 (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("네트워크 오류"));
        xhr.send(file);
      });

      // 3) register
      const registerRes = await fetch(
        `/api/payments/${paymentId}/attachments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || "application/octet-stream",
            storageKey,
          }),
        }
      );
      if (!registerRes.ok) throw new Error("메타데이터 저장 실패");

      await load();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onDelete(a: Attachment) {
    if (!confirm(`'${a.fileName}' 을(를) 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/attachments/${a.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert("삭제 실패: " + (data.error || res.statusText));
      return;
    }
    await load();
    onChanged();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">첨부파일</h2>
              <p className="text-sm text-slate-600">{paymentLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
              }}
              disabled={uploading}
            />
            <button
              className="btn-primary w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? `업로드 중... ${progress}%`
                : "+ 파일 업로드 (최대 25MB)"}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="border-t pt-4">
            {loading ? (
              <div className="text-center text-slate-500 py-6">
                불러오는 중...
              </div>
            ) : items.length === 0 ? (
              <div className="text-center text-slate-500 py-6">
                첨부된 파일이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((a) => {
                  const canDelete =
                    isAdmin || a.uploadedById === currentUserId;
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between py-3 gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <a
                          href={`/api/attachments/${a.id}/download`}
                          className="font-medium text-slate-900 hover:text-slate-700 truncate block"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {a.fileName}
                        </a>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {formatFileSize(a.fileSize)} ·{" "}
                          {a.uploadedBy?.name ||
                            a.uploadedBy?.email ||
                            "알 수 없음"}{" "}
                          · {formatDate(a.createdAt)}
                        </div>
                      </div>
                      {canDelete && (
                        <button
                          className="btn-danger flex-shrink-0"
                          onClick={() => onDelete(a)}
                        >
                          삭제
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
