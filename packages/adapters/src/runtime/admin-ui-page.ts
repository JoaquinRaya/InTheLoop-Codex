export const renderAdminUiPage = (): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>In The Loop Admin</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#edf2fd;--card:#fff;--ink:#1b2736;--muted:#60748f;--line:#d9e3f3;--pri:#1a73e8;--pri-soft:#eaf1fe;--danger:#d93025;--danger-soft:#fdecec}
*{box-sizing:border-box}
body{margin:0;font-family:Roboto,sans-serif;color:var(--ink);background:radial-gradient(circle at 0% -20%,#dbe7ff 0%,#edf2fd 40%,#f7f9ff 100%)}
.shell{min-height:100vh;display:grid;grid-template-columns:260px 1fr}
.side{padding:16px;background:#fff;border-right:1px solid var(--line)}
.brand{margin:0 0 4px;font-size:1.2rem;font-weight:700}
.sub{margin:0 0 14px;color:var(--muted);font-size:.9rem}
.nav{display:grid;gap:8px}
.nav button{border:1px solid transparent;background:transparent;border-radius:12px;padding:10px;text-align:left;color:#2f4a67;cursor:pointer}
.nav button.active{background:var(--pri-soft);border-color:#cadbfd;color:#164ea7;font-weight:500}
.main{padding:16px;display:grid;gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;box-shadow:0 8px 20px rgba(24,45,77,.08)}
h2{margin:0 0 4px}
.hint{margin:0 0 10px;color:var(--muted);font-size:.86rem}
label{display:block;font-size:.78rem;color:var(--muted);margin:0 0 6px}
input,select,button,textarea{font:inherit}
input,select,textarea{width:100%;padding:10px;border:1px solid #cad8eb;border-radius:12px;background:#f9fbff}
button{border:0;border-radius:12px;padding:10px 12px;font-weight:500;cursor:pointer}
.primary{background:var(--pri);color:#fff}
.secondary{background:#ebf2ff;color:#1b4f9f}
.danger{background:var(--danger-soft);color:var(--danger)}
.toolbar{display:grid;gap:10px;grid-template-columns:230px minmax(220px,1fr) 180px auto;align-items:end;margin-bottom:10px}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.screen{display:none}
.screen.active{display:block}
table{width:100%;border-collapse:collapse;min-width:900px}
th,td{padding:10px 8px;border-bottom:1px solid #e6edf9;text-align:left;vertical-align:top}
th{font-size:.74rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.chip{display:inline-flex;align-items:center;gap:6px;background:#eef3fd;border:1px solid #d7e3f9;border-radius:999px;padding:3px 8px;margin:4px 4px 0 0;font-size:.74rem}
.chip button{padding:0;border:0;background:transparent;color:#3d5f8f;font-size:.8rem;line-height:1}
.status{border:1px solid #d8e5f6;border-radius:12px;background:#f8fbff;padding:10px;min-height:58px;white-space:pre-wrap;font:12px ui-monospace,Consolas,monospace}
.empty{padding:16px 8px;color:var(--muted)}
.mono{font-family:ui-monospace,Consolas,monospace;font-size:.78rem}
.grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin-bottom:10px}
.hidden{display:none}
.backdrop{position:fixed;inset:0;background:rgba(17,30,51,.45);display:none;align-items:center;justify-content:center;padding:14px;z-index:100}
.backdrop.active{display:flex}
.modal{width:min(980px,100%);max-height:92vh;overflow:auto;background:#fff;border:1px solid #d9e5f5;border-radius:16px;padding:14px;box-shadow:0 20px 50px rgba(22,35,60,.3)}
.meta-pill{border:1px solid #d5e2f4;border-radius:999px;padding:6px 10px;background:#f2f7ff;font-size:.78rem;color:#35547b;display:inline-block}
.section{border:1px solid #dbe5f5;border-radius:14px;padding:12px;margin:10px 0;background:#fbfdff}
.section h3{margin:0 0 8px;font-size:.95rem}
.stack{display:grid;gap:8px}
.inline-builder{display:grid;grid-template-columns:minmax(160px,1fr) 120px auto;gap:8px}
.option-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.option-item{display:grid;grid-template-columns:24px minmax(120px,1fr) 120px auto;gap:8px;align-items:center;padding:8px;border:1px solid #d5e2f4;border-radius:12px;background:#f8fbff}
.drag-handle{cursor:grab;color:#47648f;text-align:center;font-weight:700}
.option-item.dragging{opacity:.5}
.helper{font-size:.75rem;color:#6d7e98}
.preview-card{border:1px solid #dbe5f5;border-radius:14px;padding:12px;background:#ffffff}
.preview-options{display:grid;gap:8px;margin-top:8px}
.preview-option{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #d9e5f5;border-radius:10px;background:#f8fbff}
@media (max-width:1080px){.shell{grid-template-columns:1fr}.side{border-right:0;border-bottom:1px solid var(--line)}.toolbar{grid-template-columns:1fr}.inline-builder{grid-template-columns:1fr}.option-item{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="shell">
<aside class="side">
<h1 class="brand">In The Loop Admin</h1>
<p class="sub">Question authoring and simulation</p>
<nav class="nav">
<button id="nav-questions" class="active" type="button">Questions</button>
<button id="nav-schedule" type="button">Schedule View</button>
<button id="nav-preview" type="button">User Preview</button>
</nav>
</aside>
<main class="main">
<section id="screen-questions" class="screen active card">
<h2>Questions</h2>
<p class="hint">Search, sort, create, edit and delete questions.</p>
<div class="toolbar">
<div><label for="tenantId">Tenant ID</label><input id="tenantId" value="tenant-browser" /></div>
<div><label for="question-search">Search</label><input id="question-search" placeholder="id, text, category, tags" /></div>
<div><label for="question-sort">Sort</label><select id="question-sort"><option value="created_desc">Newest first</option><option value="created_asc">Oldest first</option><option value="text_asc">Question A-Z</option><option value="category_asc">Category A-Z</option><option value="schedule_asc">Schedule A-Z</option></select></div>
<div class="actions"><button id="load-questions" class="secondary" type="button">Refresh</button><button id="add-question" class="primary" type="button">Add New</button></div>
</div>
<div style="overflow:auto"><table><thead><tr><th>ID</th><th>Question</th><th>Category</th><th>Schedule</th><th>Target</th><th>Created</th><th>Actions</th></tr></thead><tbody id="questions-body"></tbody></table></div>
<div id="questions-status" class="status" style="margin-top:10px"></div>
</section>

<section id="screen-schedule" class="screen card">
<h2>Schedule View</h2><p class="hint">See upcoming slots and why each question was selected.</p>
<div class="grid">
<div><label for="schedule-start">Start date</label><input id="schedule-start" type="date" /></div>
<div><label for="schedule-days">Days</label><input id="schedule-days" type="number" min="1" max="60" value="10" /></div>
<div><label for="schedule-timezone">Timezone</label><input id="schedule-timezone" value="UTC" /></div>
<div><label for="schedule-manager">Manager email</label><input id="schedule-manager" value="lead@example.com" /></div>
<div><label for="schedule-ancestry">Manager ancestry (csv)</label><input id="schedule-ancestry" value="vp@example.com" /></div>
<div><label for="schedule-groups">Group IDs (csv)</label><input id="schedule-groups" value="" /></div>
</div>
<button id="run-schedule" class="primary" type="button">Generate schedule</button><div id="schedule-results" style="margin-top:10px"></div>
</section>

<section id="screen-preview" class="screen card">
<h2>User Preview</h2><p class="hint">Simulate exactly what a person would see for this profile and date.</p>
<div class="grid">
<div><label for="preview-date">Timestamp UTC ISO</label><input id="preview-date" value="2026-03-24T09:00:00.000Z" /></div>
<div><label for="preview-timezone">Timezone</label><input id="preview-timezone" value="UTC" /></div>
<div><label for="preview-manager">Manager email</label><input id="preview-manager" value="lead@example.com" /></div>
<div><label for="preview-role">Role (display)</label><input id="preview-role" value="ic" /></div>
<div><label for="preview-level">Level (display)</label><input id="preview-level" value="l3" /></div>
<div><label for="preview-ancestry">Manager ancestry (csv)</label><input id="preview-ancestry" value="vp@example.com" /></div>
<div><label for="preview-groups">Group IDs (csv)</label><input id="preview-groups" value="" /></div>
</div>
<button id="run-preview" class="primary" type="button">Run preview</button>
<div id="preview-status" class="status" style="margin-top:10px"></div>
<div id="preview-render" style="margin-top:10px"></div>
</section>
</main>
</div>

<div id="editor-backdrop" class="backdrop"><div class="modal">
<h2 id="editor-title" style="margin-top:0">Add Question</h2>
<div class="grid">
<div><label>Question ID</label><div id="form-id-display" class="meta-pill">Generated by database on save</div><input id="form-id" type="hidden" /><input id="form-created-at" type="hidden" /></div>
<div><label for="form-text">Question text</label><input id="form-text" /></div>
<div><label for="form-category">Category</label><input id="form-category" value="engagement" /></div>
</div>

<div class="section">
<h3>Tags</h3>
<div class="stack">
<div class="inline-builder" style="grid-template-columns:minmax(180px,1fr) auto;">
<input id="tag-input" placeholder="Add a tag" />
<button id="tag-add" class="secondary" type="button">Add tag</button>
</div>
<div id="tags-list"></div>
<input id="form-tags" type="hidden" />
</div>
</div>

<div class="section">
<h3>Answer Options</h3>
<div class="inline-builder">
<input id="option-text-input" placeholder="Display text" />
<input id="option-points-input" type="number" min="0" value="10" />
<button id="option-add" class="secondary" type="button">Add option</button>
</div>
<div class="helper">Drag rows to reorder. Text and points are fully editable in-place.</div>
<ul id="options-list" class="option-list" style="margin-top:8px"></ul>
<input id="form-options" type="hidden" />
</div>

<div class="section">
<h3>Response Settings</h3>
<label for="form-comments">Allow comments</label>
<select id="form-comments"><option value="true">Yes</option><option value="false">No</option></select>
</div>

<div class="grid">
<div><label for="form-schedule-type">Schedule type</label><select id="form-schedule-type"><option value="queue">Queue</option><option value="specific_date">Specific Date</option><option value="recurring">Recurring</option></select></div>
<div id="wrap-specific" class="hidden"><label for="form-specific-date">Specific date</label><input id="form-specific-date" type="date" /></div>
<div id="wrap-recurring-start" class="hidden"><label for="form-recurring-start">Recurring start</label><input id="form-recurring-start" type="date" /></div>
<div id="wrap-recurring-interval" class="hidden"><label for="form-recurring-interval">Interval days</label><input id="form-recurring-interval" type="number" min="1" value="7" /></div>
</div>
<div class="grid">
<div><label for="form-target-type">Target type</label><select id="form-target-type"><option value="whole_company">Whole Company</option><option value="group">Group</option><option value="manager_subtree">Manager Subtree</option></select></div>
<div id="wrap-group" class="hidden"><label for="form-group-id">Group ID</label><input id="form-group-id" /></div>
<div id="wrap-manager" class="hidden"><label for="form-manager-email">Manager email</label><input id="form-manager-email" /></div>
</div>
<div class="actions"><button id="save-question" class="primary" type="button">Save</button><button id="cancel-question" class="secondary" type="button">Cancel</button></div>
<div id="editor-status" class="status" style="margin-top:10px"></div>
</div></div>

<script>
const state={questions:[],filtered:[],editingId:null,editorTags:[],editorOptions:[],draggedOptionIndex:null};
const el={tenantId:document.getElementById('tenantId'),search:document.getElementById('question-search'),sort:document.getElementById('question-sort'),body:document.getElementById('questions-body'),status:document.getElementById('questions-status'),backdrop:document.getElementById('editor-backdrop'),editorTitle:document.getElementById('editor-title'),editorStatus:document.getElementById('editor-status')};
const screens={questions:document.getElementById('screen-questions'),schedule:document.getElementById('screen-schedule'),preview:document.getElementById('screen-preview')};
const nav={questions:document.getElementById('nav-questions'),schedule:document.getElementById('nav-schedule'),preview:document.getElementById('nav-preview')};
const scheduleType=document.getElementById('form-schedule-type');
const targetType=document.getElementById('form-target-type');
const tagsList=document.getElementById('tags-list');
const tagInput=document.getElementById('tag-input');
const optionsList=document.getElementById('options-list');
const optionTextInput=document.getElementById('option-text-input');
const optionPointsInput=document.getElementById('option-points-input');
const previewRender=document.getElementById('preview-render');
const setStatus=(node,payload)=>{node.textContent=typeof payload==='string'?payload:JSON.stringify(payload,null,2)};
const parseCsv=(value)=>value.split(',').map((x)=>x.trim()).filter((x)=>x.length>0);
const escapeHtml=(v)=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const syncHiddenInputs=()=>{document.getElementById('form-tags').value=state.editorTags.join(',');document.getElementById('form-options').value=state.editorOptions.map((option)=>option.text).join(',');};
const renderTags=()=>{if(state.editorTags.length===0){tagsList.innerHTML='<div class="helper">No tags yet.</div>';syncHiddenInputs();return;}tagsList.innerHTML=state.editorTags.map((tag,index)=>'<span class="chip">'+escapeHtml(tag)+' <button type="button" data-tag-remove="'+String(index)+'" aria-label="Remove tag">x</button></span>').join('');syncHiddenInputs();};
const renderOptions=()=>{if(state.editorOptions.length===0){optionsList.innerHTML='<li class="helper">No options yet. Add at least two options.</li>';syncHiddenInputs();return;}optionsList.innerHTML=state.editorOptions.map((option,index)=>'<li class="option-item" draggable="true" data-option-index="'+String(index)+'"><span class="drag-handle" title="Drag to reorder">::</span><input type="text" data-option-text="'+String(index)+'" value="'+escapeHtml(option.text)+'" /><input type="number" min="0" data-option-points="'+String(index)+'" value="'+String(option.points)+'" /><button class="danger" type="button" data-option-remove="'+String(index)+'">Remove</button></li>').join('');syncHiddenInputs();};
const addTag=()=>{const value=tagInput.value.trim();if(value.length===0){return;}if(!state.editorTags.includes(value)){state.editorTags.push(value);}tagInput.value='';renderTags();};
const addOption=()=>{const text=optionTextInput.value.trim();const points=Number.parseInt(optionPointsInput.value,10);if(text.length===0){return;}state.editorOptions.push({text,points:Number.isFinite(points)?Math.max(0,points):0});optionTextInput.value='';optionPointsInput.value='10';renderOptions();};
const showScreen=(name)=>{Object.entries(screens).forEach(([k,node])=>node.classList.toggle('active',k===name));Object.entries(nav).forEach(([k,node])=>node.classList.toggle('active',k===name));};
nav.questions.addEventListener('click',()=>showScreen('questions'));nav.schedule.addEventListener('click',()=>showScreen('schedule'));nav.preview.addEventListener('click',()=>showScreen('preview'));
const refreshConditional=()=>{document.getElementById('wrap-specific').classList.toggle('hidden',scheduleType.value!=='specific_date');document.getElementById('wrap-recurring-start').classList.toggle('hidden',scheduleType.value!=='recurring');document.getElementById('wrap-recurring-interval').classList.toggle('hidden',scheduleType.value!=='recurring');document.getElementById('wrap-group').classList.toggle('hidden',targetType.value!=='group');document.getElementById('wrap-manager').classList.toggle('hidden',targetType.value!=='manager_subtree');};
scheduleType.addEventListener('change',refreshConditional);targetType.addEventListener('change',refreshConditional);

const fillForm=(q)=>{
state.editingId=q.id??null;
document.getElementById('form-id').value=q.id??'';
document.getElementById('form-created-at').value=q.created_at??'';
document.getElementById('form-id-display').textContent=q.id??'Generated by database on save';
document.getElementById('form-text').value=q.text??'';
document.getElementById('form-category').value=q.category??'engagement';
state.editorTags=[...(q.tags??[])];
state.editorOptions=(q.options??[]).map((raw)=>({text:raw.text,points:raw.points}));
document.getElementById('form-comments').value=q.allow_comments?'true':'false';
if(q.schedule?.type==='specific_date'){scheduleType.value='specific_date';document.getElementById('form-specific-date').value=q.schedule.date??'';}else if(q.schedule?.type==='recurring'){scheduleType.value='recurring';document.getElementById('form-recurring-start').value=q.schedule.start_date??'';document.getElementById('form-recurring-interval').value=String(q.schedule.rule?.interval_days??7);}else{scheduleType.value='queue';}
if(q.target?.type==='group'){targetType.value='group';document.getElementById('form-group-id').value=q.target.group_id??'';}else if(q.target?.type==='manager_subtree'){targetType.value='manager_subtree';document.getElementById('form-manager-email').value=q.target.manager_email??'';}else{targetType.value='whole_company';}
renderTags();
renderOptions();
refreshConditional();
};

const clearForm=()=>{
fillForm({id:'',created_at:'',text:'',category:'engagement',tags:[],options:[],points:10,allow_comments:true,schedule:{type:'queue'},target:{type:'whole_company'}});
state.editingId=null;
document.getElementById('form-id').value='';
document.getElementById('form-id-display').textContent='Generated by database on save';
setStatus(el.editorStatus,'Ready');
};

const openCreate=()=>{clearForm();el.editorTitle.textContent='Add Question';el.backdrop.classList.add('active');};
const openEdit=(q)=>{fillForm(q);el.editorTitle.textContent='Edit Question';el.backdrop.classList.add('active');};
const closeModal=()=>el.backdrop.classList.remove('active');
const buildQuestion=()=>{
const schedule=scheduleType.value==='queue'?{type:'queue'}:scheduleType.value==='specific_date'?{type:'specific_date',date:document.getElementById('form-specific-date').value}:{type:'recurring',start_date:document.getElementById('form-recurring-start').value,rule:{kind:'interval_days',interval_days:Number.parseInt(document.getElementById('form-recurring-interval').value,10)}};
const target=targetType.value==='whole_company'?{type:'whole_company'}:targetType.value==='group'?{type:'group',group_id:document.getElementById('form-group-id').value.trim()}:{type:'manager_subtree',manager_email:document.getElementById('form-manager-email').value.trim()};
const computedPoints=state.editorOptions.reduce((maxValue,item)=>Math.max(maxValue,item.points),0);
return {
id:state.editingId??undefined,
created_at:document.getElementById('form-created-at').value||new Date().toISOString(),
text:document.getElementById('form-text').value.trim(),
category:document.getElementById('form-category').value.trim()||'engagement',
tags:[...state.editorTags],
options:state.editorOptions.map((option)=>({text:option.text,points:option.points})),
points:computedPoints>0?computedPoints:10,
allow_comments:document.getElementById('form-comments').value==='true',
schedule,
target
};
};
const sortQuestions=(list)=>{const copy=[...list],mode=el.sort.value;if(mode==='created_asc')return copy.sort((a,b)=>a.created_at.localeCompare(b.created_at));if(mode==='text_asc')return copy.sort((a,b)=>a.text.localeCompare(b.text));if(mode==='category_asc')return copy.sort((a,b)=>a.category.localeCompare(b.category));if(mode==='schedule_asc')return copy.sort((a,b)=>a.schedule.type.localeCompare(b.schedule.type));return copy.sort((a,b)=>b.created_at.localeCompare(a.created_at));};
const renderList=()=>{const q=el.search.value.trim().toLowerCase();const filtered=state.questions.filter((x)=>q.length===0||[x.id,x.text,x.category,(x.tags??[]).join(','),x.schedule?.type??'',x.target?.type??''].join(' ').toLowerCase().includes(q));state.filtered=sortQuestions(filtered);if(state.filtered.length===0){el.body.innerHTML='<tr><td colspan="7" class="empty">No questions found.</td></tr>';return;}el.body.innerHTML=state.filtered.map((x)=>'<tr><td class="mono">'+escapeHtml(x.id)+'</td><td>'+escapeHtml(x.text)+'<div>'+(x.tags??[]).map((t)=>'<span class="chip">'+escapeHtml(t)+'</span>').join('')+'</div></td><td>'+escapeHtml(x.category)+'</td><td>'+escapeHtml(x.schedule?.type??'n/a')+'</td><td>'+escapeHtml(x.target?.type??'n/a')+'</td><td class="mono">'+escapeHtml((x.created_at??'').slice(0,10))+'</td><td><button class="secondary" type="button" data-edit-id="'+escapeHtml(x.id)+'">Edit</button> <button class="danger" type="button" data-delete-id="'+escapeHtml(x.id)+'">Delete</button></td></tr>').join('');};
const loadQuestions=async()=>{const r=await fetch('/admin/questions?tenantId='+encodeURIComponent(el.tenantId.value));const b=await r.json();if(!r.ok){setStatus(el.status,'Failed to load questions: '+JSON.stringify(b));return;}state.questions=b.questions??[];renderList();setStatus(el.status,'Loaded '+String(state.questions.length)+' questions.');};
const saveQuestion=async()=>{try{const q=buildQuestion();if(q.text.length===0)throw new Error('Question text is required.');if(q.options.length<2)throw new Error('At least two options are required.');if(q.options.some((option)=>option.text.trim().length===0))throw new Error('Each option needs text.');let r; if(state.editingId===null){r=await fetch('/admin/questions/single',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenantId:el.tenantId.value,question:q})});} else {r=await fetch('/admin/questions/'+encodeURIComponent(state.editingId),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({tenantId:el.tenantId.value,question:q})});} const b=await r.json();if(!r.ok){setStatus(el.editorStatus,'Save failed: '+JSON.stringify(b));return;}setStatus(el.editorStatus,'Saved question '+String(b.questionId??state.editingId??''));await loadQuestions();closeModal();}catch(error){setStatus(el.editorStatus,{error:String(error)});}};
const deleteQuestion=async(id)=>{const r=await fetch('/admin/questions/'+encodeURIComponent(id)+'?tenantId='+encodeURIComponent(el.tenantId.value),{method:'DELETE'});const b=await r.json();if(!r.ok){setStatus(el.status,'Delete failed: '+JSON.stringify(b));return;}await loadQuestions();setStatus(el.status,'Deleted question '+id+'.');};

const renderPreviewQuestion=(question)=>{
if(question===null){previewRender.innerHTML='<div class="preview-card"><p class="hint" style="margin:0">No question scheduled for this profile/date.</p></div>';return;}
const optionsHtml=(question.options??[]).map((option,index)=>'<label class="preview-option"><input type="radio" name="preview-answer" '+(index===0?'checked':'')+' /> <span>'+escapeHtml(option.text)+'</span></label>').join('');
const commentsHtml=question.allowComments?'<label style="margin-top:10px;display:block">Optional comment</label><textarea rows="3" placeholder="Share context..."></textarea>':'';
previewRender.innerHTML='<div class="preview-card"><h3 style="margin:0 0 8px">'+escapeHtml(question.text)+'</h3><div class="preview-options">'+optionsHtml+'</div>'+commentsHtml+'<div style="margin-top:10px"><button type="button" class="primary" disabled>Submit (preview)</button></div></div>';
};

document.getElementById('add-question').addEventListener('click',openCreate);
document.getElementById('cancel-question').addEventListener('click',closeModal);
document.getElementById('save-question').addEventListener('click',()=>{saveQuestion().catch((e)=>setStatus(el.editorStatus,{error:String(e)}));});
document.getElementById('load-questions').addEventListener('click',()=>{loadQuestions().catch((e)=>setStatus(el.status,{error:String(e)}));});
el.search.addEventListener('input',renderList);
el.sort.addEventListener('change',renderList);
document.getElementById('tag-add').addEventListener('click',addTag);
tagInput.addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();addTag();}});
tagsList.addEventListener('click',(event)=>{const target=event.target;if(!(target instanceof HTMLElement)){return;}const indexValue=target.dataset.tagRemove;if(indexValue===undefined){return;}const index=Number.parseInt(indexValue,10);if(Number.isInteger(index)){state.editorTags.splice(index,1);renderTags();}});
document.getElementById('option-add').addEventListener('click',addOption);
optionTextInput.addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();addOption();}});
optionsList.addEventListener('input',(event)=>{const target=event.target;if(!(target instanceof HTMLInputElement)){return;}const textIndex=target.dataset.optionText;const pointsIndex=target.dataset.optionPoints;if(textIndex!==undefined){const index=Number.parseInt(textIndex,10);if(Number.isInteger(index)&&state.editorOptions[index]!==undefined){state.editorOptions[index].text=target.value;syncHiddenInputs();}}if(pointsIndex!==undefined){const index=Number.parseInt(pointsIndex,10);if(Number.isInteger(index)&&state.editorOptions[index]!==undefined){const points=Number.parseInt(target.value,10);state.editorOptions[index].points=Number.isFinite(points)?Math.max(0,points):0;syncHiddenInputs();}}});
optionsList.addEventListener('click',(event)=>{const target=event.target;if(!(target instanceof HTMLElement)){return;}const indexValue=target.dataset.optionRemove;if(indexValue===undefined){return;}const index=Number.parseInt(indexValue,10);if(Number.isInteger(index)){state.editorOptions.splice(index,1);renderOptions();}});
optionsList.addEventListener('dragstart',(event)=>{const target=event.target;if(!(target instanceof HTMLElement)){return;}const row=target.closest('[data-option-index]');if(!(row instanceof HTMLElement)){return;}const index=Number.parseInt(row.dataset.optionIndex??'',10);if(!Number.isInteger(index)){return;}state.draggedOptionIndex=index;row.classList.add('dragging');});
optionsList.addEventListener('dragend',()=>{state.draggedOptionIndex=null;optionsList.querySelectorAll('.option-item').forEach((row)=>row.classList.remove('dragging'));});
optionsList.addEventListener('dragover',(event)=>{event.preventDefault();});
optionsList.addEventListener('drop',(event)=>{event.preventDefault();const target=event.target;if(!(target instanceof HTMLElement)){return;}const row=target.closest('[data-option-index]');if(!(row instanceof HTMLElement)){return;}const toIndex=Number.parseInt(row.dataset.optionIndex??'',10);const fromIndex=state.draggedOptionIndex;if(!Number.isInteger(fromIndex)||!Number.isInteger(toIndex)||fromIndex===toIndex){return;}const moved=state.editorOptions[fromIndex];if(moved===undefined){return;}state.editorOptions.splice(fromIndex,1);state.editorOptions.splice(toIndex,0,moved);renderOptions();});
el.body.addEventListener('click',(ev)=>{const target=ev.target;if(!(target instanceof HTMLElement))return;const editId=target.dataset.editId;if(editId!==undefined){const q=state.questions.find((item)=>item.id===editId);if(q!==undefined)openEdit(q);return;}const deleteId=target.dataset.deleteId;if(deleteId!==undefined){deleteQuestion(deleteId).catch((e)=>setStatus(el.status,{error:String(e)}));}});
document.getElementById('run-schedule').addEventListener('click',()=>{const params=new URLSearchParams({tenantId:el.tenantId.value,startDate:document.getElementById('schedule-start').value,days:document.getElementById('schedule-days').value,timeZone:document.getElementById('schedule-timezone').value,managerEmail:document.getElementById('schedule-manager').value,managerAncestryEmails:document.getElementById('schedule-ancestry').value,groupIds:document.getElementById('schedule-groups').value});fetch('/admin/schedule?'+params.toString()).then((r)=>r.json().then((b)=>({r,b}))).then(({r,b})=>{const root=document.getElementById('schedule-results');if(!r.ok){root.innerHTML='<div class="status">'+escapeHtml(JSON.stringify(b,null,2))+'</div>';return;}root.innerHTML=(b.days??[]).map((item)=>'<div class="status" style="margin-top:8px"><strong>'+escapeHtml(item.localDate)+'</strong> - '+escapeHtml(item.question===null?'No question':item.question.text)+'\\n'+escapeHtml(item.reason)+'</div>').join('');}).catch((e)=>{document.getElementById('schedule-results').innerHTML='<div class="status">'+escapeHtml(String(e))+'</div>';});});
document.getElementById('run-preview').addEventListener('click',()=>{const role=document.getElementById('preview-role').value.trim();const level=document.getElementById('preview-level').value.trim();fetch('/admin/preview',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenantId:el.tenantId.value,timestampUtcIso:document.getElementById('preview-date').value,timeZone:document.getElementById('preview-timezone').value,profile:{managerEmail:document.getElementById('preview-manager').value||undefined,managerAncestryEmails:parseCsv(document.getElementById('preview-ancestry').value),groupIds:parseCsv(document.getElementById('preview-groups').value)}})}).then((r)=>r.json().then((b)=>({r,b}))).then(({r,b})=>{if(!r.ok){setStatus(document.getElementById('preview-status'),'Preview failed: '+JSON.stringify(b));previewRender.innerHTML='';return;}setStatus(document.getElementById('preview-status'),'Preview ready for role '+role+' / '+level);renderPreviewQuestion(b.question);}).catch((e)=>setStatus(document.getElementById('preview-status'),{error:String(e)}));});
document.getElementById('schedule-start').value=new Date().toISOString().slice(0,10);
clearForm();
refreshConditional();
loadQuestions().catch((e)=>setStatus(el.status,{error:String(e)}));
</script>
</body>
</html>`;
