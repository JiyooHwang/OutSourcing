import { auth } from "@/auth";
import PaymentsClient from "./PaymentsClient";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  return <PaymentsClient isAdmin={isAdmin} />;
}
