// Explicit Development metadata-only capture. Existing migration bytes stay untouched.
import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {pool} from "../../lib/db/src/index.ts";
import {readSchema} from "../external-postgres/schema-reference.mjs";
const names=["global_exchange_catalog","global_exchange_catalog_links"];
process.chdir(new URL("../../",import.meta.url).pathname);
try {
 const identity=(await pool.query("SELECT current_database() AS db,current_user AS actor")).rows[0];
 if(identity.db!=="heliumdb" || identity.actor!=="postgres")throw Error("Only Development metadata capture is approved.");
 const metadata=(await pool.query(`SELECT c.relname AS name,c.relrowsecurity AS enabled,c.relforcerowsecurity AS forced,
  (SELECT jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'using',pg_get_expr(p.polqual,p.polrelid),
  'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname) FROM pg_policy p WHERE p.polrelid=c.oid) AS policies
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1) ORDER BY c.relname`,[names])).rows;
 if(metadata.length!==2 || metadata.some(t=>!t.enabled || !t.forced || t.policies.length!==2))throw Error("Incomplete catalog RLS.");
 const rls=JSON.parse(await readFile("deploy/migrations/rls-reference.json","utf8"));
 rls.tables=[...rls.tables.filter(t=>!names.includes(t.name)),...metadata].sort((a,b)=>a.name.localeCompare(b.name));
 await writeFile("deploy/migrations/rls-reference.json",JSON.stringify(rls,null,2)+"\n");
 const current=await readSchema(pool),reference=JSON.parse(await readFile("deploy/migrations/schema-reference.json","utf8"));
 for(const k of ["columns","constraints","indexes"]) {
  const order=new Map(current[k].map((r,i)=>[r.table_name+"\0"+r.name,i]));
  reference[k]=[...reference[k].filter(r=>!names.includes(r.table_name)),...current[k].filter(r=>names.includes(r.table_name))]
   .sort((a,b)=>(order.get(a.table_name+"\0"+a.name)??1e9)-(order.get(b.table_name+"\0"+b.name)??1e9));
 }
 await writeFile("deploy/migrations/schema-reference.json",JSON.stringify(reference,null,2)+"\n");
 const file="0007_global_exchange_catalog.sql",sha256=createHash("sha256").update(await readFile("deploy/migrations/"+file)).digest("hex");
 for(const dir of ["migrations","production-candidate"]) {
  const path=`deploy/${dir}/manifest.json`,manifest=JSON.parse(await readFile(path,"utf8"));
  const next={file,sha256,...(dir==="production-candidate"?{source:"../migrations/"+file}:{})};
  await writeFile(path,JSON.stringify([...manifest.filter(e=>e.file!==file),next].sort((a,b)=>a.file.localeCompare(b.file)),null,2)+"\n");
 }
 console.log(JSON.stringify({newTables:names,reviewedMigration:file,sha256,existingMigrationBytesPreserved:true}));
}finally{await pool.end();}
