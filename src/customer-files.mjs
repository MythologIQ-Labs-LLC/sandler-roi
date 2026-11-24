/* Explicit, user-approved customer-folder workflow.
 * No cloud API, automatic filesystem scans, or background saving.
 */
const $=id=>document.getElementById(id);
const validName=name=>/^sandler-roi-[a-z0-9-]+\.json$/i.test(name);
const slug=name=>String(name||"customer").trim().toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"customer";
const filenameFor=name=>"sandler-roi-"+slug(name)+".json";
export function initCustomerFiles({makeSnapshot,loadSnapshot,downloadBackup}){
  const dialog=$("customer-files-dialog"),select=$("customer-saved-list");
  const save=$("customer-save"),open=$("customer-open"),remove=$("customer-remove");
  const connect=$("customer-folder-connect"),hint=$("customer-folder-hint");
  let directory=null;
  const status=message=>{$("customer-files-status").textContent=message;};
  function updateControls(){
    save.disabled=!directory;open.disabled=!directory||!select.value;
    remove.disabled=!directory||!select.value;
  }
  function show(){
    if(typeof dialog.showModal==="function")dialog.showModal();
    else dialog.setAttribute("open","");
  }
  function hide(){
    if(typeof dialog.close==="function")dialog.close();
    else dialog.removeAttribute("open");
  }
  async function readSnapshot(fileHandle){
    const file=await fileHandle.getFile();
    if(file.size>2_000_000)throw Error("Customer file is larger than the 2 MB limit");
    const value=JSON.parse(await file.text());
    if(!["sandler-roi/1","sandler-roi/2"].includes(value?.schema))
      throw Error("Unsupported customer file format");
    return value;
  }
  async function refresh(){
    const previouslySelected=select.value;
    select.replaceChildren();
    if(!directory){updateControls();return;}
    const items=[];
    let scanned=0;
    for await(const [name,handle] of directory.entries()){
      if(handle.kind!=="file"||!validName(name))continue;
      if(++scanned>200){status("Showing only the first 200 customer files. Organize or archive older files.");break;}
      try{
        const record=await readSnapshot(handle);
        const nameLabel=String(record.inputs?.prospect||name).trim().slice(0,120)||name;
        const time=Number.isFinite(Date.parse(record.savedAt))?new Date(record.savedAt).toLocaleDateString():"";
        items.push({file:name,title:nameLabel,date:time});
      }catch{/* Skip unrelated, oversized, or malformed JSON. */}
    }
    items.sort((a,b)=>a.title.localeCompare(b.title));
    for(const item of items){
      const option=document.createElement("option");
      option.value=item.file;
      option.textContent=item.title+(item.date?" · "+item.date:"");
      select.append(option);
    }
    if(items.some(item=>item.file===previouslySelected))select.value=previouslySelected;
    else if(items.length)select.selectedIndex=0;
    hint.textContent=directory.name+" · "+items.length+" saved customer"+(items.length===1?"":"s");
    updateControls();
    if(!items.length)status("No saved work found in this folder. Save the current customer to create the first file.");
  }
  $("customer-files-open").addEventListener("click",()=>{show();updateControls();});
  $("customer-files-close").addEventListener("click",hide);
  select.addEventListener("change",updateControls);
  connect.addEventListener("click",async()=>{
    if(typeof window.showDirectoryPicker!=="function"){
      status("Folder access is not supported here. Use Open JSON backup and Download JSON backup instead.");
      return;
    }
    try{
      // Permission must be granted by the user in response to this click.
      const picked=await window.showDirectoryPicker({id:"sandler-roi-customers",mode:"readwrite"});
      directory=picked;
      await refresh();
      status("Customer folder connected for this browser session. Files remain on your device.");
    }catch(err){
      if(err.name!=="AbortError")status("Unable to open folder: "+err.message);
    }
  });
  $("customer-refresh").addEventListener("click",async()=>{
    try{await refresh();status("Customer list refreshed.");}
    catch(err){status("Unable to list customer files: "+err.message);}
  });
  save.addEventListener("click",async()=>{
    if(!directory)return;
    const snapshot=makeSnapshot(),customer=String(snapshot.inputs?.prospect||"").trim();
    if(!customer){status("Enter a customer name before saving.");return;}
    const name=filenameFor(customer);
    try{
      let existing=null;
      try{existing=await directory.getFileHandle(name);}
      catch(err){if(err.name!=="NotFoundError")throw err;}
      if(existing){
        const prior=await readSnapshot(existing);
        const previousName=String(prior.inputs?.prospect||"").trim();
        if(previousName.toLocaleLowerCase()!==customer.toLocaleLowerCase())
          throw Error("Another customer already uses this filename. Choose a more distinct customer name.");
        if(!window.confirm("Replace the saved work for "+customer+"? This overwrites the earlier file."))return;
      }
      // Save only after an explicit click. The browser commits data when close() succeeds.
      const target=existing||await directory.getFileHandle(name,{create:true});
      const writer=await target.createWritable();
      try{await writer.write(JSON.stringify(snapshot,null,2));await writer.close();}
      catch(err){try{await writer.abort();}catch{}throw err;}
      await refresh();select.value=name;updateControls();
      status("Saved "+customer+" to the selected folder. For extra safety, download a JSON backup periodically.");
    }catch(err){status("Customer was not saved: "+err.message);}
  });
  open.addEventListener("click",async()=>{
    if(!directory||!select.value)return;
    if(!window.confirm("Open this saved customer? Unsaved changes to the current workbench will be lost."))return;
    try{
      const data=await readSnapshot(await directory.getFileHandle(select.value));
      loadSnapshot(data);
      status("Opened "+String(data.inputs?.prospect||"saved customer")+".");
      hide();
    }catch(err){status("Could not open customer: "+err.message);}
  });
  remove.addEventListener("click",async()=>{
    if(!directory||!select.value)return;
    const name=select.value;
    if(!window.confirm("Permanently delete "+name+" from this folder? This cannot be undone."))return;
    try{await directory.removeEntry(name);await refresh();status("Customer file deleted from the selected folder.");}
    catch(err){status("Could not delete customer: "+err.message);}
  });
  $("customer-download-backup").addEventListener("click",downloadBackup);
  $("customer-open-backup").addEventListener("click",()=>{
    // File input lives outside this modal; close first so the browser does not treat it as inert.
    hide();$("import-file").click();
  });
  if(typeof window.showDirectoryPicker!=="function"){
    connect.disabled=true;
    hint.textContent="Direct folder access requires a supported secure browser. JSON backup remains available.";
  }
  updateControls();
}
