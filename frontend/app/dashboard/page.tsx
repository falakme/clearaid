import { redirect } from "next/navigation";

/** /dashboard is retired — everything lives on the unified /home page. */
export default function DashboardPage() {
  redirect("/home");
}
