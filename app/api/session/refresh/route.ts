export async function POST(request:Request){
 const headers={"Cache-Control":"no-store"};const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return Response.json({error:"Auth unavailable"},{status:503,headers});
 try{const body=await request.json(),refreshToken=typeof body?.refresh_token==="string"?body.refresh_token:"";
  if(!refreshToken||refreshToken.length>4096)return Response.json({error:"Invalid refresh token"},{status:400,headers});
  const response=await fetch(`${url.replace(/\/$/,"")}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:refreshToken}),signal:AbortSignal.timeout(10000)});
  const result=await response.json();if(!response.ok||!result.access_token)return Response.json({error:"Session expired"},{status:401,headers});
  return Response.json(result,{headers});
 }catch{return Response.json({error:"Auth unavailable"},{status:503,headers})}
}
