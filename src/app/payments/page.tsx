import { auth } from "@/auth";
import PaymentsClient from "./PaymentsClient";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const userId = session?.user?.id ?? "";
  return <PaymentsClient isAdmin={isAdmin} currentUserId={userId} />;
}
