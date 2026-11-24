import test from "node:test";
import assert from "node:assert/strict";
import {zipFeedback} from "../src/feedback-archive.mjs";

test("feedback ZIP includes a valid manifest and unmodified audio bytes",async()=>{
  const audio=new Uint8Array([0,1,2,254,255,13]);
  const zip=zipFeedback([
    {name:"feedback.json",data:JSON.stringify({schema:"sandler-roi-feedback/1",notes:[{text:"clearer compare"}]})},
    {name:"voice-01.webm",data:audio}
  ]);
  assert.equal(zip.type,"application/zip");
  const bytes=new Uint8Array(await zip.arrayBuffer()),view=new DataView(bytes.buffer);
  let offset=0;
  const found={};
  for(let i=0;i<2;i++){
    assert.equal(view.getUint32(offset,true),0x04034b50);
    const size=view.getUint32(offset+18,true);
    const nameSize=view.getUint16(offset+26,true),extraSize=view.getUint16(offset+28,true);
    const name=new TextDecoder().decode(bytes.subarray(offset+30,offset+30+nameSize));
    const begin=offset+30+nameSize+extraSize;
    found[name]=bytes.slice(begin,begin+size);
    offset=begin+size;
  }
  assert.equal(JSON.parse(new TextDecoder().decode(found["feedback.json"])).notes[0].text,"clearer compare");
  assert.deepEqual(found["voice-01.webm"],audio);
  const end=bytes.length-22;
  assert.equal(view.getUint32(end,true),0x06054b50,"central directory must end with ZIP footer");
  assert.equal(view.getUint16(end+10,true),2,"both entries are listed in directory");
});
test("feedback archive refuses invalid names and oversized entry counts",()=>{
  assert.throws(()=>zipFeedback([{name:"../escape",data:"oops"}]),/filename/);
  assert.throws(()=>zipFeedback(Array.from({length:101},(_,i)=>({name:"note-"+i+".txt",data:"a"}))),/Too many/);
});


test("ZIP rejects duplicate names and invalid entry types before archiving",()=>{
  assert.throws(()=>zipFeedback([
    {name:"VOICE-01.webm",data:new Uint8Array([1])},
    {name:"voice-01.webm",data:new Uint8Array([2])}
  ]),/Duplicate/);
  assert.throws(()=>zipFeedback([{name:"feedback.json",data:{text:"not serialized"}}]),/Invalid feedback archive content/);
  assert.throws(()=>zipFeedback([{name:"voice.mp3",data:null}]),/Invalid feedback archive content/);
});
