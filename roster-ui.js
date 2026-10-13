async function bindRosterOptions(modal){
 try{
  const response=await fetch('/api/talents/options');if(!response.ok)return;
  const options=await response.json();if(!modal.isConnected)return;
  const title=modal.querySelector('[name="title"]'),tags=modal.querySelector('[name="tags"]');
  title.setAttribute('list','positionOptions');
  title.insertAdjacentHTML('afterend',`<datalist id="positionOptions">${options.positions.map(x=>`<option value="${esc(x)}">`).join('')}</datalist><small>可选推荐定位，也可填写自定义定位。</small>`);
  const choices=document.createElement('div');choices.className='roster-tag-options';
  const selected=()=>new Set(tags.value.split(/[,，]/).map(x=>x.trim()).filter(Boolean));
  const refresh=()=>choices.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(selected().has(b.textContent))));
  options.abilities.forEach(label=>{const button=document.createElement('button');button.type='button';button.className='btn sm';button.textContent=label;button.onclick=()=>{const values=selected();values.has(label)?values.delete(label):values.add(label);tags.value=[...values].join(',');refresh()};choices.append(button)});
  tags.after(choices);tags.addEventListener('input',refresh);refresh();
 }catch{}
}
function bindRosterImport(){
 const fileInput=document.querySelector('#fileInput'),download=document.querySelector('[data-download]');
 if(download)download.onclick=()=>{location.href='/api/talents/template'};
 if(!fileInput)return;
 const preview=document.querySelector('#importPreview');let upload=null,serial=0;
 if(location.hostname.endsWith('github.io')){
  fileInput.disabled=true;if(download)download.disabled=true;
  preview.textContent='此静态预览不支持保存名单，请使用已部署服务器的后台上传。';return;
 }
 async function request(commit){
  const response=await fetch('/api/talents/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...upload,commit})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'导入失败');return result;
 }
 fileInput.onchange=async()=>{
  const ticket=++serial,file=fileInput.files[0];upload=null;preview.textContent='';if(!file)return;
  try{
   if(file.size>5*1024*1024)throw Error('文件不可超过 5MB');
   preview.textContent='正在读取并校验名单…';
   const content=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('文件读取失败'));reader.readAsDataURL(file)});
   if(ticket!==serial)return;upload={filename:file.name,content};const result=await request(false);if(ticket!==serial)return;
   preview.innerHTML=`<h2>导入预览</h2><p>${esc(file.name)} · ${result.rows.length} 位专家 · ${result.errors.length} 处错误</p>${result.errors.length?`<div class="admin-notice" role="alert">${result.errors.map(e=>`<p>第 ${e.line} 行：${esc(e.message)}</p>`).join('')}</div>`:''}<div class="table-wrap"><table><thead><tr><th>姓名</th><th>城市</th><th>方向</th><th>AI专委会成员</th><th>来源数</th><th>状态</th></tr></thead><tbody>${result.rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.city)}</td><td>${esc(r.title)}</td><td>${r.committeeMember?'是':'否'}</td><td>${r.evidence}</td><td>${r.published?'发布':'草稿'}</td></tr>`).join('')}</tbody></table></div><p>请核对名单、成员身份和来源后确认导入。有错误时请修改表格后重新选择文件。</p><button class="btn acid" id="confirmRosterImport" ${result.errors.length||!result.rows.length?'disabled':''}>确认导入 ${result.rows.length} 位专家</button><p id="rosterImportStatus" role="status"></p>`;
   document.querySelector('#confirmRosterImport').onclick=async event=>{
    event.currentTarget.disabled=true;fileInput.disabled=true;const status=document.querySelector('#rosterImportStatus');status.textContent='正在保存…';
    try{const saved=await request(true);state.datasetLoaded=false;await loadDataset();state.adminTab='list';render();toast(`已导入 ${saved.imported} 位专家`)}catch(error){status.textContent=error.message;fileInput.disabled=false;event.target.disabled=false;}
   };
  }catch(error){if(ticket===serial)preview.textContent=error.message;}
 };
}
