import {Header,Sidebar} from "../page";
import ServicesWorkspace from "./ServicesWorkspace";
export const metadata={title:"სერვისები | JIBU",description:"იპოვე სანდო პროფესიონალი და შეუკვეთე მომსახურება JIBU-ზე."};
export default function ServicesPage(){return <div className="app-shell"><Sidebar active="services"/><div className="page"><Header/><ServicesWorkspace/></div></div>}
