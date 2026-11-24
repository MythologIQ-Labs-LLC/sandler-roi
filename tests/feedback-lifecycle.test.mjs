import test from "node:test";
import assert from "node:assert/strict";
import {initDevelopmentFeedback} from "../src/feedback.mjs";

function deferred(){
  let resolve,reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
function mockNode(){
  const handlers=new Map();
  const n={
    hidden:false,disabled:false,value:"",checked:true,textContent:"",src:"",
    children:[],attributes:{},className:"",style:{},
    addEventListener:(name,cb)=>handlers.set(name,cb),
    fire:(name,event={})=>handlers.get(name)?.(event),
    setAttribute:(name,value)=>{n.attributes[name]=String(value);},
    removeAttribute:name=>{delete n.attributes[name];},
    remove:()=>{},focus:()=>{},append:(...children)=>{n.children.push(...children);},
    replaceChildren:(...children)=>{n.children=[...children];},
    classList:{toggle:()=>{}}
  };
  return n;
}
function fixture(getUserMedia){
  const nodes=new Map();
  const id=id=>{if(!nodes.has(id))nodes.set(id,mockNode());return nodes.get(id);};
  const listeners=new Map(),objects=[];
  const doc={
    getElementById:id,
    querySelectorAll:()=>[],
    createElement:()=>mockNode(),
    body:{append:()=>{},classList:{toggle:()=>{}}}
  };
  const win={
    location:{search:"?devFeedback=1"},
    addEventListener:(name,cb)=>listeners.set(name,cb)
  };
  class FakeRecorder{
    static instances=[];
    static isTypeSupported(){return true;}
    constructor(stream,options){
      this.stream=stream;this.mimeType=options?.mimeType||"audio/webm";this.state="inactive";this.handlers=new Map();
      FakeRecorder.instances.push(this);
    }
    addEventListener(type,fn){this.handlers.set(type,fn);}
    start(){this.state="recording";}
    stop(){
      if(this.state!=="recording")return;
      this.state="inactive";
      this.handlers.get("dataavailable")?.({data:new Blob(["synthetic voice"],{type:"audio/webm"})});
      this.handlers.get("stop")?.();
    }
  }
  const originals={
    document:globalThis.document,window:globalThis.window,
    navigator:Object.getOwnPropertyDescriptor(globalThis,"navigator"),
    recorder:globalThis.MediaRecorder,
    create:URL.createObjectURL,revoke:URL.revokeObjectURL
  };
  Object.defineProperty(globalThis,"navigator",{configurable:true,value:{mediaDevices:{getUserMedia}}});
  globalThis.document=doc;globalThis.window=win;globalThis.MediaRecorder=FakeRecorder;
  URL.createObjectURL=blob=>{objects.push(blob);return "blob:feedback-"+objects.length;};
  URL.revokeObjectURL=()=>{};
  return {
    id,win,doc,listeners,FakeRecorder,objects,
    restore:()=>{
      globalThis.document=originals.document;globalThis.window=originals.window;
      if(originals.navigator)Object.defineProperty(globalThis,"navigator",originals.navigator);
      else delete globalThis.navigator;
      globalThis.MediaRecorder=originals.recorder;
      URL.createObjectURL=originals.create;URL.revokeObjectURL=originals.revoke;
    }
  };
}
function audioStream(){
  const track={stopped:false,stop(){this.stopped=true;}};
  return {track,stream:{getTracks:()=>[track]}};
}

test("permission resolving after closing feedback mode never starts recording",async()=>{
  const req=deferred(),first=audioStream();
  const f=fixture(()=>req.promise);
  try{
    initDevelopmentFeedback(()=>({stage:"compare"}));
    f.id("feedback-toggle").fire("click");
    const permission=f.id("feedback-record").fire("click");
    assert.equal(f.id("feedback-record").disabled,true,"prevent duplicate permission requests");
    f.id("feedback-exit").fire("click");
    req.resolve(first.stream);
    await permission;
    assert.equal(first.track.stopped,true,"tracks must stop even when permission resolves after closing");
    assert.equal(f.FakeRecorder.instances.length,0,"no hidden recording starts");
    assert.equal(f.id("feedback-panel").hidden,true);
  }finally{f.restore();}
});

test("stale rejected permission cannot terminate a newer recording",async()=>{
  const first=deferred(),second=audioStream();let calls=0;
  const f=fixture(()=>++calls===1?first.promise:Promise.resolve(second.stream));
  try{
    initDevelopmentFeedback(()=>({stage:"model"}));
    f.id("feedback-toggle").fire("click");
    const pending=f.id("feedback-record").fire("click");
    f.id("feedback-exit").fire("click");
    f.id("feedback-toggle").fire("click");
    await f.id("feedback-record").fire("click");
    assert.equal(f.FakeRecorder.instances.at(-1).state,"recording");
    first.reject(Object.assign(new Error("Old permission denied"),{name:"NotAllowedError"}));
    await pending;
    assert.equal(f.FakeRecorder.instances.at(-1).state,"recording",
      "stale failure must not stop current recording");
    f.id("feedback-exit").fire("click");
    assert.equal(second.track.stopped,true,"closing must immediately stop microphone tracks");
  }finally{f.restore();}
});

test("unexported audio prompts on unload even after a previous export",async()=>{
  const req=deferred();
  const f=fixture(()=>req.promise);
  try{
    initDevelopmentFeedback(()=>({stage:"present",scenario:"expected"}));
    f.id("feedback-toggle").fire("click");
    f.id("feedback-text").value="Make the comparison shorter";
    f.id("feedback-add").fire("click");
    await f.id("feedback-export").fire("click");
    assert.ok(f.objects.some(obj=>obj.type==="application/zip"),"prior export happened");
    const clean={preventDefault(){this.prevented=true;}};
    f.listeners.get("beforeunload")(clean);
    assert.equal(clean.prevented,undefined,"previously exported notes do not prompt");
    // A fresh recording creates a new unexported change.
    const pending=f.id("feedback-record").fire("click");
    const during={preventDefault(){this.prevented=true;}};
    f.listeners.get("beforeunload")(during);
    assert.equal(during.prevented,true,"pending microphone permission must prompt");
    const acquired=audioStream();req.resolve(acquired.stream);
    await pending;
    const active={preventDefault(){this.prevented=true;}};
    f.listeners.get("beforeunload")(active);
    assert.equal(active.prevented,true,"active recording must prompt");
    f.id("feedback-stop").fire("click");
    const unadded={preventDefault(){this.prevented=true;}};
    f.listeners.get("beforeunload")(unadded);
    assert.equal(unadded.prevented,true,"audio awaiting Add must prompt");
    f.id("feedback-clear-audio").fire("click");
    const cleared={preventDefault(){this.prevented=true;}};
    f.listeners.get("beforeunload")(cleared);
    assert.equal(cleared.prevented,true,"new audio work cannot retroactively mark earlier export current");
  }finally{f.restore();}
});
