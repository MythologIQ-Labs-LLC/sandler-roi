import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root=dirname(fileURLToPath(import.meta.url));
const files={
  "/":"index.html", "/index.html":"index.html",
  "/src/app.mjs":"src/app.mjs", "/src/roi.mjs":"src/roi.mjs",
  "/src/evidence.mjs":"src/evidence.mjs",
  "/src/csv-import.mjs":"src/csv-import.mjs",
  "/src/workbench.css":"src/workbench.css"
};
const types={".html":"text/html; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"};
const host="127.0.0.1";
const port=Number(process.env.PORT??4173);
if(!Number.isInteger(port)||port<1||port>65535)throw Error("PORT must be an integer from 1 to 65535");
const server=createServer(async(req,res)=>{
  const path=req.url?.split("?")[0]??"/";
  if(req.method!=="GET"&&req.method!=="HEAD"){res.writeHead(405,{"Allow":"GET, HEAD"});res.end();return;}
  const mapped=files[path];
  if(!mapped){res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8","X-Content-Type-Options":"nosniff"});res.end("Not found");return;}
  try{
    const data=await readFile(join(root,mapped));
    res.writeHead(200,{"Content-Type":types[mapped.slice(mapped.lastIndexOf("."))]??"application/octet-stream","Content-Security-Policy":"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://go.nextlevel.sandler.com; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'","X-Content-Type-Options":"nosniff","Cache-Control":"no-store"});
    res.end(req.method==="HEAD"?undefined:data);
  }catch{res.writeHead(500,{"Content-Type":"text/plain; charset=utf-8"});res.end("Unable to serve application");}
});
server.listen(port,host,()=>console.log("Sandler ROI Workbench: http://"+host+":"+port));
