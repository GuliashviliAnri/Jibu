"use client";
import { useBrokerAccess } from "../../../auth-client";

type PropertyForSheet={title:string;deal:string;area:string;phone:string;location:string;price:string;floor:string};

export default function AddToBrokerSheet({property}:{property:PropertyForSheet}){
 const allowed = useBrokerAccess();
 return <button className="detail-excel-button" aria-disabled={!allowed} title={!allowed ? "საჭიროა აქტიური VIP Broker" : "ცხრილში დამატება"} onClick={()=>{if(allowed)window.dispatchEvent(new CustomEvent("jibu:add-property",{detail:property}))}}>
  <span>＋</span> ექსელში ჩამატება
 </button>
}
