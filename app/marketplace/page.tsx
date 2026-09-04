import {Header,Sidebar} from "../page";
import MarketplaceWorkspace from "./MarketplaceWorkspace";
export default function MarketplacePage(){return <div className="app-shell"><Sidebar active="marketplace"/><div className="page"><Header/><MarketplaceWorkspace/></div></div>}
