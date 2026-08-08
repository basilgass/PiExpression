import { NumExp } from "./src/index.ts"
for (const e of ["-3","-3.5","-1/2","-x","(-3)","3"]) {
  try { const k = new NumExp(e); console.log(JSON.stringify(e).padEnd(8), "valid:", k.isValid(), " eval:", k.isValid()? k.evaluate():"-") }
  catch(err){ console.log(JSON.stringify(e).padEnd(8), "THREW:", err.message) }
}
