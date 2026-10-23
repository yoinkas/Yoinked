/* WriteUp — Notion-style block editor for CTF writeups.
   Public API is exported on window.WriteUp so the add-on scripts
   (ai.js, search.js, mediaupload.js, pasteimg.js, ui.js) can hook in. */
(function(){
'use strict';
var editor=document.getElementById('editor');
var noteTitle=document.getElementById('note-title');
var saveStatus=document.getElementById('save-status');
var saveText=document.getElementById('save-text');
var wordCount=document.getElementById('word-count');
var blockCount=document.getElementById('block-count');
var charsCount=document.getElementById('chars-count');
var slashMenu=document.getElementById('slash-menu');
var fmtBar=document.getElementById('format-toolbar');
var colorPop=document.getElementById('color-pop');
var textGrid=document.getElementById('text-color-grid');
var bgGrid=document.getElementById('bg-color-grid');
var toastEl=document.getElementById('toast');
var notesList=document.getElementById('notes-list');
var sideCount=document.getElementById('side-count');
var sideSearch=document.getElementById('side-search');
var sidebar=document.getElementById('sidebar');
var KEY='writeup_notes_v4';
var notes=[],curId=null,uidN=0,saveTimer=null,toastTimer=null,titleOwner=null;
var slash={open:false,filter:'',sel:0,items:[],anchorBlock:null};
var savedRange=null,colorMode='text';
var COMMANDS=[
 {g:'Suggested',cmd:'box',icon:'fa-solid fa-cube',t:'Box info card',d:'HTB / THM machine card',key:''},
 {g:'Suggested',cmd:'table',icon:'fa-solid fa-table',t:'Table',d:'Rows and columns for command output',key:'|'},
 {g:'Suggested',cmd:'toc',icon:'fa-solid fa-list-ol',t:'Table of contents',d:'Built from your headings',key:''},
 {g:'Suggested',cmd:'code',icon:'fa-solid fa-code',t:'Code',d:'Syntax-highlighted code block',key:'```'},
 {g:'Basic',cmd:'text',icon:'fa-solid fa-paragraph',t:'Text',d:'Plain paragraph',key:''},
 {g:'Basic',cmd:'h1',icon:'fa-solid fa-heading',t:'Heading 1',d:'Large title',key:'#'},
 {g:'Basic',cmd:'h2',icon:'fa-solid fa-heading',t:'Heading 2',d:'Medium title',key:'##'},
 {g:'Basic',cmd:'h3',icon:'fa-solid fa-heading',t:'Heading 3',d:'Small title',key:'###'},
 {g:'Basic',cmd:'h4',icon:'fa-solid fa-heading',t:'Heading 4',d:'Sub-heading',key:'####'},
 {g:'Basic',cmd:'bullet',icon:'fa-solid fa-list-ul',t:'Bulleted list',d:'Bulleted item',key:'-'},
 {g:'Basic',cmd:'numbered',icon:'fa-solid fa-list-ol',t:'Numbered list',d:'Ordered item',key:'1.'},
 {g:'Basic',cmd:'todo',icon:'fa-solid fa-square-check',t:'To-do list',d:'Checkbox task',key:'[]'},
 {g:'Basic',cmd:'toggle',icon:'fa-solid fa-chevron-right',t:'Toggle list',d:'Collapsible section',key:'>'},
 {g:'Basic',cmd:'quote',icon:'fa-solid fa-quote-right',t:'Quote',d:'Callout quote',key:'>'},
 {g:'Basic',cmd:'callout',icon:'fa-solid fa-circle-exclamation',t:'Callout',d:'Box with icon',key:'!'},
 {g:'Basic',cmd:'divider',icon:'fa-solid fa-minus',t:'Divider',d:'Horizontal line',key:'---'},
 {g:'Media',cmd:'image',icon:'fa-solid fa-image',t:'Image',d:'Upload or link an image',key:''},
 {g:'Media',cmd:'video',icon:'fa-solid fa-play',t:'Video',d:'YouTube / mp4 embed',key:''},
 {g:'Media',cmd:'audio',icon:'fa-solid fa-volume-high',t:'Audio',d:'Embed an audio file',key:''},
 {g:'Media',cmd:'file',icon:'fa-solid fa-file-arrow-down',t:'File',d:'Link to a script or wordlist',key:''},
 {g:'Media',cmd:'embed',icon:'fa-solid fa-window-maximize',t:'Embed',d:'Any iframe URL',key:''},
 {g:'Media',cmd:'link',icon:'fa-solid fa-bookmark',t:'Web bookmark',d:'Link card',key:''},
 {g:'Media',cmd:'page',icon:'fa-solid fa-file-lines',t:'Link to page',d:'Reference another writeup',key:''},
 {g:'Advanced',cmd:'breadcrumb',icon:'fa-solid fa-angles-right',t:'Breadcrumb',d:'Show the writeup path',key:''},
 {g:'Advanced',cmd:'button',icon:'fa-solid fa-hand-pointer',t:'Button',d:'Link styled as a button',key:''},
 {g:'Advanced',cmd:'equation',icon:'fa-solid fa-function',t:'Equation',d:'LaTeX math block',key:'$'},
 {g:'Advanced',cmd:'tip',icon:'fa-solid fa-lightbulb',t:'Tip',d:'A tip that opens in a popup',key:''},
 {g:'Advanced',cmd:'mermaid',icon:'fa-solid fa-diagram-project',t:'Diagram',d:'Mermaid flowchart or graph',key:''},
 {g:'Advanced',cmd:'checklist',icon:'fa-solid fa-list-check',t:'Checklist',d:'Every to-do in this writeup',key:''},
 {g:'Advanced',cmd:'timer',icon:'fa-solid fa-stopwatch',t:'Timer',d:'Time how long a step took',key:''},
 {g:'Advanced',cmd:'tag',icon:'fa-solid fa-tag',t:'Tag',d:'Label this writeup',key:''}
];
var CONTAINER_TYPES={toggle:1};
function isContainer(t){return !!CONTAINER_TYPES[t];}var LANGS=['plaintext','bash','python','javascript','typescript','html','css','json','sql','csharp','cpp','java','go','rust','php','ruby','powershell','markdown','yaml'];
var TEXTCOLORS=['#e6e9f0','#9aa3b5','#ffffff','#6c7bff','#3fb97f','#e5b45c','#e5606e','#f472b6','#22d3ee','#a78bfa','#000000','#166534','#1d4ed8','#9d6bff','#b45309','#be123c'];
var HLCOLORS=['transparent','#fef08a','#bbf7d0','#bfdbfe','#fecaca','#e9d5ff','#fed7aa','#a5f3fc','#6c7bff','#1f2937','#166534','#1e3a8a','#7c2d12','#831843'];
function uid(p){uidN++;return (p||'b')+'-'+Date.now().toString(36)+'-'+uidN;}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function stripTags(s){var d=document.createElement('div');d.innerHTML=s||'';return d.textContent||'';}
function txt(el){if(!el)return '';var t=el.innerText;return (t==null?el.textContent:t)||'';}
function toast(m){toastEl.textContent=m;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){toastEl.classList.remove('show');},2200);}
function toastAction(m,label,fn){
  toastEl.innerHTML='<span>'+esc(m)+'</span><button class="toast-btn" type="button">'+esc(label)+'</button>';
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){toastEl.classList.remove('show');toastEl.innerHTML='';},6000);
  var b=toastEl.querySelector('.toast-btn');
  if(b)b.addEventListener('click',function(e){
    e.stopPropagation();
    toastEl.classList.remove('show');toastEl.innerHTML='';
    try{fn();}catch(err){}
  });
}
function debounce(fn,ms){var t;return function(){clearTimeout(t);var a=arguments,s=this;t=setTimeout(function(){fn.apply(s,a);},ms);};}
var updateStats=debounce(updateStatsRaw,120);
function cur(){for(var i=0;i<notes.length;i++){if(notes[i].id===curId)return notes[i];}return notes[0]||null;}
function load(){try{var d=localStorage.getItem(KEY);if(d){notes=JSON.parse(d)||[];}}catch(e){notes=[];}}
/* IndexedDB is the primary store (no 5MB cap); localStorage stays as a
   mirror + fallback so nothing is ever lost to a quota error. */
