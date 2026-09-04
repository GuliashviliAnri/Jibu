import AccountClient from "./AccountClient";
export const dynamic = "force-dynamic";
export default function AccountPage(){return <AccountClient url={process.env.SUPABASE_URL??""} publishableKey={process.env.SUPABASE_PUBLISHABLE_KEY??""}/>}
