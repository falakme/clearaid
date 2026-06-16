import { redirect } from "next/navigation";

/** /emergency is retired — everything lives on the unified /home page. */
export default function EmergencyPage() {
  redirect("/home");
}
