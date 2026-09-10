import BrokerSheet from "./BrokerSheet";
export default function RealEstateLayout({children}:{children:React.ReactNode}){return <>{children}<BrokerSheet supabaseUrl={process.env.SUPABASE_URL||""} publishableKey={process.env.SUPABASE_PUBLISHABLE_KEY||""}/></>}
