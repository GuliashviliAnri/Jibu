"use client";
import {useEffect,useState} from "react";
import {activateBrokerAccess,brokerAccessExpiry,useAuth,requireUser} from "../../auth-client";
export default function VipBrokerActivation(){
 const {user}=useAuth();
 const[expires,setExpires]=useState(0),[busy,setBusy]=useState(false);
 useEffect(()=>setExpires(user?brokerAccessExpiry(user.id):0),[user]);
 const activate=async()=>{setBusy(true);const verified=await requireUser("/real-estate/vip-broker");if(verified){setExpires(activateBrokerAccess(verified.id));window.dispatchEvent(new Event("jibu:subscription"));}setBusy(false)};
 const daysLeft=Math.max(0,Math.ceil((expires-Date.now())/86400000));
 return user&&expires>Date.now()?<div className="vip-active-state"><b>VIP Broker აქტიურია · დარჩა {daysLeft} დღე</b><a href="/real-estate">ქონების გვერდზე დაბრუნება</a></div>:<div className="vip-activate"><button disabled={busy} onClick={activate}>{busy?"ანგარიშის შემოწმება…":"VIP Broker-ის გააქტიურება"}</button><small>19.99 ₾ · წვდომა აქტიურდება 30 დღით</small></div>;
}
