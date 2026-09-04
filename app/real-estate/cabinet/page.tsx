import {Header,Sidebar} from "../../page";
import CabinetWorkspace from "./CabinetWorkspace";
import { AuthGate } from "../../auth-client";
export const metadata={title:"ჩემი განცხადებები | JIBU"};
export default function Cabinet(){return <div className="app-shell real-estate-shell"><Sidebar active="real-estate"/><div className="page"><Header/><AuthGate><CabinetWorkspace supabaseUrl={process.env.SUPABASE_URL||""} publishableKey={process.env.SUPABASE_PUBLISHABLE_KEY||""}/></AuthGate></div></div>}
