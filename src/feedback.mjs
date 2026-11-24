/* Opt-in development feedback mode. Does not inspect customer data or send telemetry. */
import {zipFeedback} from "./feedback-archive.mjs";
const $=id=>document.getElementById(id);
const download=(name,blob)=>{
  const url=URL.createObjectURL(blob),anchor=document.createElement("a");
  anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
};
export function initDevelopmentFeedback(getContext){
  const toggle=$("feedback-toggle"),pane=$("feedback-panel"),text=$("feedback-text");
  // A deliberate development-only link enables the UI; this is not an auth boundary.
  const enabled=new URLSearchParams(window.location?.search||"").get("devFeedback")==="1";
  toggle.hidden=!enabled;pane.hidden=true;
  if(!enabled)return;
  const record=$("feedback-record"),stop=$("feedback-stop"),play=$("feedback-audio-preview");
  const removeAudio=$("feedback-clear-audio"),list=$("feedback-list");
  const exportButton=$("feedback-export"),status=$("feedback-status");
  const notes=[];
  let recorder=null,stream=null,chunks=[],pendingAudio=null,previewUrl=null,exported=false;
  const setStatus=message=>{status.textContent=message;};
  function show(active){
    // Closing feedback mode must never leave an invisible microphone recording.
    if(!active&&recorder?.state==="recording")recorder.stop();
    pane.hidden=!active;
    toggle.setAttribute("aria-pressed",String(active));
    document.body.classList.toggle("feedback-mode",active);
    if(active){updateContext();text.focus();}
  }
  function updateContext(){
    const c=getContext();
    $("feedback-location").textContent=[
      c.stage,c.panel,c.scenario
    ].filter(Boolean).join(" / ");
  }
  function refresh(){
    list.replaceChildren();
    for(const note of notes){
      const item=document.createElement("div");
      item.className="feedback-item";
      const title=document.createElement("strong");
      title.textContent=(note.category==="positive"?"Working well":note.category==="issue"?"Issue":"Improvement")+
        (note.context?" · "+Object.values(note.context).filter(Boolean).join(" / "):" · Overall");
      const body=document.createElement("p");
      body.textContent=note.text||(note.audio?"Voice recording":"");
      const remove=document.createElement("button");
      remove.type="button";remove.className="btn";remove.textContent="Remove";
      remove.setAttribute("aria-label","Remove feedback item");
      remove.addEventListener("click",()=>{
        notes.splice(notes.indexOf(note),1);exported=false;refresh();
        setStatus("Feedback item removed.");
      });
      item.append(title,body,remove);list.append(item);
    }
    $("feedback-count").textContent=notes.length+" captured";
    exportButton.disabled=!notes.length;
  }
  function audioButtons(){
    record.disabled=!!recorder;
    stop.disabled=!recorder;
    removeAudio.disabled=!pendingAudio;
  }
  function resetAudio(){
    pendingAudio=null;
    if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
    play.removeAttribute("src");play.hidden=true;
    audioButtons();
  }
  function closeStream(){
    if(stream){for(const track of stream.getTracks())track.stop();stream=null;}
    recorder=null;audioButtons();
  }
  toggle.addEventListener("click",()=>show(pane.hidden));
  $("feedback-exit").addEventListener("click",()=>show(false));
  document.querySelectorAll("[data-workbench-nav],[data-discover-tab],[data-scenario]").forEach(el=>{
    el.addEventListener("click",()=>{if(!pane.hidden)queueMicrotask(updateContext);});
  });
  record.addEventListener("click",async()=>{
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
      setStatus("Audio recording is not supported in this browser. Text feedback remains available.");return;
    }
    resetAudio();
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const types=["audio/webm;codecs=opus","audio/mp4","audio/webm","audio/ogg"];
      const type=types.find(t=>MediaRecorder.isTypeSupported(t));
      recorder=new MediaRecorder(stream,type?{mimeType:type}:undefined);
      chunks=[];
      recorder.addEventListener("dataavailable",event=>{if(event.data?.size)chunks.push(event.data);});
      recorder.addEventListener("stop",()=>{
        const blob=new Blob(chunks,{type:recorder?.mimeType||"audio/webm"});
        if(blob.size===0||blob.size>15_000_000){
          setStatus("Recording is empty or exceeds 15 MB. Please record a shorter note.");
        }else{
          pendingAudio=blob;
          previewUrl=URL.createObjectURL(blob);play.src=previewUrl;play.hidden=false;
          setStatus("Voice note ready. Add it with your comment or remove it.");
        }
        chunks=[];closeStream();
      },{once:true});
      recorder.addEventListener("error",()=>{setStatus("Audio recording failed.");closeStream();},{once:true});
      recorder.start();
      audioButtons();setStatus("Recording microphone audio. Click Stop when finished.");
    }catch(err){closeStream();setStatus(err.name==="NotAllowedError"?"Microphone access was denied.":"Unable to record: "+err.message);}
  });
  stop.addEventListener("click",()=>{if(recorder?.state==="recording"){stop.disabled=true;recorder.stop();}});
  removeAudio.addEventListener("click",()=>{resetAudio();setStatus("Voice note removed.");});
  $("feedback-add").addEventListener("click",()=>{
    const written=text.value.trim();
    if(!written&&!pendingAudio){setStatus("Write a comment or record a voice note first.");return;}
    if(recorder){setStatus("Stop the recording before adding feedback.");return;}
    const c=getContext();
    const context=$("feedback-include-context").checked?
      {stage:c.stage,panel:c.panel||null,scenario:c.scenario||null}:null;
    notes.push({
      id:crypto.randomUUID(),time:new Date().toISOString(),
      category:$("feedback-category").value,text:written,
      context,audio:pendingAudio
    });
    exported=false;text.value="";resetAudio();refresh();
    setStatus("Feedback captured locally. It is not sent until you share the exported package.");
  });
  exportButton.addEventListener("click",async()=>{
    if(!notes.length)return;
    try{
      const manifest={schema:"sandler-roi-feedback/1",createdAt:new Date().toISOString(),
        app:"Sandler ROI Workbench",privacy:"Manually captured only; no automatic customer input collection",
        notes:[]};
      const entries=[];
      for(let index=0;index<notes.length;index++){
        const note=notes[index];
        let filename=null;
        if(note.audio){
          const ext=note.audio.type.includes("mp4")?"m4a":note.audio.type.includes("ogg")?"ogg":"webm";
          filename="voice-"+String(index+1).padStart(2,"0")+"."+ext;
          entries.push({name:filename,data:new Uint8Array(await note.audio.arrayBuffer())});
        }
        manifest.notes.push({
          id:note.id,time:note.time,category:note.category,text:note.text,
          context:note.context,recording:filename
        });
      }
      entries.unshift({name:"feedback.json",data:JSON.stringify(manifest,null,2)});
      download("sandler-development-feedback-"+new Date().toISOString().slice(0,10)+".zip",zipFeedback(entries));
      exported=true;setStatus("Feedback package downloaded. Review its contents before sharing.");
    }catch(err){setStatus("Unable to export feedback: "+err.message);}
  });
  if(typeof window.addEventListener==="function"){
    window.addEventListener("beforeunload",event=>{
      if((notes.length||pendingAudio||recorder)&&!exported){event.preventDefault();event.returnValue="";}
    });
    window.addEventListener("pagehide",()=>{if(recorder?.state==="recording")recorder.stop();closeStream();});
  }
  audioButtons();refresh();show(false);
}
