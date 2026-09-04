import {Header,Sidebar} from "../page";
import CommunityWorkspace from "./CommunityWorkspace";
export const metadata={title:"საზოგადოება | JIBU",description:"ადამიანები, თემები და ადგილობრივი კავშირები JIBU-ზე."};
export default function CommunityPage(){return <div className="app-shell"><Sidebar active="community"/><div className="page"><Header/><CommunityWorkspace/></div></div>}
