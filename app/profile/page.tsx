import { Header, Sidebar } from "../page";
import { AuthGate } from "../auth-client";
import ProfileDashboard from "./ProfileDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "ჩემი კაბინეტი | JIBU" };

export default function ProfilePage() {
  return <div className="app-shell"><Sidebar/><div className="page"><Header/><AuthGate><ProfileDashboard supabaseUrl={process.env.SUPABASE_URL ?? ""} publishableKey={process.env.SUPABASE_PUBLISHABLE_KEY ?? ""}/></AuthGate></div></div>;
}
