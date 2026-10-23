import { readFileSync } from "node:fs";
for (const l of readFileSync(".env.local","utf8").split("\n")) { const m=l.match(/^([A-Z_]+)=(.*)$/); if(m) process.env[m[1]]=m[2].replace(/^"|"$/g,""); }
const { findPartsForVehicle } = await import("./lib/catalog.ts");
for (const engine of ["3.7L V6 3726cc", undefined]) {
 const r:any = await findPartsForVehicle({year:2011,make:"Ford",model:"F-150",engine,trim:"STX",part:"water pump"});
 console.log(engine, r.status, r.level, r.total_matches, JSON.stringify(r.options??r.message??"").slice(0,300));
}
