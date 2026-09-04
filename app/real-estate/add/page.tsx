import {Header,Sidebar} from "../../page";
import AddListingForm from "./AddListingForm";
import { AuthGate } from "../../auth-client";
export const metadata={title:"განცხადების დადება | JIBU"};
export default function AddListingPage(){return <div className="app-shell real-estate-shell"><Sidebar active="real-estate"/><div className="page"><Header/><AuthGate><AddListingForm supabaseUrl={process.env.SUPABASE_URL||""} publishableKey={process.env.SUPABASE_PUBLISHABLE_KEY||""}/></AuthGate></div></div>}