function persist(){
  try{localStorage.setItem(KEY,JSON.stringify(notes));}catch(e){}
  try{localStorage.setItem('writeup_notes_active',curId||'');}catch(e){}
  if(window.Storage&&Storage.persist){try{Storage.persist(notes);}catch(e){}}
  else if(!window.Storage){try{localStorage.setItem(KEY,JSON.stringify(notes));}catch(e){toast('Storage full — image too large');}}
}
function setStatus(s,t){
  var state=s||'unsaved';
  if(saveStatus){
    saveStatus.className='status '+state;
    var lbl=state==='saved'?'Saved':state==='saving'?'Saving…':'Unsaved';
    var ico=state==='saved'?'fa-check':state==='saving'?'fa-circle-notch':'fa-circle-exclamation';
    saveStatus.innerHTML='<i class="fa-solid '+ico+'"></i><span>'+lbl+'</span>';
  }
  if(saveText)saveText.textContent=state==='saved'?'All changes saved':state==='saving'?'Saving…':'Unsaved changes';
}
function markDirty(){setStatus('unsaved');clearTimeout(saveTimer);saveTimer=setTimeout(function(){saveNow();},900);}
function saveNow(){var n=cur();if(!n)return;setStatus('saving');readDOM(n);if(titleOwner===n.id)n.title=noteTitle.value||'Untitled';n.updatedAt=Date.now();persist();setStatus('saved');updateStats();updateTitleMeta();renderNotes();}
function phFor(t){var m={h1:'Heading 1',h2:'Heading 2',h3:'Heading 3',bullet:'List item',numbered:'List item',todo:'To-do',quote:'Quote',callout:'Callout',code:'Write code...'};return m[t]||'Type / for commands...';}
function mkBlock(type,html){return {id:uid(),type:type||'text',html:html||''};}
function mkBox(){return {id:uid(),type:'box',html:'',box:{name:'',platform:'HTB',difficulty:'Easy',os:'Linux',cover:''}};}
var PLATS=['HTB','THM','VulnHub','PG','Other'];
var DIFFS=['Very Easy','Easy','Medium','Hard','Insane'];
var OSS=['Linux','Windows','Other'];
function platLabel(p){var m={HTB:'Hack The Box',THM:'TryHackMe',VulnHub:'VulnHub',PG:'Proving Grounds',Other:'Other'};return m[p]||p;}
function selField(label,cls,opts,val){var s='<label class="box-field">'+label+'<select class="'+cls+'">';for(var i=0;i<opts.length;i++){s+='<option'+(opts[i]===val?' selected':'')+'>'+esc(opts[i])+'</option>';}return s+'</select></label>';}
function buildBoxCard(b){
var bx=b.box||{};
var pn=bx.platform||'HTB',df=bx.difficulty||'Easy',os=bx.os||'Linux',cv=bx.cover||'';
var dcls=df.replace(/\s/g,'');
var card=document.createElement('div');card.className='box-card';
var coverTop=cv?'<div class="box-cover"><img src="'+cv+'" alt="Box cover"></div>':'';
card.innerHTML=coverTop
+'<div class="box-top"><span class="box-plat plat-'+esc(pn)+'">'+esc(platLabel(pn))+'</span><span class="box-diff diff-'+esc(dcls)+'">'+esc(df)+'</span></div>'
+'<input class="box-name" placeholder="Box name..." value="'+esc(bx.name||'')+'" autocomplete="off">'
+'<div class="box-cover-row">'
+'<div class="box-cover-thumbwrap"'+(cv?'':' style="display:none"')+'><img class="box-cover-thumb" src="'+cv+'" alt=""></div>'
+'<div class="box-cover-actions"><button class="btn box-cover-btn" type="button"><i class="fa-solid fa-upload"></i><span>'+(cv?'Change':'Upload cover')+'</span></button>'+(cv?'<button class="btn box-cover-rm" type="button">Remove</button>':'')+'</div>'
+'<input type="file" class="box-cover-file file-hidden" accept="image/*">'
+'<input type="hidden" class="box-cover-data" value="'+cv+'">'
+'</div>'
+'<div class="box-grid">'
+selField('Platform','box-platform',PLATS,pn)
+selField('Difficulty','box-difficulty',DIFFS,df)
+selField('OS','box-os',OSS,os)
+'</div>';
return card;
}
function videoEmbed(url){
url=(url||'').trim();if(!url)return '<div class="vid-link">No video URL</div>';
var yt=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
if(yt)return '<div class="vid-frame"><iframe src="https://www.youtube.com/embed/'+yt[1]+'" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div>';
var vm=url.match(/vimeo\.com\/(\d+)/);
if(vm)return '<div class="vid-frame"><iframe src="https://player.vimeo.com/video/'+vm[1]+'" frameborder="0" allowfullscreen></iframe></div>';
if(/\.(mp4|webm|ogg)(\?|$)/i.test(url))return '<div class="vid-frame"><video src="'+esc(url)+'" controls></video></div>';
return '<div class="vid-link">Unsupported video: <a href="'+esc(url)+'" target="_blank" rel="noopener">open</a></div>';
}
function linkCard(b){
var url=b.url||'',title=b.title||url;
return '<a class="bookmark" href="'+esc(url)+'" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i><div style="min-width:0"><div style="font-weight:700">'+esc(title)+'</div><div style="font-size:12px;color:var(--muted);word-break:break-all">'+esc(url)+'</div></div></a>';
}
function contentEl(el){return el?el.querySelector('.block-content'):null;}
var CALLOUT_VARIANTS=['info','success','warning','danger','tip'];
var CALLOUT_ICON={info:'fa-circle-info',success:'fa-circle-check',warning:'fa-triangle-exclamation',danger:'fa-circle-exclamation',tip:'fa-lightbulb'};
/* ---------- extra block builders ---------- */
function buildTableBlock(b){
  var wrap=document.createElement('div');wrap.className='table-wrap';
  var tbl=document.createElement('table');tbl.className='tbl';
  var rows=(b.rows&&b.rows.length)?b.rows:[['',''],['','']];
  var useHead=b.header!==false;
  for(var r=0;r<rows.length;r++){
    var tr=document.createElement('tr');tr.className='tbl-row';
    var tag=(r===0&&useHead)?'th':'td';
    for(var c=0;c<rows[r].length;c++){
      var cell=document.createElement(tag);
      cell.className='tbl-cell';cell.setAttribute('contenteditable','true');
      cell.setAttribute('data-placeholder',(r===0&&useHead)?'Column':'—');
      cell.innerHTML=rows[r][c]||'';
      tr.appendChild(cell);
    }
    tbl.appendChild(tr);
  }
  wrap.appendChild(tbl);
  var tools=document.createElement('div');tools.className='table-tools';
  tools.innerHTML='<button type="button" data-tbl="row" title="Add row"><i class="fa-solid fa-plus"></i> Row</button>'
    +'<button type="button" data-tbl="col" title="Add column"><i class="fa-solid fa-plus"></i> Col</button>'
    +'<button type="button" data-tbl="head" title="Toggle the header row"><i class="fa-solid fa-table-cells-large"></i> Header</button>'
    +'<button type="button" data-tbl="del" title="Delete table" class="danger"><i class="fa-solid fa-trash"></i></button>';
  return wrap;
}
function pageLinkHtml(b){
  var opts='<option value="">Choose a writeup…</option>';
  for(var i=0;i<notes.length;i++){
    var n=notes[i];
    if(n.id===curId)continue;
    opts+='<option value="'+esc(n.id)+'"'+(b.noteId===n.id?' selected':'')+'>'+esc(n.title||'Untitled')+'</option>';
  }
  var linked=b.noteId?findNote(b.noteId):null;
  var label=b.label||(linked?linked.title:'');
  return '<div class="page-link">'
    +'<i class="fa-solid fa-file-lines"></i>'
    +'<select class="page-select">'+opts+'</select>'
    +'<a class="page-open" data-open-note="'+esc(b.noteId||'')+'" href="#note='+esc(b.noteId||'')+'"><span>'+esc(label||'open writeup')+'</span></a>'
    +'</div>';
}
function crumbHtml(){
  var n=cur();var bx=n?boxOf(n):null;
  var parts=['<span>Writeups</span>'];
  if(bx&&bx.name)parts.push('<span>'+esc(bx.name)+'</span>');
  if(n&&n.title)parts.push('<span class="crumb-cur">'+esc(n.title)+'</span>');
  return '<div class="crumbs">'+parts.join('<i class="fa-solid fa-angle-right"></i>')+'</div>';
}
function tocBlockHtml(){
  var eds=editor.querySelectorAll('.block');
  var h='';
  for(var i=0;i<eds.length;i++){
    var t=eds[i].getAttribute('data-type');
    if(t!=='h1'&&t!=='h2'&&t!=='h3'&&t!=='h4')continue;
    var c=childByClass(eds[i],'block-content');
    var label=txt(c).trim();
    if(!label)continue;
    h+='<a class="toc-row lvl-'+parseInt(t.slice(1),10)+'" data-toc-block="'+esc(eds[i].getAttribute('data-id'))+'">'+esc(label)+'</a>';
  }
  if(!h)return '<div class="toc-empty">No headings yet — add an H1, H2 or H3 block above.</div>';
  return h;
}
function renderEquation(el){
  var inner=el.querySelector('.eq-inner');
  if(!inner)return;
  var latex=(el.getAttribute('data-latex')||inner.textContent||'').trim();
  if(!latex)return;
  if(window.katex&&window.katex.renderToString){
    try{
      var html=window.katex.renderToString(latex,{throwOnError:false,displayMode:true,output:'html'});
      inner.innerHTML=html;
      inner.setAttribute('data-rendered','1');
      return;
    }catch(e){}
  }
  inner.setAttribute('data-rendered','0');
  inner.textContent=latex;
}
function buildEquationBlock(b){
  var wrap=document.createElement('div');wrap.className='eq-inner';
  wrap.setAttribute('contenteditable','true');
  wrap.setAttribute('data-placeholder','e.g. 2^{n} \\bmod m');
  wrap.textContent=b.latex||'';
  return wrap;
}
function buildFileBlock(b){
  var a=document.createElement('a');a.className='file-card';
  a.href=b.url||'#';a.target='_blank';a.rel='noopener';
  a.innerHTML='<i class="fa-solid fa-file-arrow-down"></i><div class="file-meta"><div class="file-name">'+esc(b.name||b.url||'File')+'</div><div class="file-sub">'+esc(b.url||'')+'</div></div>';
  return a;
}
function buildAudioBlock(b){
  var wrap=document.createElement('div');wrap.className='audio-wrap';
  wrap.innerHTML='<i class="fa-solid fa-volume-high"></i><audio controls preload="metadata" src="'+esc(b.src||'')+'"></audio>';
  return wrap;
}
function buildButtonBlock(b){
  var a=document.createElement('a');a.className='btn-block';
  a.href=b.url||'#';a.target='_blank';a.rel='noopener';
  a.innerHTML='<span class="btn-block-label">'+esc(b.label||'Button')+'</span>';
  return a;
}
function blockEl(b){
var el=document.createElement('div');
el.className='block';el.setAttribute('data-type',b.type);el.setAttribute('data-id',b.id);
var rail=document.createElement('div');rail.className='block-rail';
var drag=document.createElement('div');drag.className='drag-handle';drag.title='Drag to reorder';drag.innerHTML='<i class="fa-solid fa-grip-vertical"></i>';
rail.appendChild(drag);
if(b.type==='box'){el.appendChild(buildBoxCard(b));wireBox(el);}
else{
var c=document.createElement('div');c.className='block-content';
var t=b.type;
if(t==='todo'){c.contentEditable='true';c.setAttribute('data-placeholder','To-do');c.innerHTML='<span class="todo-box'+(b.checked?' done':'')+'" contenteditable="false">'+(b.checked?'<i class="fa-solid fa-check"></i>':'')+'</span>'+(b.html||'');}
else if(t==='code'){c.contentEditable='true';c.setAttribute('data-placeholder','Write code...');c.setAttribute('spellcheck','false');c.innerHTML=highlightCode(trimCode(b.src||''),b.lang||'bash');el.appendChild(buildCodeHead(b));}
else if(t==='divider'){c.innerHTML='<div class="divider-line"></div>';}
else if(t==='image'){c.innerHTML='<div class="img-wrap"><img src="'+esc(b.src||'')+'" alt=""></div><div class="img-cap" contenteditable="true" data-placeholder="Add a caption...">'+(b.caption||'')+'</div>';}
else if(t==='video'){c.innerHTML=videoEmbed(b.src);}
else if(t==='embed'){c.innerHTML='<div class="embed-frame"><iframe src="'+esc(b.src||'')+'" loading="lazy"></iframe></div>';}
else if(t==='link'){c.innerHTML=linkCard(b);}
else if(t==='audio'){c.appendChild(buildAudioBlock(b));}
else if(t==='file'){c.appendChild(buildFileBlock(b));}
else if(t==='page'){c.innerHTML=pageLinkHtml(b);}
else if(t==='button'){c.appendChild(buildButtonBlock(b));}
else if(t==='breadcrumb'){c.innerHTML=crumbHtml();}
else if(t==='equation'){c.appendChild(buildEquationBlock(b));}
else if(t==='toc'){c.classList.add('toc-block');c.innerHTML=tocBlockHtml();}
else if(t==='mermaid'){
  c.classList.add('mermaid-block');
  c.innerHTML='<div class="mermaid-src" contenteditable="true" data-placeholder="graph TD; A-->B;"></div><div class="mermaid-out"></div>';
  var ms=c.querySelector('.mermaid-src');
  if(b.src)ms.textContent=b.src;
}
else if(t==='checklist'){c.classList.add('checklist-block');}
else if(t==='timer'){c.classList.add('timer-block');}
else if(t==='tip'){
  c.contentEditable='true';c.setAttribute('data-placeholder','Tip title…');c.classList.add('tip-title');
  c.innerHTML=b.html||'';
  var tipBtn=document.createElement('button');tipBtn.type='button';tipBtn.className='tip-open';
  tipBtn.setAttribute('contenteditable','false');tipBtn.title='Open this tip in the side panel';
  tipBtn.innerHTML='<i class="fa-solid fa-arrow-right"></i> Click for a tip';
  el.appendChild(tipBtn);
}
else if(t==='table'){c.appendChild(buildTableBlock(b));}
else if(t==='toggle'){
  c.contentEditable='true';c.setAttribute('data-placeholder','Toggle title');
  c.classList.add('toggle-head');c.innerHTML=b.html||'';
  var arrow=document.createElement('button');arrow.type='button';arrow.className='toggle-arrow';
  arrow.title='Expand / collapse';arrow.setAttribute('contenteditable','false');
  arrow.innerHTML='<i class="fa-solid fa-chevron-right"></i>';
  el.appendChild(arrow);
  if(b.open)el.classList.add('open');
}
else{c.contentEditable='true';c.setAttribute('data-placeholder',phFor(t));c.innerHTML=b.html||'';}
el.appendChild(c);
if(isContainer(t)){
  var kids=document.createElement('div');kids.className='block-children';
  el.appendChild(kids);
  var ch=(b.children&&b.children.length)?b.children:[];
  for(var k=0;k<ch.length;k++)kids.appendChild(blockEl(ch[k]));
}
}
var add=document.createElement('div');add.className='block-add';add.title='Add block below';add.innerHTML='<i class="fa-solid fa-plus"></i>';
rail.appendChild(add);
var del=document.createElement('button');del.className='block-del';del.type='button';del.title='Delete block';del.setAttribute('contenteditable','false');del.innerHTML='<i class="fa-solid fa-trash"></i>';
rail.appendChild(del);
el.appendChild(rail);
if(b.type==='code'){el.setAttribute('data-lang',b.lang||'bash');el.setAttribute('data-theme',b.theme||'code');el.setAttribute('data-cmode','code');el.setAttribute('data-lines',b.lines?'1':'0');}
if(b.type==='todo'&&b.checked)el.classList.add('checked');
if(b.type==='callout'){
  var cv=b.variant||'info';
  el.setAttribute('data-variant',cv);
  var kb=document.createElement('button');kb.type='button';kb.className='callout-kind v-'+cv;
  kb.setAttribute('contenteditable','false');kb.title='Callout style: '+cv+' (click to change)';
  kb.innerHTML='<i class="fa-solid '+(CALLOUT_ICON[cv]||CALLOUT_ICON.info)+'"></i>';
  el.appendChild(kb);
}
if(b.type==='video'||b.type==='embed')el.setAttribute('data-src',b.src||'');
if(b.type==='link'){el.setAttribute('data-url',b.url||'');el.setAttribute('data-title',b.title||'');}
if(b.type==='audio'){el.setAttribute('data-src',b.src||'');el.setAttribute('data-caption',b.caption||'');}
if(b.type==='file'){el.setAttribute('data-name',b.name||'');el.setAttribute('data-url',b.url||'');}
if(b.type==='page'){el.setAttribute('data-note',b.noteId||'');el.setAttribute('data-label',b.label||'');}
if(b.type==='button'){el.setAttribute('data-label',b.label||'');el.setAttribute('data-url',b.url||'');}
if(b.type==='equation')el.setAttribute('data-latex',b.latex||'');
if(b.type==='table')el.setAttribute('data-header',b.header===false?'0':'1');
if(b.type==='tip')el.setAttribute('data-body',b.body||'');
return el;
}
function readBoxFromEl(el,id){
var card=el.querySelector('.box-card');
function q(sel){return card?card.querySelector(sel):null;}
var data=q('.box-cover-data');
return {id:id,type:'box',html:'',box:{
name:(q('.box-name')||{}).value||'',
platform:(q('.box-platform')||{}).value||'HTB',
difficulty:(q('.box-difficulty')||{}).value||'Easy',
os:(q('.box-os')||{}).value||'Linux',
cover:data?(data.value||''):''
}};
}
function childByClass(el,cls){
  if(!el)return null;
  for(var i=0;i<el.children.length;i++){
    if(el.children[i].classList&&el.children[i].classList.contains(cls))return el.children[i];
  }
  return null;
}
function childBlocks(el){
  var out=[];
  if(!el)return out;
  for(var i=0;i<el.children.length;i++){
    if(el.children[i].classList&&el.children[i].classList.contains('block'))out.push(el.children[i]);
  }
  return out;
}
function readTableRows(el){
  var tbl=el.querySelector('table');if(!tbl)return [];
  var out=[],rs=tbl.rows;
  for(var i=0;i<rs.length;i++){
    var cells=rs[i].cells,row=[];
    for(var j=0;j<cells.length;j++)row.push(cells[j].innerHTML);
    out.push(row);
  }
  return out;
}
function findBlockRec(arr,id){
  if(!arr)return null;
  for(var i=0;i<arr.length;i++){
    if(arr[i].id===id)return arr[i];
    if(arr[i].children){var r=findBlockRec(arr[i].children,id);if(r)return r;}
  }
  return null;
}
function containerOf(n,id){
  if(!n||!n.blocks)return null;
  for(var i=0;i<n.blocks.length;i++){
    if(n.blocks[i].id===id)return {arr:n.blocks,index:i,block:n.blocks[i]};
    if(n.blocks[i].children){
      var r=containerOf({blocks:n.blocks[i].children},id);
      if(r)return r;
    }
  }
  return null;
}
function readAllBlocks(root){
  var out=[];
  if(!root)return out;
  var els=childBlocks(root);
  for(var i=0;i<els.length;i++){
    var el=els[i];var t=el.getAttribute('data-type');var id=el.getAttribute('data-id');
    var c=childByClass(el,'block-content');
    if(t==='box'){out.push(readBoxFromEl(el,id));}
    else if(t==='code'){out.push({id:id,type:'code',src:trimCode(txt(c)),lang:el.getAttribute('data-lang')||'bash',theme:el.getAttribute('data-theme')||'code',lines:el.getAttribute('data-lines')==='1'});}
    else if(t==='todo'){var tc=c?c.cloneNode(true):null;var tb=tc?tc.querySelector('.todo-box'):null;if(tb)tb.remove();out.push({id:id,type:'todo',html:stripTokenMarkup(tc?tc.innerHTML:''),checked:el.classList.contains('checked')});}
    else if(t==='image'){var im=el.querySelector('.img-wrap img');var cap=el.querySelector('.img-cap');out.push({id:id,type:'image',src:im?im.getAttribute('src'):'',caption:cap?cap.innerHTML:''});}
    else if(t==='video'||t==='embed'){out.push({id:id,type:t,src:el.getAttribute('data-src')||''});}
    else if(t==='link'){out.push({id:id,type:'link',url:el.getAttribute('data-url')||'',title:el.getAttribute('data-title')||''});}
    else if(t==='divider'){out.push({id:id,type:'divider'});}
    else if(t==='callout'){out.push({id:id,type:'callout',html:stripTokenMarkup(c?c.innerHTML:''),variant:el.getAttribute('data-variant')||'info'});}
    else if(t==='audio'){out.push({id:id,type:'audio',src:el.getAttribute('data-src')||'',caption:el.getAttribute('data-caption')||''});}
    else if(t==='file'){out.push({id:id,type:'file',name:el.getAttribute('data-name')||'',url:el.getAttribute('data-url')||''});}
    else if(t==='page'){out.push({id:id,type:'page',noteId:el.getAttribute('data-note')||'',label:el.getAttribute('data-label')||''});}
    else if(t==='button'){out.push({id:id,type:'button',label:el.getAttribute('data-label')||'',url:el.getAttribute('data-url')||''});}
    else if(t==='breadcrumb'){out.push({id:id,type:'breadcrumb'});}
    else if(t==='equation'){out.push({id:id,type:'equation',latex:el.getAttribute('data-latex')||txt(c)});}
    else if(t==='toc'){out.push({id:id,type:'toc'});}
    else if(t==='tip'){out.push({id:id,type:'tip',html:c?c.innerHTML:'',body:el.getAttribute('data-body')||''});}
    else if(t==='mermaid'){var msrc=c?c.querySelector('.mermaid-src'):null;out.push({id:id,type:'mermaid',src:msrc?msrc.textContent:''});}
    else if(t==='checklist'){out.push({id:id,type:'checklist',showDone:el.getAttribute('data-show-done')!=='0'});}
    else if(t==='timer'){out.push({id:id,type:'timer',startedAt:Number(el.getAttribute('data-started')||0),elapsed:Number(el.getAttribute('data-elapsed')||0),running:el.getAttribute('data-running')==='1'});}
    else if(t==='table'){out.push({id:id,type:'table',header:el.getAttribute('data-header')!=='0',rows:readTableRows(el)});}
    else if(t==='toggle'){out.push({id:id,type:'toggle',html:c?c.innerHTML:'',open:el.classList.contains('open'),children:readAllBlocks(childByClass(el,'block-children'))});}
    else{out.push({id:id,type:t,html:stripTokenMarkup(c?c.innerHTML:'')});}
  }
  return out;
}
function readDOM(n){if(!n)return;var b=readAllBlocks(editor);if(b.length||n.blocks&&n.blocks.length)n.blocks=b;}function focusBlock(el,atEnd){
if(!el)return;var c=contentEl(el);if(!c)return;
c.focus();
if(atEnd!==false){var r=document.createRange();r.selectNodeContents(c);r.collapse(false);var s=window.getSelection();s.removeAllRanges();s.addRange(r);}
}
function postRender(){
  var tocs=editor.querySelectorAll('.block[data-type=toc]');
  for(var i=0;i<tocs.length;i++){
    var inner=childByClass(tocs[i],'block-content');
    if(!inner)continue;
    var html=tocBlockHtml();
    if(inner.innerHTML!==html)inner.innerHTML=html;
  }
  var eqs=editor.querySelectorAll('.block[data-type=equation]');
  for(var j=0;j<eqs.length;j++)renderEquation(eqs[j]);
  if(window.WriteUpTips&&window.WriteUpTips.render){try{window.WriteUpTips.render();}catch(e){}}
  if(window.WriteUpExtras&&window.WriteUpExtras.refresh){try{window.WriteUpExtras.refresh();}catch(e){}}
}
function render(){
var n=cur();
noteTitle.value=n?(n.title||''):'';
titleOwner=n?n.id:null;
editor.innerHTML='';
if(n){
var frag=document.createDocumentFragment();
var bl=n.blocks&&n.blocks.length?n.blocks:[mkBlock('text','')];
for(var i=0;i<bl.length;i++){frag.appendChild(blockEl(bl[i]));}
editor.appendChild(frag);
var __nums=editor.querySelectorAll('.block[data-type=numbered]');for(var __q=0;__q<__nums.length;__q++){var __pv=__nums[__q].previousElementSibling;if(!__pv||__pv.getAttribute('data-type')!=='numbered')__nums[__q].style.counterReset='num';}
}
postRender();
renderNotes();updateStats();updateTitleMeta();
}
function langIdx(l){for(var i=0;i<LANGS.length;i++){if(LANGS[i]===l)return i;}return 0;}
var COVER_MAX=1280;
function fileToCoverData(file,cb){
var r=new FileReader();
r.onload=function(){
var img=new Image();
img.onload=function(){
var w=img.width,h=img.height,sc=Math.min(1,COVER_MAX/Math.max(w,h));
var cw=Math.max(1,Math.round(w*sc)),ch=Math.max(1,Math.round(h*sc));
var cvs=document.createElement('canvas');cvs.width=cw;cvs.height=ch;
var ctx=cvs.getContext('2d');ctx.drawImage(img,0,0,cw,ch);
var out='';try{out=cvs.toDataURL('image/jpeg',0.82);}catch(e){out=r.result;}
cb(out);
};
img.onerror=function(){cb(r.result);};
img.src=r.result;
};
r.onerror=function(){cb('');};
r.readAsDataURL(file);
}
function boxCardOf(blk){return blk?blk.querySelector('.box-card'):null;}
function applyBoxCover(blk,url){
var card=boxCardOf(blk);if(!card)return;
var data=card.querySelector('.box-cover-data');if(data)data.value=url;
var top=card.querySelector('.box-cover');
if(url){
if(!top){top=document.createElement('div');top.className='box-cover';var im=document.createElement('img');im.setAttribute('alt','Box cover');top.appendChild(im);card.insertBefore(top,card.firstChild);}
var ti=top.querySelector('img');if(ti)ti.setAttribute('src',url);
var tw=card.querySelector('.box-cover-thumbwrap');if(tw)tw.style.display='';
var tt=card.querySelector('.box-cover-thumb');if(tt){tt.setAttribute('src',url);}
var btn=card.querySelector('.box-cover-btn span');if(btn)btn.textContent='Change';
if(!card.querySelector('.box-cover-rm')){var rm=document.createElement('button');rm.className='btn box-cover-rm';rm.type='button';rm.textContent='Remove';rm.addEventListener('click',function(ev){ev.stopPropagation();clearBoxCover(blk);});var acts=card.querySelector('.box-cover-actions');if(acts)acts.appendChild(rm);}
}else{
if(top)top.remove();
var tw2=card.querySelector('.box-cover-thumbwrap');if(tw2)tw2.style.display='none';
var tt2=card.querySelector('.box-cover-thumb');if(tt2)tt2.removeAttribute('src');
var btn2=card.querySelector('.box-cover-btn span');if(btn2)btn2.textContent='Upload cover';
var rm2=card.querySelector('.box-cover-rm');if(rm2)rm2.remove();
}
saveNow();
}
function clearBoxCover(blk){applyBoxCover(blk,'');}
function editImageSrc(blk){
var im=blk.querySelector('.img-wrap img');if(!im)return;
var url=prompt('Image URL:',im.getAttribute('src')||'');
if(url===null)return;url=url.trim();
im.setAttribute('src',url);saveNow();
}
function editVideoSrc(blk){
var cur=blk.getAttribute('data-src')||'';
var url=prompt('Video URL (YouTube, Vimeo, or .mp4):',cur);
if(url===null)return;url=url.trim();if(!url)return;
blk.setAttribute('data-src',url);
var c=contentEl(blk);if(c)c.innerHTML=videoEmbed(url);
saveNow();
}
function editEmbedSrc(blk){
var cur=blk.getAttribute('data-src')||'';
var url=prompt('Embed URL (any iframe URL):',cur);
if(url===null)return;url=url.trim();if(!url)return;
blk.setAttribute('data-src',url);
var c=contentEl(blk);if(c)c.innerHTML='<div class="embed-frame"><iframe src="'+esc(url)+'" loading="lazy"></iframe></div>';
saveNow();
}
function editLink(blk){
var curUrl=blk.getAttribute('data-url')||'';
var url=prompt('Link URL:',curUrl);if(url===null)return;url=url.trim();if(!url)return;
var title=prompt('Link title:',blk.getAttribute('data-title')||url);
if(title===null)title=url;
blk.setAttribute('data-url',url);blk.setAttribute('data-title',title.trim()||url);
var c=contentEl(blk);if(c)c.innerHTML=linkCard({url:url,title:title.trim()||url});
saveNow();
}
function blockIndex(n,id){if(!n)return -1;for(var i=0;i<n.blocks.length;i++){if(n.blocks[i].id===id)return i;}return -1;}
function addBlockAfter(blk,type,data){
  var n=cur();if(!n)return;readDOM(n);
  var id=blk?blk.getAttribute('data-id'):null;
  var nb=data||mkBlock(type||'text','');
  var host=id?containerOf(n,id):null;
  if(host)host.arr.splice(host.index+1,0,nb);
  else n.blocks.push(nb);
  persist();render();
  focusBlockById(nb.id,true);
  markDirty();
}
function addChildBlock(contEl,type){
  var n=cur();if(!n)return;readDOM(n);
  var parent=blockOf(contEl);
  if(!parent){addBlockAfter(parent,'text');return;}
  var pid=parent.getAttribute('data-id');
  var host=containerOf(n,pid);
  var nb=makeBlock(type||'text',{});
  if(host){
    if(!host.block.children)host.block.children=[];
    host.block.children.push(nb);
  }else{
    n.blocks.push(nb);
  }
  persist();render();
  focusBlockById(nb.id,true);
  markDirty();
}
function removeBlock(blk){
  var n=cur();if(!n)return;readDOM(n);
  var id=blk.getAttribute('data-id');
  var host=containerOf(n,id);
  if(!host)return;
  if(n.blocks.length<=1){toast('Note needs at least one block');return;}
  host.arr.splice(host.index,1);
  if(!host.arr.length)host.arr.push(mkBlock('text',''));
  if(!n.blocks.length)n.blocks=[mkBlock('text','')];
  persist();render();markDirty();
}
function removeBlock(blk){
var n=cur();if(!n)return;readDOM(n);
var id=blk.getAttribute('data-id');
if(n.blocks.length<=1){toast('Note needs at least one block');return;}
n.blocks=n.blocks.filter(function(b){return b.id!==id;});
if(!n.blocks.length)n.blocks=[mkBlock('text','')];
persist();render();markDirty();
}
/* ===== code blocks: Notion-style panel + real syntax highlighting ===== */
var CODE_KW={
  common:'if else for while do return break continue switch case default try catch finally throw new delete typeof instanceof void in of class extends super this import export from as async await yield static get set',
  javascript:'const let var function null undefined true false',
  typescript:'interface type enum implements public private protected readonly namespace declare',
  python:'def class lambda elif pass global nonlocal assert True False None self and or not is print type len range str int list dict set open input map filter zip enumerate',
  bash:'if then else elif fi for while do done case esac function return local export echo cd ls cat grep curl wget chmod chown sudo apt apt-get pip python python3 nc ncat netcat nmap ssh scp git make find xargs base64 openssl id whoami uname which ping systemctl service mkdir rm cp mv touch head tail sort uniq wc tar gzip kill ps netstat ss lsof hashcat john hydra gobuster ffuf ffuf feroxbuster sqlmap enum4linux source exec env unset trap read printf test true false',
  sql:'SELECT FROM WHERE INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE DROP ALTER JOIN LEFT RIGHT INNER OUTER ON GROUP BY ORDER HAVING LIMIT OFFSET UNION DISTINCT AS AND OR NOT NULL LIKE IN EXISTS BETWEEN CASE WHEN THEN ELSE END COUNT SUM AVG MIN MAX DATABASE SCHEMA INDEX VIEW',
  java:'public private protected class interface extends implements void int long double float boolean char new static final abstract synchronized try catch finally throw throws import package this super null true false instanceof',
  csharp:'using namespace class struct interface enum public private protected internal static readonly const void var string int bool async await override virtual new null true false try catch finally throw',
  go:'func package import var const type struct interface map chan go defer if else for range switch case default return nil true false',
  rust:'fn let mut const struct enum impl trait pub use mod match if else for while loop return self Self Some None Ok Err true false',
  php:'function class public private protected static const return new extends implements namespace use echo print require include if else elseif foreach as array true false null',
  ruby:'def class module end attr_accessor puts require if elsif else unless while until for in do return yield begin rescue ensure raise nil true false self',
  c:'int char float double void long short signed unsigned struct union enum static const extern return if else for while do switch case break continue typedef sizeof',
  cpp:'int char float double void long short bool struct class public private protected static const template typename using namespace return if else for while switch case new delete virtual override',
  powershell:'function param foreach where if else elseif switch return begin process try catch throw write-output write-host get-childitem get-content set-content select-string invoke-webrequest test-path new-object',
  yaml:'true false null yes no',
  json:'true false null',
  html:'div span p a img ul li table tr td th h1 h2 h3 h4 h5 h6 form input button script style',
  css:'important media keyframes supports font-face root var',
  plaintext:''
};
function kwFor(lang){
  var l=String(lang||'plaintext').toLowerCase();
  var set={},i;
  var lists=[CODE_KW.common];
  if(CODE_KW[l])lists.push(CODE_KW[l]);
  if(/^(js|jsx|mjs|node|ts|tsx)$/.test(l))lists.push(CODE_KW.javascript);
  if(/^(py|python3)$/.test(l))lists.push(CODE_KW.python);
  if(/^(sh|shell|zsh|console|terminal)$/.test(l))lists.push(CODE_KW.bash);
  if(/^(c|h)$/.test(l))lists.push(CODE_KW.c);
  if(/^(cpp|c\+\+|cc|hpp)$/.test(l))lists.push(CODE_KW.cpp);
  for(i=0;i<lists.length;i++){
    var parts=String(lists[i]).split(' ');
    for(var j=0;j<parts.length;j++){if(parts[j])set[parts[j]]=1;}
  }
  return set;
}
function commentStyle(lang){
  var l=String(lang||'').toLowerCase();
  if(/^(bash|sh|shell|zsh|fish|ps1|powershell|python|py|yaml|yml|ruby|rb|perl|php|dockerfile|makefile|conf|ini|toml|tex)$/.test(l))return '#';
  if(/^(html|xml|svg|vue)$/.test(l))return '<!--[\\s\\S]*?-->';
  if(/^(css|less|scss|sass)$/.test(l))return '/\\*[\\s\\S]*?\\*/';
  return '//|/\\*[\\s\\S]*?\\*/';
}
function highlightCode(src,lang){
  var text=String(src==null?'':src);
  if(!text)return '';
  var l=String(lang||'plaintext').toLowerCase();
  var kws=kwFor(l);
  var cm=commentStyle(l);
  var re=new RegExp('('+cm+')|("(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`)|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_$][\\w$]*)|([^\\w\\s])','g');
  var out='',last=0,m;
  function isCall(idx){
    var i=idx;
    while(i<text.length&&/\s/.test(text.charAt(i)))i++;
    return text.charAt(i)==='(';
  }
  while((m=re.exec(text))!==null){
    out+=esc(text.slice(last,m.index));
    var cls='tok-pln',tok=m[0];
    if(m[1])cls='tok-com';
    else if(m[2]){
      cls='tok-str';
      var after=text.slice(re.lastIndex).replace(/^\s+/,'');
      if(after.charAt(0)===':'&&/^json/i.test(l))cls='tok-key';
    }
    else if(m[3])cls='tok-num';
    else if(m[4]){
      if(kws[tok])cls='tok-kw';
      else if(isCall(re.lastIndex))cls='tok-fn';
      else if(/^[A-Z][A-Z0-9_]{1,}$/.test(tok))cls='tok-const';
    }
    else if(m[5])cls='tok-pun';
    out+='<span class="'+cls+'">'+esc(tok)+'</span>';
    last=re.lastIndex;
    if(re.lastIndex===m.index)re.lastIndex++;
  }
  out+=esc(text.slice(last));
  return out;
}
function caretOffset(el){
  try{
    var s=getSelection();
    if(!s||!s.rangeCount)return 0;
    var r=s.getRangeAt(0);
    if(!el.contains(r.startContainer))return 0;
    var pre=r.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(r.startContainer,r.startOffset);
    return pre.toString().length;
  }catch(e){return 0;}
}
function setCaretOffset(el,off){
  try{
    var walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null);
    var node,count=0;
    while((node=walker.nextNode())){
      var len=node.nodeValue.length;
      if(count+len>=off){
        var r=document.createRange(),s=getSelection();
        r.setStart(node,Math.max(0,off-count));
        r.collapse(true);
        s.removeAllRanges();s.addRange(r);
        return;
      }
      count+=len;
    }
  }catch(e){}
}
function trimCode(s){
  return String(s==null?'':s).replace(/^\s+/,'').replace(/\s+$/,'');
}
function codeSrc(blk){
  var c=contentEl(blk);
  return c?txt(c):'';
}
function paintCode(blk){
  var c=contentEl(blk);
  if(!c)return;
  var lang=blk.getAttribute('data-lang')||'bash';
  var src=trimCode(codeSrc(blk));
  c.innerHTML=highlightCode(src,lang);
}
function stripCode(blk){
  var c=contentEl(blk);
  if(!c)return;
  if(c.querySelector('.tok-pln,.tok-com,.tok-str,.tok-num,.tok-kw,.tok-fn,.tok-key,.tok-pun')){
    var off=caretOffset(c);
    c.textContent=codeSrc(blk);
    setCaretOffset(c,off);
  }
}
function buildCodeHead(b){
  var head=document.createElement('div');head.className='code-head';head.setAttribute('contenteditable','false');
  var lang=document.createElement('button');lang.className='code-lang';lang.type='button';
  lang.title='Change language (click to cycle)';
  lang.textContent=(b.lang||'bash');head.appendChild(lang);
  var tools=document.createElement('div');tools.className='code-tools';
  var copy=document.createElement('button');copy.className='code-copy';copy.type='button';copy.title='Copy code';copy.setAttribute('contenteditable','false');
  copy.innerHTML='<i class="fa-solid fa-copy"></i>';tools.appendChild(copy);
  var lnb=document.createElement('button');lnb.className='code-lines-btn';lnb.type='button';lnb.title='Toggle line numbers';lnb.setAttribute('contenteditable','false');
  lnb.innerHTML='<i class="fa-solid fa-list-ol"></i>';tools.appendChild(lnb);
  var cdel=document.createElement('button');cdel.className='code-del';cdel.type='button';cdel.title='Delete this code block';cdel.setAttribute('contenteditable','false');
  cdel.innerHTML='<i class="fa-solid fa-trash"></i>';tools.appendChild(cdel);
  head.appendChild(tools);
  return head;
}
function cycleLang(blk){
  var c=blk.getAttribute('data-lang')||'bash';
  var nx=LANGS[(langIdx(c)+1)%LANGS.length];
  blk.setAttribute('data-lang',nx);
  var el=blk.querySelector('.code-lang');if(el)el.textContent=nx;
  if(blk.contains(document.activeElement))stripCode(blk);else paintCode(blk);
  saveNow();
}
function copyCode(blk){
  var t=codeSrc(blk);
  function ok(){toast('Copied to clipboard');}
  function fail(){toast('Copy failed');}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(ok,fail);}
  else{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok();}catch(e){fail();}document.body.removeChild(ta);}
}
function wireBox(el){ if(!el)return; paintBox(el); }
function paintBox(blk){
  var card=blk.querySelector('.box-card');if(!card)return;
  var p=card.querySelector('.box-platform'),d=card.querySelector('.box-difficulty');
  var pb=card.querySelector('.box-plat'),db=card.querySelector('.box-diff');
  if(p&&pb){pb.className='box-plat plat-'+(p.value||'HTB');pb.textContent=platLabel(p.value||'HTB');}
  if(d&&db){db.className='box-diff diff-'+(d.value||'Easy').replace(/\s/g,'');db.textContent=d.value||'Easy';}
}
function toggleTodo(blk){
  blk.classList.toggle('checked');
  var on=blk.classList.contains('checked');
  var box=blk.querySelector('.todo-box');
  if(box){box.classList.toggle('done',on);box.innerHTML=on?'<i class="fa-solid fa-check"></i>':'';}
  saveNow();
}
function updateStatsRaw(){
  var blocks=editor.querySelectorAll('.block');
  var text=txt(editor);
  var words=(text.trim().match(/\S+/g)||[]).length;
  if(wordCount)wordCount.textContent=words+(words===1?' word':' words');
  if(blockCount)blockCount.textContent=blocks.length+(blocks.length===1?' block':' blocks');
  if(charsCount)charsCount.textContent=fmtNum(text.length)+' chars';
  var rt=document.getElementById('read-time');
  if(rt){var mins=Math.max(1,Math.round(words/200));rt.textContent=mins+(mins===1?' min read':' min read');}
}
function boxOf(n){ if(n&&n.blocks){for(var i=0;i<n.blocks.length;i++){if(n.blocks[i].type==='box'&&n.blocks[i].box)return n.blocks[i].box;}} return null; }
function fmtDate(ts){ try{var d=new Date(ts||Date.now());return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});}catch(e){return '';} }
function fmtNum(n){ try{return Number(n||0).toLocaleString();}catch(e){return String(n);} }
function relTime(ts){
  var t=ts||Date.now(), d=Date.now()-t;
  if(d<0)d=0;
  var m=Math.floor(d/60000);
  if(m<1)return 'just now';
  if(m<60)return m+'m ago';
  var h=Math.floor(m/60);
  if(h<24)return h+'h ago';
  var dy=Math.floor(h/24);
  if(dy<7)return dy+'d ago';
  if(dy<365)return Math.floor(dy/7)+'w ago';
  return fmtDate(t);
}
function noteWords(n){
  var w=0;
  var bs=(n&&n.blocks)||[];
  for(var i=0;i<bs.length;i++){
    var b=bs[i], s=b.html?stripTags(b.html):(b.src||'');
    if(s)w+=(s.match(/\S+/g)||[]).length;
  }
  return w;
}
var tagFilter=null;
function allTags(){
  var map={};
  for(var i=0;i<notes.length;i++){
    var ts=notes[i].tags||[];
    for(var j=0;j<ts.length;j++)map[ts[j]]=(map[ts[j]]||0)+1;
  }
  return map;
}
function renderTagBar(){
  var bar=document.getElementById('side-tags');
  if(!bar)return;
  var map=allTags(),keys=Object.keys(map).sort(function(a,b){return map[b]-map[a]||a.localeCompare(b);});
  if(!keys.length){bar.style.display='none';bar.innerHTML='';return;}
  bar.style.display='';
  var h='<div class="side-section">Tags</div><div class="tag-chips">';
  for(var i=0;i<keys.length;i++){
    h+='<button class="tag-chip'+(tagFilter===keys[i]?' on':'')+'" data-tag="'+esc(keys[i])+'">'+esc(keys[i])+'<span>'+map[keys[i]]+'</span></button>';
  }
  if(tagFilter)h+='<button class="tag-chip clear" data-tag-clear="1">clear</button>';
  bar.innerHTML=h+'</div>';
}
function setTags(n,csv){
  if(!n)return;
  var out=[],seen={};
  String(csv||'').split(',').forEach(function(t){
    var v=t.trim().toLowerCase().replace(/^#+/,'');
    if(v&&!seen[v]){seen[v]=1;out.push(v);}
  });
  n.tags=out;n.updatedAt=Date.now();persist();
}
function stripTokenMarkup(html){
  return String(html==null?'':html).replace(/<span[^>]*data-tok[^>]*>([\s\S]*?)<\/span>/g,'$1');
}
function noteHaystack(n){
  var parts=[n.title||'Untitled'];
  var bx=boxOf(n);
  if(bx)parts.push(bx.name||'',bx.platform||'',bx.difficulty||'',bx.os||'');
  var bs=(n&&n.blocks)||[];
  for(var i=0;i<bs.length;i++){
    var b=bs[i];
    if(b.html)parts.push(stripTags(b.html));
    if(b.src)parts.push(b.src);
    if(b.caption)parts.push(stripTags(b.caption));
    if(b.title)parts.push(b.title);
    if(b.box&&b.box.name)parts.push(b.box.name);
  }
  if(n.ai&&n.ai.tags&&n.ai.tags.all)parts=n.ai.tags.all.concat(parts);
  return parts.join(' ').toLowerCase();
}
var SORT_KEY='writeup_sort';
var sortMode='updated';
function getSort(){try{var s=localStorage.getItem(SORT_KEY);if(s)sortMode=s;}catch(e){}return sortMode;}
function setSort(m){sortMode=m||'updated';try{localStorage.setItem(SORT_KEY,sortMode);}catch(e){}renderNotes();
  var sb=document.getElementById('sort-btn');if(sb)sb.title='Sorted by '+sortMode;}
function noteCard(n){
  var item=document.createElement('div');
  item.className='note-item'+(n.id===curId?' active':'')+(n.pinned?' pinned':'');
  item.setAttribute('data-note',n.id);
  var bx=boxOf(n);
  var thumb=document.createElement('div');thumb.className='note-thumb';
  if(bx&&bx.cover)thumb.innerHTML='<img src="'+esc(bx.cover)+'" alt="">';
  else thumb.innerHTML='<i class="fa-solid fa-cube"></i>';
  item.appendChild(thumb);
  var meta=document.createElement('div');meta.className='note-meta';
  var name=document.createElement('div');name.className='note-name';name.textContent=n.title||'Untitled';meta.appendChild(name);
  var w=noteWords(n);
  var sub=document.createElement('div');sub.className='note-sub';
  sub.textContent=relTime(n.updatedAt||n.createdAt)+(w?' · '+fmtNum(w)+' words':'');
  meta.appendChild(sub);
  if(bx){
    var badges=document.createElement('div');badges.className='note-badges';
    var p=document.createElement('span');p.className='nb plt-'+(bx.platform||'HTB');p.textContent=bx.platform||'HTB';badges.appendChild(p);
    if(bx.difficulty){var d=document.createElement('span');d.className='nb diff-'+(bx.difficulty||'').replace(/\s/g,'');d.textContent=bx.difficulty;badges.appendChild(d);}
    if(bx.os){var o=document.createElement('span');o.className='nb';o.style.background='var(--hover)';o.style.color='var(--text-2)';o.textContent=bx.os;badges.appendChild(o);}
    meta.appendChild(badges);
  }
  if(n.tags&&n.tags.length){
    var tg2=document.createElement('div');tg2.className='note-tags';
    for(var ti=0;ti<n.tags.length;ti++){
      var tc=document.createElement('button');tc.className='note-tag-btn';tc.type='button';
      tc.setAttribute('data-tag',n.tags[ti]);tc.textContent='#'+n.tags[ti];
      tg2.appendChild(tc);
    }
    meta.appendChild(tg2);
  }
  if(n.ai&&n.ai.tags&&n.ai.tags.all&&n.ai.tags.all.length){
    var tg=document.createElement('div');tg.className='note-tags';
    for(var k=0;k<Math.min(3,n.ai.tags.all.length);k++){
      var s=document.createElement('span');s.className='note-tag';s.textContent=n.ai.tags.all[k];tg.appendChild(s);
    }
    meta.appendChild(tg);
  }
  item.appendChild(meta);
  var acts=document.createElement('div');acts.className='note-actions';
  if(n.pinned){var pin=document.createElement('i');pin.className='note-pin fa-solid fa-thumbtack';pin.title='Pinned';acts.appendChild(pin);}
  var more=document.createElement('button');more.className='note-more';more.type='button';more.title='More actions';
  more.setAttribute('data-more',n.id);more.innerHTML='<i class="fa-solid fa-ellipsis"></i>';
  acts.appendChild(more);
  var del=document.createElement('button');del.className='note-del';del.type='button';del.title='Delete this writeup';
  del.setAttribute('data-del',n.id);del.setAttribute('aria-label','Delete '+((n.title||'Untitled')));del.innerHTML='<i class="fa-solid fa-trash"></i>';
  acts.appendChild(del);
  item.appendChild(acts);
  return item;
}
function renderNotes(){
  if(!notesList)return;
  var q=(sideSearch&&sideSearch.value||'').trim().toLowerCase();
  var list=[];
  for(var i=0;i<notes.length;i++){
    var n=notes[i];
    if(q&&noteHaystack(n).indexOf(q)<0)continue;
    if(tagFilter&&(n.tags||[]).indexOf(tagFilter)<0)continue;
    list.push(n);
  }
  list.sort(function(a,b){
    if(!!a.pinned!==!!b.pinned)return a.pinned?-1:1;
    if(sortMode==='title')return (a.title||'').localeCompare(b.title||'');
    if(sortMode==='created')return (b.createdAt||0)-(a.createdAt||0);
    if(sortMode==='platform'){
      var pa=platLabel((boxOf(a)||{}).platform||''),pb=platLabel((boxOf(b)||{}).platform||'');
      if(pa!==pb)return pa.localeCompare(pb);
      return (b.updatedAt||0)-(a.updatedAt||0);
    }
    return (b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0);
  });
  notesList.innerHTML='';
  var pinned=[],rest=[];
  for(var j=0;j<list.length;j++){(list[j].pinned?pinned:rest).push(list[j]);}
  function section(label){
    var h=document.createElement('div');h.className='side-section';h.textContent=label;notesList.appendChild(h);
  }
  if(pinned.length){
    section('Pinned');
    for(var p=0;p<pinned.length;p++)notesList.appendChild(noteCard(pinned[p]));
    if(rest.length)section('All writeups');
  }
  for(var r=0;r<rest.length;r++)notesList.appendChild(noteCard(rest[r]));
  if(!list.length){
    var e=document.createElement('div');e.className='side-empty';
    e.innerHTML=notes.length?'<i class="fa-solid fa-magnifying-glass"></i>No writeups match your filter.'
      :'<i class="fa-solid fa-feather-pointed"></i>No writeups yet.<br>Create your first one to get started.';
    notesList.appendChild(e);
  }
  renderTagBar();
  if(sideCount)sideCount.textContent=notes.length;
  var ft=document.getElementById('side-foot-text');
  if(ft)ft.textContent=notes.length+(notes.length===1?' writeup':' writeups')+(q?' · '+list.length+' shown':'');
  var sw=document.getElementById('side-search');
  if(sw&&sw.parentNode)sw.parentNode.classList.toggle('filled',!!sw.value);
}
function defaultNote(){ return {id:uid('note'),title:'Untitled',createdAt:Date.now(),updatedAt:Date.now(),blocks:[mkBox(),mkBlock('text','Welcome to WriteUp. Type <b>/</b> for commands.')]}; }
function updateTitleMeta(){
  var el=document.getElementById('title-meta');if(!el)return;
  var n=cur();var bx=n?boxOf(n):null;
  if(!bx||!bx.name){el.innerHTML='';return;}
  el.innerHTML='<span class="tm-pill">'+esc(bx.platform||'HTB')+'</span><span class="tm-dot">·</span>'
    +'<span class="tm-pill">'+esc(bx.difficulty||'')+'</span><span class="tm-dot">·</span>'
    +'<span class="tm-pill">'+esc(bx.os||'')+'</span>';
}
function openNote(id){
  if(id===curId)return;
  var n=cur();if(n)readDOM(n);
  curId=id;render();
  var wrap=document.getElementById('editor-wrap');if(wrap)wrap.scrollTop=0;
  var first=editor.querySelector('.block');if(first)focusBlock(first,true);
}
function findNote(id){for(var i=0;i<notes.length;i++){if(notes[i].id===id)return notes[i];}return null;}
function renameNote(id,title){
  var n=findNote(id);if(!n)return;
  var t=(title||'').trim();if(!t)return;
  n.title=t;n.updatedAt=Date.now();
  if(id===curId&&noteTitle){noteTitle.value=t;titleOwner=id;}
  persist();renderNotes();saveNow();toast('Renamed to "'+t+'"');
}
function duplicateNote(id){
  var n=findNote(id);if(!n)return;
  var copy=JSON.parse(JSON.stringify(n));
  copy.id=uid('note');
  copy.title=(n.title||'Untitled')+' (copy)';
  copy.createdAt=Date.now();copy.updatedAt=Date.now();
  (copy.blocks||[]).forEach(function(b){b.id=uid();});
  notes.unshift(copy);curId=copy.id;
  persist();render();renderNotes();saveNow();toast('Duplicated');
}
function togglePin(id){
  var n=findNote(id);if(!n)return;
  n.pinned=!n.pinned;n.updatedAt=Date.now();
  persist();renderNotes();toast(n.pinned?'Pinned to top':'Unpinned');
}
function mergeNotes(list){
  if(!Array.isArray(list)||!list.length)return 0;
  var added=0;
  for(var i=0;i<list.length;i++){
    var b=list[i];
    if(!b||!b.id)continue;
    var ex=findNote(b.id);
    if(!ex){notes.push(b);added++;}
    else if((b.updatedAt||0)>(ex.updatedAt||0)){for(var k in b){if(Object.prototype.hasOwnProperty.call(b,k))ex[k]=b[k];}}
  }
  if(added){persist();renderNotes();}
  return added;
}
var lastDeleted=null;
function deleteNote(id){
  var n=findNote(id);
  if(!n)return;
  var idx=notes.indexOf(n);
  notes=notes.filter(function(x){return x.id!==id;});
  if(!notes.length)notes=[defaultNote()];
  if(curId===id)curId=notes[0].id;
  persist();render();renderNotes();
  lastDeleted={note:n,index:idx};
  toastAction('"'+(n.title||'Untitled')+'" deleted','Undo',undoDelete);
}
function undoDelete(){
  if(!lastDeleted)return;
  var d=lastDeleted;lastDeleted=null;
  if(findNote(d.note.id))return;
  notes.splice(Math.min(d.index,notes.length),0,d.note);
  curId=d.note.id;
  persist();render();renderNotes();
  toast('Restored "'+(d.note.title||'Untitled')+'"');
}
function makeBlock(type,opts){
  opts=opts||{};
  if(type==='box'){var b=mkBox();if(opts.box)b.box=opts.box;return b;}
  var b=mkBlock(type,opts.html||'');
  if(type==='code'){b.lang=opts.lang||'bash';b.cmode=opts.cmode||'term';b.src=opts.src||'';}
  if(type==='todo'){b.checked=!!opts.checked;}
if(type==='callout'){b.variant=opts.variant||'info';}
  if(type==='audio'){b.src=opts.src||'';b.caption=opts.caption||'';}
  if(type==='file'){b.name=opts.name||'';b.url=opts.url||'';}
  if(type==='page'){b.noteId=opts.noteId||'';b.label=opts.label||'';}
  if(type==='button'){b.label=opts.label||'';b.url=opts.url||'';}
  if(type==='equation'){b.latex=opts.latex||'';}
  if(type==='table'){b.header=opts.header!==false;b.rows=opts.rows||[['',''],['','']];}
  if(type==='toc'){}
  if(type==='breadcrumb'){}
  if(type==='toggle'){b.html=opts.html||'';b.open=opts.open!==false;b.children=opts.children||[];}
  if(type==='tip'){b.html=opts.html||'';b.body=opts.body||'';}
  if(type==='mermaid'){b.src=opts.src||'';}
  if(type==='checklist'){b.showDone=opts.showDone!==false;}
  if(type==='timer'){b.startedAt=opts.startedAt||0;b.elapsed=opts.elapsed||0;b.running=!!opts.running;}  if(type==='image'){b.src=opts.src||'';b.caption=opts.caption||'';}
  if(type==='video'||type==='embed'){b.src=opts.src||'';}
  if(type==='link'){b.url=opts.url||'';b.title=opts.title||'';}
  return b;
}
function focusBlockById(id,atEnd){
  var els=editor.querySelectorAll('.block');
  for(var i=0;i<els.length;i++){if(els[i].getAttribute('data-id')===id){focusBlock(els[i],atEnd!==false);return;}}
}
function replaceBlock(anchorEl,data){
  var n=cur();if(!n)return;readDOM(n);
  var id=anchorEl.getAttribute('data-id');
  var host=containerOf(n,id);
  if(!host){n.blocks.push(data);}
  else{host.arr.splice(host.index,1,data);}
  persist();render();focusBlockById(data.id,true);markDirty();
}
function convertKeep(blk,type,html){replaceBlock(blk,makeBlock(type,{html:html}));}
function promptMsg(cmd){
  if(cmd==='image')return 'Image URL:';
  if(cmd==='video')return 'Video URL (YouTube, Vimeo, or .mp4):';
  if(cmd==='audio')return 'Audio URL (.mp3 / .wav / .ogg):';
  if(cmd==='embed')return 'Embed URL (any iframe URL):';
  if(cmd==='link')return 'Link URL:';
  if(cmd==='file')return 'File URL:';
  return 'URL:';
}
var NO_INPUT_CMDS={text:1,h1:1,h2:1,h3:1,h4:1,quote:1,callout:1,bullet:1,numbered:1,todo:1,toggle:1,divider:1,box:1,table:1,toc:1,breadcrumb:1};
function promptMsg(cmd){
  if(cmd==='image')return 'Image URL:';
  if(cmd==='video')return 'Video URL (YouTube, Vimeo, or .mp4):';
  if(cmd==='audio')return 'Audio URL (.mp3 / .wav / .ogg):';
  if(cmd==='embed')return 'Embed URL (any iframe URL):';
  if(cmd==='link')return 'Link URL:';
  if(cmd==='file')return 'File URL:';
  return 'URL:';
}
function runSlashCmd(cmd){
  var blk=slash.anchorBlock;closeSlash();if(!blk)return;
  if(NO_INPUT_CMDS[cmd]){
    if(cmd==='box'){replaceBlock(blk,mkBox());}
    else if(cmd==='divider'){replaceBlock(blk,mkBlock('divider'));}
    else if(cmd==='table'){replaceBlock(blk,makeBlock('table',{header:true,rows:[['Port','State','Service'],['22','open','ssh'],['80','open','http']]}));}
    else if(cmd==='toc'){replaceBlock(blk,makeBlock('toc',{}));}
    else if(cmd==='breadcrumb'){replaceBlock(blk,makeBlock('breadcrumb',{}));}
    else if(cmd==='toggle'){replaceBlock(blk,makeBlock('toggle',{html:'',open:true,children:[]}));}
    else if(cmd==='mermaid'){replaceBlock(blk,makeBlock('mermaid',{src:''}));markDirty();return;}
    else if(cmd==='checklist'){replaceBlock(blk,makeBlock('checklist',{}));markDirty();return;}
    else if(cmd==='timer'){replaceBlock(blk,makeBlock('timer',{startedAt:Date.now(),elapsed:0,running:true}));markDirty();return;}
    else if(cmd==='tag'){
      var _tag=prompt('Tag this writeup (comma separated):',((cur()&&cur().tags)||[]).join(', '));
      if(_tag!==null)setTags(cur(),_tag);
      convertKeep(blk,'text','');
      renderNotes();markDirty();return;
    }
    else if(cmd==='tip'){
      var _empty=(blk.getAttribute('data-type')==='text'&&txt(contentEl(blk)).trim()==='');
      var _tip=makeBlock('tip',{html:'',body:''});
      if(_empty){replaceBlock(blk,_tip);}
      else{addBlockAfter(blk,'tip',_tip);}
      /* open the popup straight into the editor so you can write it now */
      if(window.WriteUpTips)setTimeout(function(){window.WriteUpTips.edit(_tip.id);},80);
    }
    else{convertKeep(blk,cmd,'');}
    markDirty();return;
  }
  if(cmd==='code'){replaceBlock(blk,makeBlock('code',{lang:'bash',cmode:'term'}));markDirty();return;}
  if(cmd==='equation'){
    var lx=prompt('LaTeX expression (e.g. 2^{n} \\bmod m):','E = mc^2');
    if(lx!==null&&lx.trim())replaceBlock(blk,makeBlock('equation',{latex:lx.trim()}));
    else convertKeep(blk,'text','');
    markDirty();return;
  }
  if(cmd==='file'){
    var fu=prompt('File URL (script, wordlist, binary…):');
    if(fu&&fu.trim())replaceBlock(blk,makeBlock('file',{url:fu.trim(),name:fu.trim().split('/').pop()}));
    else convertKeep(blk,'text','');
    markDirty();return;
  }
  if(cmd==='button'){
    var bl=prompt('Button label:','Open the writeup');
    if(bl!==null&&bl.trim()){
      var bu=prompt('Button URL:','https://');
      replaceBlock(blk,makeBlock('button',{label:bl.trim(),url:(bu||'').trim()}));
    }else convertKeep(blk,'text','');
    markDirty();return;
  }
  if(cmd==='page'){replaceBlock(blk,makeBlock('page',{}));markDirty();return;}
  var url=prompt(promptMsg(cmd),'https://');
  if(url&&url.trim()){
    url=url.trim();
    if(cmd==='audio')replaceBlock(blk,makeBlock('audio',{src:url,caption:''}));
    else if(cmd==='link')replaceBlock(blk,makeBlock('link',{url:url,title:url}));
    else replaceBlock(blk,makeBlock(cmd,{src:url,url:url,title:url}));
  }else convertKeep(blk,'text','');
  markDirty();
}
function openSlash(blk){
  slash.open=true;slash.sel=0;slash.filter='';slash.anchorBlock=blk;
  slashMenu.style.display='block';renderSlashMenu();positionSlash(blk);
}
function closeSlash(){slash.open=false;slashMenu.style.display='none';slash.anchorBlock=null;}
function renderSlashMenu(){
  var items=COMMANDS.filter(function(cmd){if(!slash.filter)return true;return (cmd.t+' '+cmd.cmd).toLowerCase().indexOf(slash.filter)>=0;});
  slash.items=items;slashMenu.innerHTML='';
  if(!items.length){slashMenu.innerHTML='<div class="slash-empty">No results</div>';return;}
  var lastG='';
  for(var i=0;i<items.length;i++){
    var it=items[i];
    if(it.g!==lastG){var cat=document.createElement('div');cat.className='slash-cat';cat.textContent=it.g;slashMenu.appendChild(cat);lastG=it.g;}
    var el=document.createElement('div');el.className='slash-item'+(i===slash.sel?' sel':'');el.setAttribute('data-cmd',it.cmd);
    el.innerHTML='<div class="slash-ico"><i class="'+it.icon+'"></i></div><div class="slash-txt"><div class="slash-name">'+esc(it.t)+'</div><div class="slash-desc">'+esc(it.d)+'</div></div>';
    slashMenu.appendChild(el);
  }
}
function paintSlashSel(){
  var items=slashMenu.querySelectorAll('.slash-item');
  for(var i=0;i<items.length;i++){
    if(i===slash.sel){items[i].classList.add('sel');var ir=items[i].getBoundingClientRect(),mr=slashMenu.getBoundingClientRect();if(ir.bottom>mr.bottom)slashMenu.scrollTop+=ir.bottom-mr.bottom;if(ir.top<mr.top)slashMenu.scrollTop-=mr.top-ir.top;}
    else{items[i].classList.remove('sel');}
  }
}
function positionSlash(blk){
  try{
    var r=null,sel=getSelection();
    if(sel&&sel.rangeCount){var rr=sel.getRangeAt(0).getBoundingClientRect();if(rr&&(rr.width||rr.height))r=rr;}
    if(!r&&blk){var br=blk.getBoundingClientRect();r={left:br.left,bottom:br.bottom,top:br.top};}
    if(!r)return;
    var w=320,left=Math.min(r.left,window.innerWidth-w-12),top=r.bottom+8;
    if(top+440>window.innerHeight)top=Math.max(8,r.top-440-8);
    slashMenu.style.left=Math.max(8,left)+'px';slashMenu.style.top=top+'px';
  }catch(e){}
}
function updateSlashFilter(blk){
  var c=contentEl(blk);if(!c){closeSlash();return;}
  var t=txt(c);
  if(!/^\/[^\s]*$/.test(t)){closeSlash();return;}
  slash.filter=t.slice(1).toLowerCase();slash.sel=0;renderSlashMenu();
}

/* ===== Event / interaction / export / import / modal / init ===== */
function blockOf(el){ while(el&&el!==editor){ if(el.classList&&el.classList.contains('block'))return el; el=el.parentNode; } return null; }
function editableBlock(blk){ if(!blk)return false; var t=blk.getAttribute('data-type'); return t!=='box'&&t!=='code'&&t!=='divider'&&t!=='image'&&t!=='video'&&t!=='embed'&&t!=='link'&&t!=='table'&&t!=='audio'&&t!=='file'&&t!=='page'&&t!=='toc'&&t!=='breadcrumb'&&t!=='button'&&t!=='equation'&&t!=='tip'; }var MD_RULES=[{re:/^# $/,type:'h1'},{re:/^## $/,type:'h2'},{re:/^### $/,type:'h3'},{re:/^- $/,type:'bullet'},{re:/^\* $/,type:'bullet'},{re:/^1\. $/,type:'numbered'},{re:/^> $/,type:'quote'},{re:/^---$/,type:'divider'},{re:/^\[\] $/,type:'todo'}];
function tryMarkdown(blk){
  var c=contentEl(blk);if(!c)return false;
  var t=blk.getAttribute('data-type');
  if(t==='code'||t==='box'||t==='table'||t==='toc'||t==='audio'||t==='file'||t==='page'||t==='button'||t==='breadcrumb'||t==='equation'||t==='divider'||t==='link')return false;  var tt=txt(c);
  if(/^\|.*\|$/.test(tt)&&tt.split('|').length>=4){
    var parts=tt.split('|');
    parts.pop();
    parts.shift();
    var head=parts.map(function(s){return s.trim();});
    replaceBlock(blk,makeBlock('table',{header:true,rows:[head,['',''],['','']]}));
    return true;
  }  var tt=txt(c);
  for(var i=0;i<MD_RULES.length;i++){
    if(MD_RULES[i].re.test(tt)){
      var type=MD_RULES[i].type;
      if(type==='divider'){replaceBlock(blk,mkBlock('divider'));return true;}
      convertKeep(blk,type,'');return true;
    }
  }
  return false;
}
function caretAtStart(c){
  try{var s=getSelection();if(!s.rangeCount)return false;var r=s.getRangeAt(0);
    var pre=r.cloneRange();pre.selectNodeContents(c);pre.setEnd(r.endContainer,r.endOffset);
    return pre.toString().length===0;}catch(e){return false;}
}
function onInput(e){
  var tgt=e&&e.target?e.target:null;
  var node=tgt||(function(){var s=getSelection();return s&&s.anchorNode?s.anchorNode:null;})();
  var el=node&&node.nodeType===1?node:(node&&node.parentNode)||null;
  var blk=el?blockOf(el):null;
  if(blk){
    if(tryMarkdown(blk))return;
    var t=blk.getAttribute('data-type');
    if(t==='box'||t==='code'||t==='divider'||t==='image'||t==='video'||t==='embed'||t==='link'||t==='table'||t==='audio'||t==='file'||t==='page'||t==='toc'||t==='breadcrumb'||t==='button'||t==='equation'||t==='tip'){markDirty();updateStats();return;}    var c=contentEl(blk);var t2=txt(c);
    if(t2==='/'){openSlash(blk);}
    else if(slash.open){updateSlashFilter(blk);}
  }
  markDirty();updateStats();
}
function onKey(e){
  var node=e.target;var blk=blockOf(node.nodeType===1?node:node.parentNode);
  if(slash.open){
    var n=Math.max(1,slash.items.length);
    if(e.key==='ArrowDown'){e.preventDefault();slash.sel=(slash.sel+1)%n;paintSlashSel();return;}
    if(e.key==='ArrowUp'){e.preventDefault();slash.sel=(slash.sel-1+n)%n;paintSlashSel();return;}
    if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();var it=slash.items[slash.sel];if(it)runSlashCmd(it.cmd);return;}
    if(e.key==='Escape'){e.preventDefault();closeSlash();return;}
  }
  if(e.ctrlKey||e.metaKey){
    var k=e.key.toLowerCase();
    if(k==='b'){e.preventDefault();applyFmt('bold');return;}
    if(k==='i'){e.preventDefault();applyFmt('italic');return;}
    if(k==='u'){e.preventDefault();applyFmt('underline');return;}
    if(k==='k'){e.preventDefault();applyFmt('link');return;}
  }
  if(t==='equation'&&e.key==='Enter'&&!e.shiftKey){
    var eq=blk.querySelector('.eq-inner');
    if(eq&&(eq===node||eq.contains(node))){
      e.preventDefault();
      blk.setAttribute('data-latex',eq.textContent||'');
      eq.blur();
      return;
    }
  }  if(!blk)return;
  var t=blk.getAttribute('data-type');
  if(e.key==='Enter'&&!e.shiftKey){
    if(t==='code')return;
    if(t==='table'){ if(tableNextCell(blk,1)){e.preventDefault();return;} }
    if(t==='toggle'){
      var th=childByClass(blk,'block-content');
      if(th&&(th===node||th.contains(node))){
        e.preventDefault();
        if(txt(th).trim()===''){convertKeep(blk,'text','');return;}
        addChildBlock(blk,'text');
        return;
      }
    }    e.preventDefault();
    if(editableBlock(blk)){
      var c=contentEl(blk);var t3=txt(c);
      if(t==='todo'&&t3.trim()===''){convertKeep(blk,'text','');return;}
      addBlockAfter(blk,(t==='h1'||t==='h2'||t==='h3')?'text':t);
    }else{addBlockAfter(blk,'text');}
    return;
  }
  if(e.key==='Backspace'&&editableBlock(blk)){
    var c2=contentEl(blk);var t4=txt(c2);
    if(t4===''&&t!=='text'){e.preventDefault();convertKeep(blk,'text','');return;}
    if(t4===''&&caretAtStart(c2)){
      var n=cur();if(n&&n.blocks&&n.blocks.length>1){e.preventDefault();removeBlock(blk);return;}
    }
  }
}
function showFmt(){
  var s=getSelection();if(!s||!s.rangeCount||s.isCollapsed){hideFmt();return;}
  var node=s.anchorNode;if(!node)return;
  var el=node.nodeType===1?node:node.parentNode;
  var blk=blockOf(el);if(!blk||!editableBlock(blk)){hideFmt();return;}
  var c=contentEl(blk);if(!c||!c.contains(el)){hideFmt();return;}
  savedRange=s.getRangeAt(0).cloneRange();
  var rect=s.getRangeAt(0).getBoundingClientRect();
  if(!rect||(!rect.width&&!rect.height)){hideFmt();return;}
  fmtBar.style.display='flex';
  var w=fmtBar.offsetWidth||360;
  var left=Math.min(rect.left,window.innerWidth-w-10);
  var top=rect.top-fmtBar.offsetHeight-8;if(top<8)top=rect.bottom+8;
  fmtBar.style.left=Math.max(8,left)+'px';fmtBar.style.top=top+'px';
}
function hideFmt(){fmtBar.style.display='none';colorPop.style.display='none';}
function restoreSel(){try{if(savedRange){var s=getSelection();s.removeAllRanges();s.addRange(savedRange);}}catch(e){}}
function applyFmt(action){
  restoreSel();
  if(action==='bold'||action==='italic'||action==='underline'||action==='strike'){document.execCommand(action);markDirty();updateStats();return;}
  if(action==='clear'){document.execCommand('removeFormat');markDirty();updateStats();return;}
  if(action==='code'){var s=getSelection();if(s.rangeCount&&!s.isCollapsed){document.execCommand('insertHTML',false,'<code>'+esc(s.toString())+'</code>');markDirty();updateStats();}return;}
  if(action==='link'){var url=prompt('Link URL:','https://');if(url&&url.trim()){document.execCommand('createLink',false,url.trim());markDirty();updateStats();}return;}
  if(action==='textcolor'){colorMode='text';openColor();return;}
  if(action==='highlight'){colorMode='highlight';openColor();return;}
  if(action==='h1'||action==='h2'){
    var s2=getSelection();var node2=s2.anchorNode;if(!node2)return;
    var blk2=blockOf(node2.nodeType===1?node2:node2.parentNode);
    if(blk2){var cc=contentEl(blk2);convertKeep(blk2,action,cc?cc.innerHTML:'');}
  }
}
function buildColors(){
  function fill(grid,arr,type){if(!grid)return;grid.innerHTML='';arr.forEach(function(col){var sw=document.createElement('div');sw.className='swatch';sw.setAttribute('data-color',col);sw.setAttribute('data-type',type);sw.style.background=(col==='transparent')?'repeating-conic-gradient(#999 0% 25%,#ccc 0% 50%) 50%/8px 8px':col;grid.appendChild(sw);});}
  fill(textGrid,TEXTCOLORS,'text');fill(bgGrid,HLCOLORS,'highlight');
}
function openColor(){restoreSel();colorPop.style.display='block';var left=parseInt(fmtBar.style.left||'8',10);var top=parseInt(fmtBar.style.top||'8',10);colorPop.style.left=Math.min(left,window.innerWidth-230)+'px';colorPop.style.top=(top+fmtBar.offsetHeight+6)+'px';}
function applyColor(color,type){restoreSel();if(type==='highlight'){if(color==='transparent'){document.execCommand('removeFormat');}else{try{document.execCommand('hiliteColor',false,color);}catch(e){document.execCommand('backColor',false,color);}}}else{document.execCommand('foreColor',false,color);}colorPop.style.display='none';markDirty();updateStats();}

/* ===== drag reorder + editor click/change delegation + wiring ===== */
/* ===== smart drag & drop =====
   The dragged block follows the pointer. When the pointer moves into the top or
   bottom band of the editor the page scrolls by itself, faster the closer you
   get to the very edge. In the middle band nothing scrolls, so the drag simply
   waits until you move up or down again. */
var DRAG_MAX_SCROLL=1150;   /* px per second at the very edge */
var DRAG_ZONE=0.3;          /* fraction of the editor height used as the edge band */
var dragState=null, dragRAF=null, dragTimer=null;

function dragWrap(){ return document.getElementById('editor-wrap'); }

function startDrag(e,blk){
  e.preventDefault();
  if(slash.open)closeSlash();
  if(!blk)return;
  var wrap=dragWrap();
  var prevBehavior=wrap?wrap.style.scrollBehavior:'';
  if(wrap)wrap.style.scrollBehavior='auto';
  dragState={blk:blk,over:null,below:false,y:e.clientY,hold:0,moved:false,lastScroll:Date.now(),prevScrollBehavior:prevBehavior};
  blk.classList.add('dragging');
  if(document.body)document.body.classList.add('dragging-block');
  document.addEventListener('mousemove',onDragMove);
  document.addEventListener('mouseup',onDragEnd);
  startDragLoop();
}
function startDragLoop(){
  if(dragRAF)cancelAnimationFrame(dragRAF);
  if(dragTimer)clearInterval(dragTimer);
  function frame(){
    if(!dragState){dragRAF=null;return;}
    if(autoScrollDrag())computeDropTarget();
    dragRAF=requestAnimationFrame(frame);
  }
  dragRAF=requestAnimationFrame(frame);
  /* a timer as well, so the auto-scroll keeps working when rAF is throttled */
  dragTimer=setInterval(function(){
    if(!dragState){clearInterval(dragTimer);dragTimer=null;return;}
    if(autoScrollDrag())computeDropTarget();
  },16);
}
function stopDragLoop(){
  if(dragRAF){cancelAnimationFrame(dragRAF);dragRAF=null;}
  if(dragTimer){clearInterval(dragTimer);dragTimer=null;}
}
/* Scrolls the editor for the time that has passed since the last call.
   Returns true when the view actually moved. */
function autoScrollDrag(){
  if(!dragState)return false;
  var wrap=dragWrap();
  if(!wrap)return false;
  var r=wrap.getBoundingClientRect();
  if(!r.height)return false;
  var now=Date.now();
  var dt=(now-(dragState.lastScroll||now))/1000;
  dragState.lastScroll=now;
  if(dt<=0)return false;
  if(dt>0.25)dt=0.25;
  var zone=Math.max(90,Math.min(260,r.height*DRAG_ZONE));
  var y=dragState.y;
  var speed=0;
  if(y<r.top+zone){
    var t=Math.min(1,(r.top+zone-y)/zone);
    speed=-Math.pow(t,1.7)*DRAG_MAX_SCROLL;
  }else if(y>r.bottom-zone){
    var t=Math.min(1,(y-(r.bottom-zone))/zone);
    speed=Math.pow(t,1.7)*DRAG_MAX_SCROLL;
  }
  if(!speed){ dragState.hold=0; return false; }
  dragState.hold+=dt;
  var boost=1+Math.min(1.8,dragState.hold*0.8);
  var before=wrap.scrollTop;
  var delta=speed*dt*boost;
  wrap.scrollTop=before+delta;
  return Math.abs(wrap.scrollTop-before)>0.01;
}
function computeDropTarget(){
  if(!dragState)return;
  var blks=childBlocks(editor);
  for(var i=0;i<blks.length;i++)blks[i].classList.remove('drop-above','drop-below');
  var over=null,below=false,y=dragState.y;
  for(var j=0;j<blks.length;j++){
    if(blks[j]===dragState.blk)continue;
    var r=blks[j].getBoundingClientRect();
    if(y>r.top&&y<r.bottom){over=blks[j];below=y>r.top+r.height/2;break;}
  }
  dragState.over=over;dragState.below=below;
  if(over)over.classList.add(below?'drop-below':'drop-above');
}
function onDragMove(e){
  if(!dragState)return;
  e.preventDefault();
  dragState.y=e.clientY;
  dragState.moved=true;
  if(autoScrollDrag())computeDropTarget();
  else computeDropTarget();
}
function onDragEnd(){
  document.removeEventListener('mousemove',onDragMove);
  document.removeEventListener('mouseup',onDragEnd);
  stopDragLoop();
  if(document.body)document.body.classList.remove('dragging-block');
  if(dragState&&dragState.prevScrollBehavior!==undefined){
    var wrap=dragWrap();
    if(wrap)wrap.style.scrollBehavior=dragState.prevScrollBehavior;
  }
  if(!dragState)return;
  var blk=dragState.blk,over=dragState.over,below=dragState.below;
  dragState=null;
  blk.classList.remove('dragging');
  var all=childBlocks(editor);
  for(var i=0;i<all.length;i++)all[i].classList.remove('drop-above','drop-below');
  if(over&&over!==blk){
    var n=cur();readDOM(n);
    var id=blk.getAttribute('data-id');
    var idx=blockIndex(n,id);
    if(idx>=0){
      var moved=n.blocks.splice(idx,1)[0];
      var oidx=blockIndex(n,over.getAttribute('data-id'));
      if(oidx>=0)n.blocks.splice(below?oidx+1:oidx,0,moved);
    }
    persist();render();markDirty();
  }
}
function cycleCallout(blk){
  var v=blk.getAttribute('data-variant')||'info';
  var i=CALLOUT_VARIANTS.indexOf(v);if(i<0)i=0;
  var nx=CALLOUT_VARIANTS[(i+1)%CALLOUT_VARIANTS.length];
  blk.setAttribute('data-variant',nx);
  var b=blk.querySelector('.callout-kind');
  if(b){b.className='callout-kind v-'+nx;b.innerHTML='<i class="fa-solid '+(CALLOUT_ICON[nx]||CALLOUT_ICON.info)+'"></i>';b.title='Callout style: '+nx+' (click to change)';}
  saveNow();
}
function tableAction(blk,act){
  var tbl=blk.querySelector('table');if(!tbl)return;
  if(act==='row'){
    var last=tbl.rows[tbl.rows.length-1];
    var tr=document.createElement('tr');
    var cols=last?last.cells.length:2;
    for(var i=0;i<cols;i++){var td=document.createElement('td');td.className='tbl-cell';td.setAttribute('contenteditable','true');td.setAttribute('data-placeholder','—');tr.appendChild(td);}
    tbl.appendChild(tr);
  }else if(act==='col'){
    for(var r=0;r<tbl.rows.length;r++){
      var row=tbl.rows[r];
      var isHead=(r===0&&blk.getAttribute('data-header')!=='0');
      var cell=document.createElement(isHead?'th':'td');
      cell.className='tbl-cell';cell.setAttribute('contenteditable','true');cell.setAttribute('data-placeholder',isHead?'Column':'—');
      row.appendChild(cell);
    }
  }else if(act==='head'){
    var on=(blk.getAttribute('data-header')==='1');
    blk.setAttribute('data-header',on?'0':'1');
    var rows=tbl.rows;
    for(var h=0;h<rows.length;h++){
      var head=(h===0&&!on);
      var cells=rows[h].cells;
      for(var cc=0;cc<cells.length;cc++){
        var want=head?'th':'td';
        if(cells[cc].tagName.toLowerCase()!==want){
          var rep=document.createElement(want);
          rep.className='tbl-cell';rep.setAttribute('contenteditable','true');
          rep.setAttribute('data-placeholder',head?'Column':'—');
          rep.innerHTML=cells[cc].innerHTML;
          cells[cc].parentNode.replaceChild(rep,cells[cc]);
        }
      }
    }
  }else if(act==='del'){
    removeBlock(blk);return;
  }
  saveNow();
}
function editButton(blk){
  var url=prompt('Button URL:',blk.getAttribute('data-url')||'https://');
  if(url===null)return;
  url=url.trim();
  var a=blk.querySelector('.btn-block');
  if(a)a.setAttribute('href',url);
  blk.setAttribute('data-url',url);
  saveNow();
}
function scrollToBlockId(id){
  var b=editor.querySelector('.block[data-id="'+id+'"]');
  if(!b)return;
  b.scrollIntoView({behavior:'smooth',block:'start'});
}
function tableNextCell(blk,dir){
  var tbl=blk.querySelector('table');if(!tbl)return false;
  var cells=[];
  for(var r=0;r<tbl.rows.length;r++){for(var c=0;c<tbl.rows[r].cells.length;c++)cells.push(tbl.rows[r].cells[c]);}
  var sel=getSelection();
  var cur=null;
  if(sel&&sel.rangeCount&&sel.anchorNode){
    var cell=sel.anchorNode.nodeType===1?sel.anchorNode:sel.anchorNode.parentNode;
    if(cell&&cell.classList&&cell.classList.contains('tbl-cell'))cur=cell;
  }
  if(!cur)return false;
  var i=cells.indexOf(cur);
  var nx=cells[i+dir];
  if(!nx)return false;
  nx.focus();
  return true;
}
function onEditorClick(e){
  var t=e.target;
  if(t===editor){var bl=editor.querySelectorAll('.block');if(bl.length)focusBlock(bl[bl.length-1],true);return;}
  var cl=function(s){return t.closest?t.closest(s):null;};
  var blk=blockOf(t);if(!blk)return;
  if(cl('.block-del')){removeBlock(blk);e.stopPropagation();e.preventDefault();return;}
  if(cl('.callout-kind')){cycleCallout(blk);e.stopPropagation();e.preventDefault();return;}
  if(cl('.toggle-arrow')){blk.classList.toggle('open');e.stopPropagation();e.preventDefault();saveNow();return;}
  if(cl('.table-tools button')){tableAction(blk,cl('.table-tools button').getAttribute('data-tbl'));e.stopPropagation();e.preventDefault();return;}
  if(cl('.page-open')){var nid=cl('.page-open').getAttribute('data-open-note');if(nid)openNote(nid);e.stopPropagation();return;}
  if(cl('.btn-block')){editButton(blk);e.stopPropagation();e.preventDefault();return;}
  if(cl('.toc-row')){scrollToBlockId(cl('.toc-row').getAttribute('data-toc-block'));e.stopPropagation();return;}
  if(cl('.box-cover-btn')){var fi=blk.querySelector('.box-cover-file');if(fi)fi.click();e.stopPropagation();return;}
  if(cl('.box-cover-rm')){clearBoxCover(blk);e.stopPropagation();return;}
  if(cl('.code-lang')){cycleLang(blk);e.stopPropagation();return;}
  if(cl('.code-copy')){copyCode(blk);e.stopPropagation();return;}
  if(cl('.code-del')){removeBlock(blk);e.stopPropagation();e.preventDefault();return;}
  if(cl('.todo-box')){toggleTodo(blk);e.stopPropagation();return;}
  if(cl('.block-add')){addBlockAfter(blk,'text');e.stopPropagation();return;}
  if(cl('.img-wrap')){editImageSrc(blk);return;}
  if(cl('.vid-frame')||cl('.vid-link')){editVideoSrc(blk);return;}
  if(cl('.embed-frame')){editEmbedSrc(blk);return;}
}
function onEditorDblClick(e){
  var t=e.target;var cl=function(s){return t.closest?t.closest(s):null;};
  var blk=blockOf(t);if(!blk)return;
  if(cl('.bookmark')){e.preventDefault();editLink(blk);}
}
function onEditorChange(e){
  var t=e.target;if(!t||!t.classList)return;
  var blk=blockOf(t);if(!blk)return;
  if(t.classList.contains('box-cover-file')){
    var f=t.files&&t.files[0];if(!f)return;
    fileToCoverData(f,function(out){applyBoxCover(blk,out||'');});
    t.value='';return;
  }
  if(t.classList.contains('box-platform')||t.classList.contains('box-difficulty')||t.classList.contains('box-os')){
    paintBox(blk);saveNow();return;
  }
  if(t.classList.contains('page-select')){
    var v=t.value||'';
    blk.setAttribute('data-note',v);
    var linked=v?findNote(v):null;
    var lbl=linked?(linked.title||''):'';
    blk.setAttribute('data-label',lbl);
    var open=blk.querySelector('.page-open');
    if(open){open.setAttribute('data-open-note',v);open.setAttribute('href','#note='+v);var sp=open.querySelector('span');if(sp)sp.textContent=lbl||'open writeup';}
    saveNow();return;
  }
}
function wireEditor(){
  editor.addEventListener('input',onInput);
  editor.addEventListener('keydown',function(e){
    var tag=(e.target&&e.target.tagName||'').toLowerCase();
    if(tag==='input'||tag==='select'||tag==='textarea')return;
    onKey(e);
  });
  editor.addEventListener('keyup',function(){setTimeout(showFmt,10);});
  editor.addEventListener('mouseup',function(){setTimeout(showFmt,10);});
  editor.addEventListener('dblclick',onEditorDblClick);
  editor.addEventListener('mousedown',function(e){
    var t=e.target;if(t.closest&&t.closest('.drag-handle')){var blk=blockOf(t);if(blk)startDrag(e,blk);}
  });
  editor.addEventListener('click',onEditorClick);
  editor.addEventListener('change',onEditorChange);
  editor.addEventListener('focusin',function(e){
    var blk=blockOf(e.target);
    if(blk&&blk.getAttribute('data-type')==='code')stripCode(blk);
  });
  editor.addEventListener('focusin',function(e){
    var blk=blockOf(e.target);
    if(!blk)return;
    var bt=blk.getAttribute('data-type');
    if(bt==='code')stripCode(blk);
    else if(bt==='equation'){
      var eq=blk.querySelector('.eq-inner');
      if(eq&&eq.getAttribute('data-rendered')==='1'){
        eq.textContent=blk.getAttribute('data-latex')||'';
        eq.setAttribute('data-rendered','0');
      }
    }
  });
  editor.addEventListener('focusout',function(e){
    var blk=blockOf(e.target);
    if(!blk)return;
    var bt=blk.getAttribute('data-type');
    if(bt==='code')setTimeout(function(){paintCode(blk);},0);
    else if(bt==='equation')setTimeout(function(){
      var eq=blk.querySelector('.eq-inner');
      if(eq){blk.setAttribute('data-latex',eq.textContent||'');renderEquation(blk);}
    },0);
  });  editor.addEventListener('focusout',function(e){
    var blk=blockOf(e.target);
    if(blk&&blk.getAttribute('data-type')==='code')setTimeout(function(){paintCode(blk);},0);
  });
}
function wireToolbar(){
  Array.prototype.forEach.call(fmtBar.querySelectorAll('button'),function(b){
    b.addEventListener('mousedown',function(e){e.preventDefault();applyFmt(b.getAttribute('data-action'));});
  });
  colorPop.addEventListener('mousedown',function(e){
    var sw=e.target.closest?e.target.closest('.swatch'):null;if(!sw)return;
    e.preventDefault();
    applyColor(sw.getAttribute('data-color'),sw.getAttribute('data-type'));
  });
}
function wireSidebar(){
  if(notesList)notesList.addEventListener('click',function(e){
    var more=e.target.closest?e.target.closest('.note-more'):null;
    if(more){e.stopPropagation();if(window.WriteUpUI)window.WriteUpUI.noteMenu(more,more.getAttribute('data-more'));return;}
    var del=e.target.closest?e.target.closest('.note-del'):null;
    if(del){e.stopPropagation();deleteNote(del.getAttribute('data-del'));return;}
    var tagb=e.target.closest?e.target.closest('.tag-chip'):null;
    if(tagb){e.stopPropagation();var _t=tagb.getAttribute('data-tag');tagFilter=(tagb.hasAttribute('data-tag-clear')||tagFilter===_t)?null:_t;renderNotes();return;}
    var tagc=e.target.closest?e.target.closest('.note-tag-btn'):null;
    if(tagc){e.stopPropagation();var _t2=tagc.getAttribute('data-tag');tagFilter=tagFilter===_t2?null:_t2;renderNotes();return;}
    var item=e.target.closest?e.target.closest('.note-item'):null;
    if(item)openNote(item.getAttribute('data-note'));
  });
  if(sideSearch)sideSearch.addEventListener('input',function(){renderNotes();});
  var clr=document.getElementById('side-search-clear');
  if(clr&&sideSearch)clr.addEventListener('click',function(){sideSearch.value='';sideSearch.focus();renderNotes();});
}
function wireTopbar(){
  var nb=document.getElementById('new-note-btn');if(nb)nb.addEventListener('click',newNote);
  var nb2=document.getElementById('new-note-btn-2');if(nb2)nb2.addEventListener('click',newNote);
  var fa=document.getElementById('side-foot-action');if(fa)fa.addEventListener('click',newNote);
  var eh=document.getElementById('export-html-btn');if(eh)eh.addEventListener('click',exportHTML);
  var em=document.getElementById('export-md-btn');if(em)em.addEventListener('click',exportMD);
  var ib=document.getElementById('import-btn');if(ib)ib.addEventListener('click',function(){var inf=document.getElementById('import-file');if(inf)inf.click();});
  var inf2=document.getElementById('import-file');if(inf2)inf2.addEventListener('change',function(){importFile(this.files&&this.files[0]);this.value='';});
  if(noteTitle){
    noteTitle.addEventListener('input',function(){
      var n=cur();if(!n)return;
      titleOwner=n.id;
      n.title=noteTitle.value||'Untitled';
      n.updatedAt=Date.now();
      markDirty();
    });
    noteTitle.addEventListener('keydown',function(e){
      if(e.key==='Enter'){e.preventDefault();noteTitle.blur();}
    });
  }
}

/* ===== export / import / new-note modal / init ===== */
function slug(t){return (t||'note').replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'-').toLowerCase().slice(0,60)||'note';}
function dl(content,name,type){
  var b=new Blob([content],{type:type||'text/plain'});
  var u=URL.createObjectURL(b);
  var a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(u);a.remove();},400);
}
var htmlIdN=0;
function blockToHTML(b){
  var t=b.type,h=b.html||'';  if(t==='h1'||t==='h2'||t==='h3'){var hid='h'+(htmlIdN++);return '<'+t+' id="'+hid+'">'+h+'</'+t+'>';}
  if(t==='bullet')return '<ul><li>'+h+'</li></ul>';
  if(t==='numbered')return '<ol><li>'+h+'</li></ol>';
  if(t==='todo')return '<p>'+(b.checked?'&#9745;':'&#9744;')+' '+h+'</p>';
  if(t==='quote')return '<blockquote>'+h+'</blockquote>';
  if(t==='callout')return '<div style="border-left:3px solid #6c7bff;background:#f4f5ff;padding:12px 16px;border-radius:8px;margin:12px 0">'+h+'</div>';
  if(t==='divider')return '<hr>';
  if(t==='code')return '<pre><code>'+highlightCode(trimCode(b.src||stripTags(h)),b.lang||'plaintext')+'</code></pre>';
  if(t==='image')return '<figure><img src="'+esc(b.src||'')+'" alt="">'+(b.caption?'<figcaption>'+esc(b.caption)+'</figcaption>':'')+'</figure>';
  if(t==='video'){
    var s=b.src||'';
    if(/youtube\.com|youtu\.be/.test(s)){
      var id='',m=s.match(/[?&]v=([^&]+)/);if(m)id=m[1];else{var m2=s.match(/youtu\.be\/([^?]+)/);if(m2)id=m2[1];}
      if(id)return '<div style="position:relative;padding-bottom:56.25%;height:0"><iframe style="position:absolute;inset:0;width:100%;height:100%" src="https://www.youtube.com/embed/'+esc(id)+'" allowfullscreen></iframe></div>';
    }
    if(/vimeo\.com/.test(s)){var v=s.match(/vimeo\.com\/(\d+)/);if(v)return '<div style="position:relative;padding-bottom:56.25%;height:0"><iframe style="position:absolute;inset:0;width:100%;height:100%" src="https://player.vimeo.com/video/'+v[1]+'" allowfullscreen></iframe></div>';}
    return '<video controls style="max-width:100%" src="'+esc(s)+'"></video>';
  }
  if(t==='embed')return '<div style="position:relative;padding-bottom:56.25%;height:0"><iframe style="position:absolute;inset:0;width:100%;height:100%" src="'+esc(b.src||'')+'" loading="lazy"></iframe></div>';
  if(t==='link')return '<p><a href="'+esc(b.url||'')+'">'+esc(b.title||b.url||'')+'</a></p>';
  if(t==='box'){
    var x=b.box||{};
    var out='<header class="boxcard">';
    if(x.cover)out+='<img class="cover" src="'+esc(x.cover)+'" alt="">';
    out+='<div class="meta">'+esc(platLabel(x.platform))+' &bull; '+esc(x.difficulty||'')+' &bull; '+esc(x.os||'')+'</div>';
    out+='<h1>'+esc(x.name||'Untitled box')+'</h1></header>';
    return out;
  }
  if(t==='table'){
    var rows=b.rows||[],ht='<table class="tbl">';
    for(var r=0;r<rows.length;r++){
      var tg=(r===0&&b.header!==false)?'th':'td';
      ht+='<tr>';
      for(var c=0;c<rows[r].length;c++)ht+='<'+tg+'>'+rows[r][c]+'</'+tg+'>';
      ht+='</tr>';
    }
    return ht+'</table>';
  }
  if(t==='toggle'){
    var kids=(b.children||[]).map(blockToHTML).join('');
    return '<details><summary>'+(b.html||'')+'</summary>'+kids+'</details>';
  }
  if(t==='audio')return '<p><audio controls src="'+esc(b.src||'')+'"></audio></p>';
  if(t==='file')return '<p><a href="'+esc(b.url||'')+'" download>'+esc(b.name||b.url||'file')+'</a></p>';
  if(t==='page')return '<p><a href="#">'+esc(b.label||'writeup')+'</a></p>';
  if(t==='toc')return '<!-- table of contents -->';
  if(t==='button')return '<p><a class="btn" href="'+esc(b.url||'#')+'">'+esc(b.label||'Button')+'</a></p>';
  if(t==='breadcrumb'){var bc=cur();return '<p class="crumb">'+esc((bc&&bc.title)||'')+'</p>';}
  if(t==='equation')return '<p class="eq">\\('+esc(b.latex||'')+'\\)</p>';
  if(t==='tip')return '<aside class="tip"><b>Tip:</b> '+(stripTags(b.html)||'')+'<br>'+esc(b.body||'')+'</aside>';  return '<p>'+h+'</p>';
}
function blockToMD(b){
  var t=b.type,h=stripTags(b.html||'');
  if(t==='h1')return '# '+h;
  if(t==='h2')return '## '+h;
  if(t==='h3')return '### '+h;
  if(t==='bullet')return '- '+h;
  if(t==='numbered')return '1. '+h;
  if(t==='todo')return (b.checked?'- [x] ':'- [ ] ')+h;
  if(t==='quote')return '> '+h;
  if(t==='callout')return '> **'+h+'**';
  if(t==='divider')return '---';
  if(t==='code')return '```'+(b.lang||'')+'\n'+stripTags(b.src||b.html||'')+'\n```';
  if(t==='image')return '!['+(b.caption||'')+']('+(b.src||'')+')';
  if(t==='video')return '['+(b.caption||'video')+']('+(b.src||'')+')';
  if(t==='embed')return '['+(b.title||'embed')+']('+(b.url||b.src||'')+')';
  if(t==='link')return '['+(b.title||b.url||'')+']('+(b.url||'')+')';
  if(t==='box'){
    var x=b.box||{};
    var md='**'+platLabel(x.platform)+' | '+(x.difficulty||'')+' | '+(x.os||'')+'**\n### '+(x.name||'Untitled box');
    if(x.cover)md='!['+(x.name||'cover')+']('+x.cover+')\n'+md;
    return md;
  }
  if(t==='table'){
    var rows=b.rows||[],md='';
    for(var r=0;r<rows.length;r++){
      md+='| '+rows[r].join(' | ')+' |\n';
      if(r===0&&b.header!==false)md+='| '+rows[r].map(function(){return '---';}).join(' | ')+' |\n';
    }
    return md.trim();
  }
  if(t==='toggle')return '- <details><summary>'+stripTags(b.html||'')+'</summary>'+(b.children||[]).map(blockToMD).join('\n')+'</details>';
  if(t==='audio')return '[Audio]('+(b.src||'')+')';
  if(t==='file')return '['+(b.name||'file')+']('+(b.url||'')+')';
  if(t==='page')return '['+(b.label||'writeup')+']';
  if(t==='toc')return '<!-- table of contents -->';
  if(t==='button')return '['+(b.label||'Button')+']('+(b.url||'')+')';
  if(t==='breadcrumb'){var bc=cur();return '> '+((bc&&bc.title)||'');}
  if(t==='equation')return '$'+(b.latex||'')+'$';
  if(t==='tip')return '> **Tip:** '+(stripTags(b.html)||'')+(b.body?'\n> '+String(b.body).replace(/\n/g,'\n> '):'');
  return h;
}
function blocksToHTML(blocks){
  var out='',i=0;
  while(i<blocks.length){
    var t=blocks[i].type;
    if(t==='bullet'||t==='numbered'){
      var tag=t==='bullet'?'ul':'ol',items=[];
      while(i<blocks.length&&blocks[i].type===t){items.push('<li>'+(blocks[i].html||'')+'</li>');i++;}
      out+='<'+tag+'>'+items.join('')+'</'+tag+'>';
      continue;
    }
    out+=blockToHTML(blocks[i]);i++;
  }
  return out;
}
function exportHTML(){
  var n=cur();if(!n)return;readDOM(n);
  htmlIdN=0;
  var body=blocksToHTML(n.blocks||[]);
  var toc='';
  var heads=[];
  for(var i=0;i<n.blocks.length;i++){
    var b=n.blocks[i];
    if(b.type==='h1'||b.type==='h2'||b.type==='h3')heads.push({t:b.type,lvl:parseInt(b.type.slice(1),10),x:stripTags(b.html||'')});
  }
  if(heads.length>1){
    toc='<nav class="toc"><div class="toc-h">Contents</div>';
    for(var j=0;j<heads.length;j++)toc+='<a class="l'+(heads[j].lvl-1)+'" href="#h'+j+'">'+esc(heads[j].x)+'</a>';
    toc+='</nav>';
  }
  var css='body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Arial,sans-serif;max-width:780px;margin:0 auto;padding:48px 24px 96px;line-height:1.7;color:#1b1f2a;background:#fff;-webkit-font-smoothing:antialiased}'
    +'h1,h2,h3,h4{line-height:1.25;letter-spacing:-.02em;margin:1.8em 0 .5em}h1{font-size:2em}h2{font-size:1.5em}h3{font-size:1.2em}'
    +'p{margin:0 0 1em}img{max-width:100%;border-radius:10px;display:block}figure{margin:18px 0}figcaption{font-size:.85em;color:#777;text-align:center}'
    +'blockquote{border-left:3px solid #4f5fe0;padding:2px 0 2px 16px;color:#4b5563;margin:1em 0;font-style:italic}'
    +'pre{background:#f6f8fa;border:1px solid #e3e6ef;color:#24292f;padding:14px 16px;border-radius:10px;overflow-x:auto;font-size:.86em;line-height:1.65}'
    +'code{font-family:"JetBrains Mono",Consolas,monospace;font-size:.88em;background:#f1f3f9;padding:2px 5px;border-radius:4px}'
    +'pre code{background:none;padding:0;color:inherit}hr{border:0;border-top:1px solid #e3e6ef;margin:2.2em 0}'
    +'.tok-pln{color:#24292f}.tok-com{color:#6e7781;font-style:italic}.tok-str{color:#0a7d3f}.tok-num{color:#b35309}'
    +'.tok-kw{color:#8250df;font-weight:600}.tok-fn{color:#0550ae}.tok-key{color:#0b7285}.tok-const{color:#953800}.tok-pun{color:#57606a}'
    +'ul,ol{margin:0 0 1em;padding-left:1.4em}a{color:#4f5fe0}'
    +'.boxcard{border-bottom:2px solid #e3e6ef;padding-bottom:14px;margin-bottom:26px}.boxcard .cover{width:100%;max-height:320px;object-fit:cover;margin-bottom:14px}'
    +'.boxcard .meta{font-size:11px;color:#8b93a6;text-transform:uppercase;letter-spacing:.09em;font-weight:700}'
    +'.boxcard h1{margin:4px 0 0;font-size:2.1em}'
    +'.tip{border-left:3px solid #b7791f;background:#fdf6e3;padding:12px 16px;border-radius:8px;margin:12px 0;font-size:.95em}'+'.toc{background:#f7f8fc;border:1px solid #e6e9f2;border-radius:12px;padding:16px 18px;margin:0 0 32px}.toc-h{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:#8b93a6;font-weight:700;margin-bottom:8px}'
    +'.toc a{display:block;color:#3b4252;text-decoration:none;font-size:.94em;padding:2px 0}.toc a:hover{color:#4f5fe0}.toc a.l1{font-weight:700}.toc a.l2{padding-left:16px}.toc a.l3{padding-left:32px;font-size:.88em}'
    +'@media print{body{padding:0}.toc{display:none}}';
  var full='<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(n.title)+'</title><style>'+css+'</style></head><body>'+toc+body+'</body></html>';
  dl(full,slug(n.title)+'.html','text/html');
  toast('HTML exported · post it on your site');
}
function exportMD(){
  var n=cur();if(!n)return;readDOM(n);
  var md='# '+n.title+'\n\n'+n.blocks.map(blockToMD).join('\n\n')+'\n';
  dl(md,slug(n.title)+'.md','text/markdown');
  toast('Markdown exported');
}
/* ===== import: HTML / Markdown / JSON ===== */
function importFile(file){
  if(!file)return;
  var name=file.name||'import';
  var reader=new FileReader();
  reader.onload=function(e){
    var content=e.target.result;
    if(/\.json$/i.test(name)){
      try{
        var data=JSON.parse(content);
        var list=Array.isArray(data)?data:(data&&Array.isArray(data.notes)?data.notes:null);
        if(!list)throw new Error('bad shape');
        var added=mergeNotes(list);
        persist();renderNotes();
        toast(added?added+' writeup'+(added===1?'':'s')+' imported':'Already up to date');
      }catch(err){toast('Could not read that JSON backup');}
      return;
    }
    if(/\.html?$/i.test(name)){importMarkup(name,content,true);return;}
    if(/\.(md|markdown|txt)$/i.test(name)){importMarkup(name,content,false);return;}
    toast('Unsupported file type');
  };
  reader.readAsText(file);
}
function importMarkup(name,content,isHtml){
  var title=name.replace(/\.[^/.]+$/,'');
  var blocks=[];
  if(isHtml){
    var doc;
    try{doc=new DOMParser().parseFromString(content,'text/html');}catch(e){doc=null;}
    if(!doc){toast('Could not parse that HTML file');return;}
    var tt=doc.querySelector('title');
    if(tt&&tt.textContent.trim())title=tt.textContent.trim();
    blocks=importHtmlNodes(doc.body);
  }else{
    blocks=parseMarkdown(content);
    for(var i=0;i<blocks.length;i++){
      if(blocks[i].type==='h1'){title=stripTags(blocks[i].html)||title;blocks.splice(i,1);break;}
    }
  }
  if(!blocks.length)blocks=[mkBlock('text','')];
  var n={id:uid('note'),title:title,createdAt:Date.now(),updatedAt:Date.now(),blocks:blocks};
  notes.unshift(n);curId=n.id;
  persist();render();renderNotes();saveNow();
  toast('Imported "'+title+'"');
}
function sanitizeHTML(html){
  var d=document.createElement('div');
  d.innerHTML=String(html==null?'':html);
  var bad=d.querySelectorAll('script,style,iframe,object,embed,link,meta,base,form,noscript');
  for(var i=0;i<bad.length;i++)bad[i].parentNode.removeChild(bad[i]);
  var all=d.querySelectorAll('*');
  for(var j=0;j<all.length;j++){
    var el=all[j];
    var attrs=Array.prototype.slice.call(el.attributes||[]);
    for(var k=0;k<attrs.length;k++){
      var nm=String(attrs[k].name||'').toLowerCase();
      if(nm.indexOf('on')===0){el.removeAttribute(attrs[k].name);continue;}
      if((nm==='href'||nm==='src'||nm==='xlink:href'||nm==='action'||nm==='formaction'||nm==='data')&&/^\s*(javascript|vbscript|data:text\/html)/i.test(attrs[k].value||'')){el.removeAttribute(attrs[k].name);}
    }
  }
  return d.innerHTML;
}
function importHtmlNodes(root){
  var out=[];
  if(!root)return out;
  var kids=root.children;
  for(var i=0;i<kids.length;i++){
    var el=kids[i];
    var t=(el.tagName||'').toLowerCase();
    if(t==='h1')out.push(mkBlock('h1',sanitizeHTML(el.innerHTML)));
    else if(t==='h2')out.push(mkBlock('h2',sanitizeHTML(el.innerHTML)));
    else if(t==='h3')out.push(mkBlock('h3',sanitizeHTML(el.innerHTML)));
    else if(t==='h4'||t==='h5'||t==='h6')out.push(mkBlock('h3',sanitizeHTML(el.innerHTML)));
    else if(t==='p')out.push(mkBlock('text',sanitizeHTML(el.innerHTML)));
    else if(t==='ul'||t==='ol'){
      var lis=[];for(var _li=0;_li<el.children.length;_li++){if(el.children[_li].tagName&&el.children[_li].tagName.toLowerCase()==='li')lis.push(el.children[_li]);}
      for(var j=0;j<lis.length;j++)out.push(mkBlock(t==='ul'?'bullet':'numbered',sanitizeHTML(lis[j].innerHTML)));
    }
    else if(t==='blockquote')out.push(mkBlock('quote',sanitizeHTML(el.innerHTML)));
    else if(t==='pre'){
      var code=el.querySelector('code');
      var lang='bash';
      if(code&&code.className){var mm=String(code.className).match(/language-(\w+)/);if(mm)lang=mm[1];}
      out.push({id:uid(),type:'code',lang:lang,cmode:'code',src:el.textContent||''});
    }
    else if(t==='img')out.push({id:uid(),type:'image',src:el.getAttribute('src')||'',caption:el.getAttribute('alt')||''});
    else if(t==='figure'){
      var im=el.querySelector('img'),cap=el.querySelector('figcaption');
      out.push({id:uid(),type:'image',src:im?(im.getAttribute('src')||''):'',caption:cap?cap.textContent:''});
    }
    else if(t==='hr')out.push(mkBlock('divider',''));
    else if(t==='div'||t==='section'||t==='article'||t==='main'||t==='header'||t==='footer'||t==='body'||t==='table'||t==='ul'||t==='ol'){
      var kids2=el.children;
      if(!kids2.length)out.push(mkBlock('text',sanitizeHTML(el.innerHTML)));
      else out=out.concat(importHtmlNodes(el));
    }
    else out.push(mkBlock('text',sanitizeHTML(el.innerHTML)));
  }
  return out;
}
function parseMarkdown(text){
  var lines=String(text||'').replace(/\r\n?/g,'\n').split('\n');
  var out=[],buf=[],inCode=false,codeLang='bash',codeBuf=[];
  function flush(){
    if(buf.length){out.push(mkBlock('text',esc(buf.join(' '))));buf=[];}
  }
  for(var i=0;i<lines.length;i++){
    var ln=lines[i];
    var fence=ln.match(/^\s*```(\w*)\s*$/);
    if(fence){
      if(!inCode){flush();inCode=true;codeLang=fence[1]||'bash';codeBuf=[];}
      else{inCode=false;out.push({id:uid(),type:'code',lang:codeLang,cmode:'code',src:codeBuf.join('\n')});}
      continue;
    }
    if(inCode){codeBuf.push(ln);continue;}
    if(/^\s*$/.test(ln)){flush();continue;}
    var h=ln.match(/^(#{1,6})\s+(.*)$/);
    if(h){flush();var lvl=Math.min(3,h[1].length);out.push(mkBlock('h'+lvl,esc(h[2])));continue;}
    if(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(ln)){flush();out.push(mkBlock('divider',''));continue;}
    var todo=ln.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if(todo){flush();out.push({id:uid(),type:'todo',html:esc(todo[2]),checked:todo[1].toLowerCase()==='x'});continue;}
    var num=ln.match(/^\s*\d+[.)]\s+(.*)$/);
    if(num){flush();out.push(mkBlock('numbered',esc(num[1])));continue;}
    var bul=ln.match(/^\s*[-*+]\s+(.*)$/);
    if(bul){flush();out.push(mkBlock('bullet',esc(bul[1])));continue;}
    var quo=ln.match(/^\s*>\s?(.*)$/);
    if(quo){flush();out.push(mkBlock('quote',esc(quo[1])));continue;}
    var img=ln.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
    if(img){flush();out.push({id:uid(),type:'image',src:img[2],caption:img[1]});continue;}
    var lnk=ln.match(/^\s*\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
    if(lnk){flush();out.push({id:uid(),type:'link',url:lnk[2],title:lnk[1]||lnk[2]});continue;}
    buf.push(ln.trim());
  }
  flush();
  if(inCode&&codeBuf.length)out.push({id:uid(),type:'code',lang:codeLang,cmode:'code',src:codeBuf.join('\n')});
  return out;
}
function printNote(){
  var n=cur();if(n)readDOM(n);
  try{window.print();}catch(e){toast('Print unavailable');}
}
var modalCoverData='',modalCoverName='';
function refreshModalCover(){
  var fn=document.getElementById('m-file-name');
  var rm=document.getElementById('m-cover-rm');
  var pv=document.getElementById('m-preview');
  var pvi=document.getElementById('m-preview-img');
  if(fn)fn.textContent=modalCoverData?(modalCoverName||'file chosen'):'No file chosen';
  if(rm)rm.style.display=modalCoverData?'':'none';
  if(pv)pv.style.display=modalCoverData?'':'none';
  if(pvi&&modalCoverData)pvi.src=modalCoverData;
}
function resetModalCover(){
  modalCoverData='';modalCoverName='';
  var mcf=document.getElementById('m-cover-file');if(mcf)mcf.value='';
  refreshModalCover();
}
function openNewModal(){
  var m=document.getElementById('new-modal');if(!m)return;
  m.style.display='flex';
  var err=document.getElementById('m-err');if(err)err.style.display='none';
  resetModalCover();
  setTimeout(function(){var nm=document.getElementById('m-name');if(nm)nm.focus();},60);
}
function closeNewModal(){var m=document.getElementById('new-modal');if(m)m.style.display='none';}
function createFromModal(){
  var nm=document.getElementById('m-name');
  var name=nm?(nm.value||'').trim():'';
  if(!name){var e=document.getElementById('m-err');if(e)e.style.display='block';if(nm)nm.focus();return;}
  var pl=document.getElementById('m-platform'),df=document.getElementById('m-diff'),os=document.getElementById('m-os');
  var old=cur();if(old)readDOM(old);
  var b=mkBox();
  b.box={name:name,platform:pl?pl.value:'HTB',difficulty:df?df.value:'Easy',os:os?os.value:'Linux',cover:modalCoverData||''};
  var n={id:uid('note'),title:name,createdAt:Date.now(),updatedAt:Date.now(),blocks:[b,mkBlock('text','')]};
  notes.unshift(n);curId=n.id;
  if(nm)nm.value='';
  closeNewModal();
  persist();render();saveNow();
  var bl=editor.querySelectorAll('.block');
  if(bl[1])focusBlock(bl[1],false);
  toast('Writeup created: '+name);
}
function newNote(){openNewModal();}
function wireModal(){
  var mCreate=document.getElementById('m-create');
  if(mCreate)mCreate.addEventListener('click',createFromModal);
  var mCancel=document.getElementById('m-cancel');
  if(mCancel)mCancel.addEventListener('click',closeNewModal);
  var mX=document.getElementById('new-modal-x');
  if(mX)mX.addEventListener('click',closeNewModal);
  var mBack=document.getElementById('new-modal');
  if(mBack)mBack.addEventListener('mousedown',function(e){if(e.target===mBack)closeNewModal();});
  var mName=document.getElementById('m-name');
  if(mName)mName.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();createFromModal();}});
  var mBtn=document.getElementById('m-cover-btn'),mFile=document.getElementById('m-cover-file');
  if(mBtn&&mFile)mBtn.addEventListener('click',function(){mFile.click();});
  if(mFile)mFile.addEventListener('change',function(){
    var f=mFile.files&&mFile.files[0];if(!f)return;
    fileToCoverData(f,function(out){modalCoverData=out||'';modalCoverName=f.name||'file';refreshModalCover();});
    mFile.value='';
  });
  var mRm=document.getElementById('m-cover-rm');
  if(mRm)mRm.addEventListener('click',function(){resetModalCover();});
}
var readyPromise=Promise.resolve();
function init(){
  load();
  if(window.Storage&&Storage.init){
    readyPromise=Storage.init().then(function(){
      var data=Storage.load();
      if(data&&data.length)notes=data;
      boot();
    },function(){boot();});
  }else{boot();}
}
function boot(){
  if(!notes.length)notes=[defaultNote()];
  getSort();
  var last=null;try{last=localStorage.getItem('writeup_notes_active');}catch(e){}
  curId=(last&&findNote(last))?last:notes[0].id;
  render();
  buildColors();
  wireEditor();
  wireToolbar();
  wireSidebar();
  wireTopbar();
  if(window.addEventListener)window.addEventListener('load',function(){setTimeout(function(){try{postRender();}catch(e){}},80);});  wireModal();
  renderNotes();
  updateStats();
  document.addEventListener('mousedown',function(e){
    var t=e.target;
    if(t&&t.closest){
      if(!t.closest('.slash-menu')&&!t.closest('.format-toolbar')&&!t.closest('.color-pop')){closeSlash();colorPop.style.display='none';}
      if(!t.closest('.format-toolbar')&&!t.closest('.color-pop')){hideFmt();}
    }
  });
  document.addEventListener('scroll',function(){hideFmt();},true);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeSlash();hideFmt();closeNewModal();}});
  document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&(e.key||'').toLowerCase()==='s'){e.preventDefault();saveNow();toast('Saved');}});
editor.addEventListener('paste',function(e){var b=blockOf(e.target);var t=b&&b.getAttribute('data-type');if(!t)return;e.preventDefault();var cd=e.clipboardData||window.clipboardData;var text=cd?cd.getData('text/plain'):'';if(t==='code'){document.execCommand('insertText',false,text);}else if(t!=='box'&&t!=='divider'&&t!=='image'&&t!=='video'&&t!=='embed'&&t!=='link'){document.execCommand('insertHTML',false,esc(text).replace(/\n/g,'<br>'));}});
window.addEventListener('beforeunload',function(e){var n=cur();if(n){readDOM(n);if(titleOwner===n.id)n.title=noteTitle.value||'Untitled';persist();}if(window.Storage&&Storage.flushNow){try{Storage.flushNow();}catch(e){}}if(saveStatus&&saveStatus.textContent!=='Saved'){e.preventDefault();e.returnValue='';}});
  setInterval(function(){var n=cur();if(n&&saveStatus.textContent==='Unsaved')saveNow();},4000);
}

/* ===== public API for the add-on scripts (ai, search, mediaupload, ui) ===== */
window.WriteUp={
  ready:function(){return readyPromise;},
  getNotes:function(){return notes;},
  getCurrent:function(){return cur();},
  getCurrentId:function(){return curId;},
  setCurrent:function(id){openNote(id);},
  persist:persist,
  render:render,
  renderNotes:renderNotes,
  openNote:openNote,
  toast:toast,
  refreshDerived:postRender,  saveNow:saveNow,
  renameNote:renameNote,
  duplicateNote:duplicateNote,
  togglePin:togglePin,
  deleteNote:deleteNote,
  undoDelete:undoDelete,
  mergeNotes:mergeNotes,
  exportHTML:exportHTML,
  exportMD:exportMD,
  printNote:printNote,
  importFile:importFile,
  getSort:getSort,
  setSort:setSort,
  findNote:findNote
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();




