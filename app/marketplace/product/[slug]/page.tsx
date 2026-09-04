import {notFound} from "next/navigation";
import {Header,Sidebar} from "../../../page";
import {marketProducts} from "../../data";
import ProductDetail from "./ProductDetail";
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const product=marketProducts.find(p=>p.id===slug);if(!product)notFound();return <div className="app-shell"><Sidebar active="marketplace"/><div className="page"><Header/><ProductDetail product={product}/></div></div>}
