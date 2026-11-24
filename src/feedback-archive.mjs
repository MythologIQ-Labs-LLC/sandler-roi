/* Small dependency-free ZIP writer for opt-in development feedback.
 * Uses STORE entries (no compression) so audio is preserved byte-for-byte.
 */
const encoder=new TextEncoder();
const asBytes=value=>value instanceof Uint8Array?value:encoder.encode(String(value));
function crc32(bytes){
  let crc=0xffffffff;
  for(const byte of bytes){
    crc^=byte;
    for(let i=0;i<8;i++)crc=(crc>>>1)^(crc&1?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
}
function w16(b,offset,n){b[offset]=n&255;b[offset+1]=(n>>>8)&255;}
function w32(b,offset,n){w16(b,offset,n);w16(b,offset+2,n>>>16);}
function concat(chunks){
  const result=new Uint8Array(chunks.reduce((total,chunk)=>total+chunk.byteLength,0));
  let off=0;for(const chunk of chunks){result.set(chunk,off);off+=chunk.byteLength;}
  return result;
}
/** Export a set of entries as a standards-compatible uncompressed ZIP blob. */
export function zipFeedback(entries){
  if(!Array.isArray(entries)||entries.length>100)throw Error("Too many feedback attachments");
  const locals=[],central=[];
  let cursor=0;
  for(const entry of entries){
    if(!entry||typeof entry.name!=="string"||!/^[a-zA-Z0-9._-]+$/.test(entry.name))
      throw Error("Invalid feedback archive filename");
    const name=encoder.encode(entry.name);
    const data=asBytes(entry.data);
    if(name.byteLength>255||data.byteLength>20_000_000)throw Error("Feedback item exceeds archive limit");
    const crc=crc32(data),size=data.byteLength;
    const local=new Uint8Array(30+name.length);
    w32(local,0,0x04034b50);w16(local,4,20);w16(local,6,0);w16(local,8,0);
    w32(local,14,crc);w32(local,18,size);w32(local,22,size);
    w16(local,26,name.length);local.set(name,30);
    const c=new Uint8Array(46+name.length);
    w32(c,0,0x02014b50);w16(c,4,20);w16(c,6,20);
    w32(c,16,crc);w32(c,20,size);w32(c,24,size);
    w16(c,28,name.length);w32(c,42,cursor);c.set(name,46);
    locals.push(local,data);central.push(c);cursor+=local.length+size;
  }
  const dir=concat(central);
  const end=new Uint8Array(22);
  w32(end,0,0x06054b50);w16(end,8,entries.length);w16(end,10,entries.length);
  w32(end,12,dir.length);w32(end,16,cursor);
  return new Blob([...locals,dir,end],{type:"application/zip"});
}
