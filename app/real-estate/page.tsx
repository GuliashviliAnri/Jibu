import { Header, Sidebar } from "../page";
import PropertyWorkspace from "./PropertyWorkspace";

export const metadata = {
  title: "უძრავი ქონება | JIBU",
  description: "აღმოაჩინე შერჩეული ბინები, სახლები, კომერციული ფართები და ახალი პროექტები JIBU-ზე.",
};

export default function RealEstatePage(){
  return <div className="app-shell real-estate-shell">
    <Sidebar active="real-estate"/>
    <div className="page">
      <Header/>
      <PropertyWorkspace supabaseUrl={process.env.SUPABASE_URL||""} publishableKey={process.env.SUPABASE_PUBLISHABLE_KEY||""}/>
    </div>
  </div>;
}
