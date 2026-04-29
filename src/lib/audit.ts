import type { Session } from "next-auth";
import { Prisma, type AuditAction, type AuditEntity } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logAudit(opts: {
  session: Session | null;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  summary: string;
  changes?: unknown;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: opts.session?.user?.id ?? null,
        actorEmail: opts.session?.user?.email ?? "unknown",
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        summary: opts.summary,
        changes: opts.changes
          ? (JSON.parse(JSON.stringify(opts.changes)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  } catch (e) {
    // 감사 로그 실패가 본 작업을 막아선 안 됨
    console.error("Audit log failed:", e);
  }
}

export function diffChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) {
    const a = after[key];
    if (a === undefined) continue;
    const b = before[key];
    const norm = (v: unknown) =>
      v instanceof Date ? v.toISOString() : v ?? null;
    if (JSON.stringify(norm(b)) !== JSON.stringify(norm(a))) {
      changes[key] = { from: norm(b), to: norm(a) };
    }
  }
  return changes;
}
