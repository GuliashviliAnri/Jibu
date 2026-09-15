import {Header,Sidebar} from "../page";
import MapWorkspace from "../real-estate/map/MapWorkspace";

export default function MapPage(){
 return <div className="app-shell"><Sidebar active="map"/><div className="page"><Header/><MapWorkspace supabaseUrl={process.env.SUPABASE_URL||""} publishableKey={process.env.SUPABASE_PUBLISHABLE_KEY||""}/></div></div>
}
