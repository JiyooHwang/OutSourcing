import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AuditClient from "./AuditClient";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }
  return <AuditClient />;
}
