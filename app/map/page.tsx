import {Header,Sidebar} from "../page";
import MapWorkspace from "../real-estate/map/MapWorkspace";

export default function MapPage(){
 return <div className="app-shell"><Sidebar active="map"/><div className="page"><Header/><MapWorkspace/></div></div>
}
