import {Header,Sidebar} from "../page";
import BusinessWorkspace from "./BusinessWorkspace";
export const metadata={title:"ბიზნესი | JIBU",description:"აღმოაჩინე კომპანიები, პარტნიორები და ბიზნეს შესაძლებლობები JIBU-ზე."};
export default function BusinessPage(){return <div className="app-shell"><Sidebar active="business"/><div className="page"><Header/><BusinessWorkspace/></div></div>}
