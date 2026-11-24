/* Opt-in development feedback mode.
 * No customer model inspection, network telemetry, or automatic persistence.
 */
import {zipFeedback} from "./feedback-archive.mjs";
const $=id=>document.getElementById(id);
const MAX_NOTES=40,MAX_AUDIO_BYTES=15_000_000,MAX_TOTAL_AUDIO_BYTES=48_000_000;
const MAX_RECORDING_MS=120_000;
const download=(name,blob)=>{
  const url=URL.createObjectURL(blob),anchor=document.createElement("a");
  anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();
  const timer=setTimeout(()=>URL.revokeObjectURL(url),15000);
  if(typeof timer?.unref==="function")timer.unref();
};
export function initDevelopmentFeedback(getContext){
  const toggle=$("feedback-toggle"),pane=$("feedback-panel"),text=$("feedback-text");
  // A deliberate development-only URL enables this UI, not access control.
  const enabled=new URLSearchParams(window.location?.search||"").get("devFeedback")==="1";
  toggle.hidden=!enabled;pane.hidden=true;
  if(!enabled)return;

  const record=$("feedback-record"),stop=$("feedback-stop"),play=$("feedback-audio-preview");
  const removeAudio=$("feedback-clear-audio"),list=$("feedback-list");
  const exportButton=$("feedback-export"),status=$("feedback-status");
  const notes=[];
  let recorder=null,stream=null,chunks=[],pendingAudio=null,previewUrl=null,exported=false;
  let permissionRequest=0,requesting=false,exportBusy=false,recordTimeout=null;
  let recordingBytes=0,discardRecording=false,revision=0,draftContext=null;
  const setStatus=message=>{status.textContent=message;};
  const getSafeContext=()=>{
    const raw=getContext()||{};
    return {stage:raw.stage||null,panel:raw.panel||null,scenario:raw.scenario||null};
  };
  const contextText=context=>[context?.stage,context?.panel,context?.scenario].filter(Boolean).join(" / ");
  function pinDraft(){
    if(!draftContext)draftContext=getSafeContext();
    updateContext();
  }
  function clearDraftContext(){
    draftContext=null;
    updateContext();
  }
  function releaseEmptyDraft(){
    // Failed, canceled, empty and discarded recordings must not pin a future comment.
    if(!text.value.trim()&&!pendingAudio)clearDraftContext();
  }
  function markChanged(){++revision;exported=false;}
  function updateContext(){
    const pinned=!!draftContext;
    $("feedback-location").textContent=(pinned?"Draft from: ":"Current: ")+
      contextText(draftContext||getSafeContext());
  }
  function audioButtons(){
    record.disabled=!!recorder||requesting||!!pendingAudio||exportBusy;
    stop.disabled=!recorder||recorder.state!=="recording";
    removeAudio.disabled=!pendingAudio;
    exportButton.disabled=notes.length===0||exportBusy;
  }
  function closeStream(){
    if(recordTimeout){clearTimeout(recordTimeout);recordTimeout=null;}
    if(stream){for(const track of stream.getTracks())track.stop();stream=null;}
    recorder=null;audioButtons();
  }
  function resetAudio(){
    pendingAudio=null;
    if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
    play.removeAttribute("src");play.hidden=true;
    audioButtons();
  }
  function show(active){
    if(!active){
      ++permissionRequest;
      requesting=false;
      if(recorder?.state==="recording")recorder.stop();
      if(stream)for(const track of stream.getTracks())track.stop();
      if(!recorder)releaseEmptyDraft();
      audioButtons();
    }
    pane.hidden=!active;
    toggle.setAttribute("aria-pressed",String(active));
    document.body.classList.toggle("feedback-mode",active);
    if(active){updateContext();text.focus();}
  }
  function refresh(){
    list.replaceChildren();
    for(const note of notes){
      const item=document.createElement("div");
      item.className="feedback-item";
      const title=document.createElement("strong");
      title.textContent=(note.category==="positive"?"Working well":note.category==="issue"?"Issue":"Improvement")+
        (note.context?" · "+contextText(note.context):" · Overall");
      const body=document.createElement("p");
      body.textContent=note.text||(note.audio?"Voice recording":"");
      const remove=document.createElement("button");
      remove.type="button";remove.className="btn";remove.textContent="Remove";
      remove.setAttribute("aria-label","Remove feedback item");
      remove.addEventListener("click",()=>{
        const index=notes.indexOf(note);
        if(index<0)return;
        notes.splice(index,1);markChanged();refresh();
        setStatus("Feedback item removed.");
      });
      item.append(title,body,remove);list.append(item);
    }
    $("feedback-count").textContent=notes.length+" captured";
    audioButtons();
  }

  toggle.addEventListener("click",()=>show(pane.hidden));
  $("feedback-exit").addEventListener("click",()=>show(false));
  document.querySelectorAll("[data-workbench-nav],[data-discover-tab],[data-scenario]").forEach(el=>{
    el.addEventListener("click",()=>{if(!pane.hidden)queueMicrotask(updateContext);});
  });
  text.addEventListener("input",()=>{
    if(text.value.trim())pinDraft();
    else if(!pendingAudio&&!recorder&&!requesting)clearDraftContext();
  });

  record.addEventListener("click",async()=>{
    if(pane.hidden||recorder||requesting||exportBusy)return;
    if(pendingAudio){
      setStatus("Add or remove the current voice note before recording another.");return;
    }
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
      setStatus("Audio recording is not supported in this browser. Text feedback remains available.");return;
    }
    pinDraft();
    const request=++permissionRequest;
    requesting=true;audioButtons();
    let acquired=null;
    try{
      acquired=await navigator.mediaDevices.getUserMedia({audio:true});
      if(request!==permissionRequest||pane.hidden){
        for(const track of acquired.getTracks())track.stop();
        return;
      }
      stream=acquired;
      const formats=["audio/webm;codecs=opus","audio/mp4","audio/webm","audio/ogg"];
      const type=formats.find(format=>MediaRecorder.isTypeSupported?.(format));
      const nextRecorder=new MediaRecorder(stream,type?{mimeType:type}:undefined);
      recorder=nextRecorder;
      chunks=[];recordingBytes=0;discardRecording=false;
      nextRecorder.addEventListener("dataavailable",event=>{
        if(recorder!==nextRecorder||!event.data?.size||discardRecording)return;
        recordingBytes+=event.data.size;
        if(recordingBytes>MAX_AUDIO_BYTES){
          discardRecording=true;chunks=[];
          setStatus("Voice note exceeded 15 MB and was discarded. Record a shorter note.");
          if(nextRecorder.state==="recording")nextRecorder.stop();
          return;
        }
        chunks.push(event.data);
      });
      nextRecorder.addEventListener("stop",()=>{
        // Recorder events can arrive after an error and after a newer take begins.
        if(recorder!==nextRecorder)return;
        const blob=discardRecording?null:new Blob(chunks,{type:nextRecorder.mimeType||"audio/webm"});
        chunks=[];
        if(!blob||blob.size===0||blob.size>MAX_AUDIO_BYTES){
          if(!discardRecording)setStatus("Recording is empty or exceeds 15 MB. Please try again.");
        }else{
          pendingAudio=blob;
          previewUrl=URL.createObjectURL(blob);play.src=previewUrl;play.hidden=false;
          setStatus("Voice note ready. Add it with your comment or remove it.");
        }
        closeStream();
        releaseEmptyDraft();
      },{once:true});
      nextRecorder.addEventListener("error",()=>{
        if(recorder!==nextRecorder)return;
        discardRecording=true;chunks=[];
        setStatus("Audio recording failed.");closeStream();releaseEmptyDraft();
      },{once:true});
      nextRecorder.start(1000);
      markChanged();
      recordTimeout=setTimeout(()=>{
        if(nextRecorder.state==="recording"){
          setStatus("Voice recording reached its 2-minute limit and was stopped.");
          nextRecorder.stop();
        }
      },MAX_RECORDING_MS);
      if(typeof recordTimeout?.unref==="function")recordTimeout.unref();
      setStatus("Recording microphone audio. Click Stop when finished (2-minute maximum).");
    }catch(err){
      if(acquired)for(const track of acquired.getTracks())track.stop();
      if(request===permissionRequest){
        setStatus(err.name==="NotAllowedError"?"Microphone access was denied.":"Unable to record: "+err.message);
        closeStream();
        releaseEmptyDraft();
      }
    }finally{
      if(request===permissionRequest)requesting=false;
      audioButtons();
    }
  });
  stop.addEventListener("click",()=>{
    if(recorder?.state==="recording"){stop.disabled=true;recorder.stop();}
  });
  removeAudio.addEventListener("click",()=>{
    resetAudio();
    if(!text.value.trim()&&!recorder&&!requesting)clearDraftContext();
    setStatus("Voice note removed.");
  });
  $("feedback-add").addEventListener("click",()=>{
    const written=text.value.trim();
    if(recorder||requesting){setStatus("Stop or finish microphone permission before adding feedback.");return;}
    if(!written&&!pendingAudio){setStatus("Write a comment or record a voice note first.");return;}
    if(notes.length>=MAX_NOTES){
      setStatus("The feedback package is limited to 40 notes. Download it, then begin a new session.");return;
    }
    const audioTotal=notes.reduce((sum,note)=>sum+(note.audio?.size||0),0)+(pendingAudio?.size||0);
    if(audioTotal>MAX_TOTAL_AUDIO_BYTES){
      setStatus("Audio total exceeds 48 MB. Remove a recording or export earlier notes before continuing.");return;
    }
    const context=$("feedback-include-context").checked?(draftContext||getSafeContext()):null;
    notes.push({
      id:crypto.randomUUID(),time:new Date().toISOString(),
      category:$("feedback-category").value,text:written,
      context,audio:pendingAudio
    });
    markChanged();text.value="";resetAudio();clearDraftContext();refresh();
    setStatus("Feedback captured locally. Export the package before leaving this page.");
  });

  exportButton.addEventListener("click",async()=>{
    if(exportBusy||!notes.length)return;
    if(text.value.trim()||pendingAudio||recorder||requesting){
      setStatus("Add or clear the unfinished comment or voice note before downloading feedback.");return;
    }
    const snapshot=notes.slice();
    const startedAtRevision=revision;
    exportBusy=true;audioButtons();
    try{
      const manifest={schema:"sandler-roi-feedback/1",createdAt:new Date().toISOString(),
        app:"Sandler ROI Workbench",privacy:"Manually captured only; no automatic customer input collection",
        notes:[]};
      const entries=[];
      for(let index=0;index<snapshot.length;index++){
        const note=snapshot[index];
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
      exported=revision===startedAtRevision&&!text.value.trim()&&!pendingAudio&&!recorder&&!requesting;
      setStatus(exported?"Feedback download requested. Check Downloads before leaving.":
        "Earlier notes were downloaded; additional changes still need exporting.");
    }catch(err){
      exported=false;setStatus("Unable to export feedback: "+err.message);
    }finally{
      exportBusy=false;audioButtons();
    }
  });
  if(typeof window.addEventListener==="function"){
    window.addEventListener("beforeunload",event=>{
      if((notes.length&&!exported)||pendingAudio||recorder||requesting||exportBusy||text.value.trim()){
        event.preventDefault();event.returnValue="";
      }
    });
    window.addEventListener("pagehide",()=>{
      ++permissionRequest;requesting=false;
      if(recorder?.state==="recording")recorder.stop();
      closeStream();
    });
  }
  audioButtons();refresh();show(false);
}
