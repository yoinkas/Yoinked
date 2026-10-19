/* WriteUp ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Notion-style notes, dark theme */
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
var notes=[],curId=null,uidN=0,saveTimer=null,toastTimer=null;
var slash={open:false,filter:'',sel:0,items:[],anchorBlock:null};
var savedRange=null,colorMode='text';
var COMMANDS=[
{g:'Text',cmd:'text',icon:'fa-solid fa-paragraph',t:'Text',d:'Plain paragraph',key:''},
{g:'Text',cmd:'h1',icon:'fa-solid fa-heading',t:'Heading 1',d:'Large title',key:'#'},
{g:'Text',cmd:'h2',icon:'fa-solid fa-heading',t:'Heading 2',d:'Medium title',key:'##'},
{g:'Text',cmd:'h3',icon:'fa-solid fa-heading',t:'Heading 3',d:'Small title',key:'###'},
{g:'Text',cmd:'quote',icon:'fa-solid fa-quote-right',t:'Quote',d:'Callout quote',key:'>'},
{g:'Text',cmd:'callout',icon:'fa-solid fa-circle-exclamation',t:'Callout',d:'Box with icon',key:'!'},
{g:'List',cmd:'bullet',icon:'fa-solid fa-list-ul',t:'Bullet list',d:'Bulleted item',key:'-'},
{g:'List',cmd:'numbered',icon:'fa-solid fa-list-ol',t:'Numbered list',d:'Ordered item',key:'1.'},
{g:'List',cmd:'todo',icon:'fa-solid fa-square-check',t:'To-do',d:'Checkbox task',key:'[]'},
{g:'Media',cmd:'code',icon:'fa-solid fa-code',t:'Code',d:'Terminal code block',key:'```'},
{g:'Media',cmd:'image',icon:'fa-solid fa-image',t:'Image',d:'Embed via URL',key:''},
{g:'Media',cmd:'video',icon:'fa-solid fa-play',t:'Video',d:'YouTube / mp4 embed',key:''},
{g:'Media',cmd:'embed',icon:'fa-solid fa-window-maximize',t:'Embed',d:'Any iframe URL',key:''},
{g:'Media',cmd:'link',icon:'fa-solid fa-link',t:'Link card',d:'Bookmark link',key:''},
{g:'Writeup',cmd:'box',icon:'fa-solid fa-cube',t:'Box info',d:'HTB / THM machine card',key:''},
{g:'Basic',cmd:'divider',icon:'fa-solid fa-minus',t:'Divider',d:'Horizontal line',key:'---'}
];
var LANGS=['plaintext','bash','python','javascript','typescript','html','css','json','sql','csharp','cpp','java','go','rust','php','ruby','powershell','markdown','yaml'];
var TEXTCOLORS=['#e6e9f0','#9aa3b5','#ffffff','#6c7bff','#3fb97f','#e5b45c','#e5606e','#f472b6','#22d3ee','#a78bfa','#000000','#166534','#1d4ed8','#9d6bff','#b45309','#be123c'];
var HLCOLORS=['transparent','#fef08a','#bbf7d0','#bfdbfe','#fecaca','#e9d5ff','#fed7aa','#a5f3fc','#6c7bff','#1f2937','#166534','#1e3a8a','#7c2d12','#831843'];
function uid(p){uidN++;return (p||'b')+'-'+Date.now().toString(36)+'-'+uidN;}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function stripTags(s){var d=document.createElement('div');d.innerHTML=s||'';return d.textContent||'';}
function txt(el){if(!el)return '';var t=el.innerText;return (t==null?el.textContent:t)||'';}
function toast(m){toastEl.textContent=m;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){toastEl.classList.remove('show');},2200);}
function debounce(fn,ms){var t;return function(){clearTimeout(t);var a=arguments,s=this;t=setTimeout(function(){fn.apply(s,a);},ms);};}
var updateStats=debounce(updateStatsRaw,120);
function cur(){for(var i=0;i<notes.length;i++){if(notes[i].id===curId)return notes[i];}return notes[0]||null;}
function load(){try{var d=localStorage.getItem(KEY);if(d){notes=JSON.parse(d)||[];}}catch(e){notes=[];}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(notes));}catch(e){toast('Storage full ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â image too large');}}
function setStatus(s,t){saveStatus.className='status '+s;saveStatus.textContent=t==='saved'?'Saved':t==='saving'?'Saving...':'Unsaved';if(saveText)saveText.textContent=t==='saved'?'All changes saved':t==='saving'?'Saving...':'Unsaved changes';}
function markDirty(){setStatus('unsaved');clearTimeout(saveTimer);saveTimer=setTimeout(function(){saveNow();},900);}
function saveNow(){var n=cur();if(!n)return;setStatus('saving');readDOM(n);n.title=noteTitle.value||'Untitled';n.updatedAt=Date.now();persist();setStatus('saved');updateStats();renderNotes();}
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
function blockEl(b){
var el=document.createElement('div');
el.className='block';el.setAttribute('data-type',b.type);el.setAttribute('data-id',b.id);
var drag=document.createElement('div');drag.className='drag-handle';drag.title='Drag to reorder';drag.innerHTML='<i class="fa-solid fa-grip-vertical"></i>';
el.appendChild(drag);
if(b.type==='box'){el.appendChild(buildBoxCard(b));wireBox(el);}
else{
var c=document.createElement('div');c.className='block-content';
var t=b.type;
if(t==='todo'){c.contentEditable='true';c.setAttribute('data-placeholder','To-do');c.innerHTML='<span class="todo-box'+(b.checked?' done':'')+'" contenteditable="false">'+(b.checked?'<i class="fa-solid fa-check"></i>':'')+'</span>'+(b.html||'');}
else if(t==='code'){c.contentEditable='true';c.setAttribute('data-placeholder','Write code...');c.textContent=b.src||'';el.appendChild(buildCodeHead(b));}
else if(t==='divider'){c.innerHTML='<div class="divider-line"></div>';}
else if(t==='image'){c.innerHTML='<div class="img-wrap"><img src="'+esc(b.src||'')+'" alt=""></div><div class="img-cap" contenteditable="true" data-placeholder="Add a caption...">'+(b.caption||'')+'</div>';}
else if(t==='video'){c.innerHTML=videoEmbed(b.src);}
else if(t==='embed'){c.innerHTML='<div class="embed-frame"><iframe src="'+esc(b.src||'')+'" loading="lazy"></iframe></div>';}
else if(t==='link'){c.innerHTML=linkCard(b);}
else{c.contentEditable='true';c.setAttribute('data-placeholder',phFor(t));c.innerHTML=b.html||'';}
el.appendChild(c);
}
var add=document.createElement('div');add.className='block-add';add.title='Add block below';add.innerHTML='<i class="fa-solid fa-plus"></i>';
el.appendChild(add);
if(b.type==='code'){el.setAttribute('data-lang',b.lang||'bash');el.setAttribute('data-cmode',b.cmode||'term');el.classList.add('code-mode-'+(b.cmode||'term'));}
if(b.type==='todo'&&b.checked)el.classList.add('checked');
if(b.type==='video'||b.type==='embed')el.setAttribute('data-src',b.src||'');
if(b.type==='link'){el.setAttribute('data-url',b.url||'');el.setAttribute('data-title',b.title||'');}
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
function readAllBlocks(){
var out=[];
var els=editor.querySelectorAll('.block');
for(var i=0;i<els.length;i++){
var el=els[i];var t=el.getAttribute('data-type');var id=el.getAttribute('data-id');
var c=el.querySelector('.block-content');
if(t==='box'){out.push(readBoxFromEl(el,id));}
else if(t==='code'){out.push({id:id,type:'code',src:txt(c),lang:el.getAttribute('data-lang')||'bash',cmode:el.getAttribute('data-cmode')||'term'});}
else if(t==='todo'){var tc=c?c.cloneNode(true):null;var tb=tc?tc.querySelector('.todo-box'):null;if(tb)tb.remove();out.push({id:id,type:'todo',html:tc?tc.innerHTML:'',checked:el.classList.contains('checked')});}
else if(t==='image'){var im=el.querySelector('.img-wrap img');var cap=el.querySelector('.img-cap');out.push({id:id,type:'image',src:im?im.getAttribute('src'):'',caption:cap?cap.innerHTML:''});}
else if(t==='video'||t==='embed'){out.push({id:id,type:t,src:el.getAttribute('data-src')||''});}
else if(t==='link'){out.push({id:id,type:'link',url:el.getAttribute('data-url')||'',title:el.getAttribute('data-title')||''});}
else if(t==='divider'){out.push({id:id,type:'divider'});}
else{out.push({id:id,type:t,html:c?c.innerHTML:''});}
}
return out;
}
function readDOM(n){if(!n)return;var b=readAllBlocks();if(b.length||n.blocks&&n.blocks.length)n.blocks=b;}
function focusBlock(el,atEnd){
if(!el)return;var c=contentEl(el);if(!c)return;
c.focus();
if(atEnd!==false){var r=document.createRange();r.selectNodeContents(c);r.collapse(false);var s=window.getSelection();s.removeAllRanges();s.addRange(r);}
}
function render(){
var n=cur();
noteTitle.value=n?(n.title||''):'';
editor.innerHTML='';
if(n){
var frag=document.createDocumentFragment();
var bl=n.blocks&&n.blocks.length?n.blocks:[mkBlock('text','')];
for(var i=0;i<bl.length;i++){frag.appendChild(blockEl(bl[i]));}
editor.appendChild(frag);
var __nums=editor.querySelectorAll('.block[data-type=numbered]');for(var __q=0;__q<__nums.length;__q++){var __pv=__nums[__q].previousElementSibling;if(!__pv||__pv.getAttribute('data-type')!=='numbered')__nums[__q].style.counterReset='num';}
}
renderNotes();updateStats();
}
function langIdx(l){for(var i=0;i<LANGS.length;i++){if(LANGS[i]===l)return i;}return 0;}
function cycleLang(blk){
var c=blk.getAttribute('data-lang')||'bash';
var nx=LANGS[(langIdx(c)+1)%LANGS.length];
blk.setAttribute('data-lang',nx);
var el=blk.querySelector('.code-lang');if(el)el.textContent=nx+' ÃƒÂ¢Ã¢â‚¬â€œÃ‚Â¼';
var t=blk.querySelector('.term-title');if(t&&blk.getAttribute('data-cmode')==='code')t.textContent=nx+' ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â writeup';
saveNow();
}
function toggleCodeMode(blk){
var m=blk.getAttribute('data-cmode')==='code'?'term':'code';
blk.setAttribute('data-cmode',m);
blk.classList.remove('code-mode-term','code-mode-code');
blk.classList.add('code-mode-'+m);
var t=blk.querySelector('.term-title');if(t)t.textContent=m==='term'?'kali@kali: ~':((blk.getAttribute('data-lang')||'bash')+' ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â writeup');
var b=blk.querySelector('.code-mode');if(b)b.textContent=m==='term'?'>_':'{ }';
saveNow();
}
function copyCode(blk){
var c=contentEl(blk);var t=txt(c);
function ok(){toast('Copied to clipboard');}
function fail(){toast('Copy failed');}
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(ok,fail);}
else{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok();}catch(e){fail();}document.body.removeChild(ta);}
}
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
var idx=blockIndex(n,id);
var nb=data||mkBlock(type||'text','');
if(idx>=0)n.blocks.splice(idx+1,0,nb);else n.blocks.push(nb);
persist();render();
var els=editor.querySelectorAll('.block');
for(var j=0;j<els.length;j++){if(els[j].getAttribute('data-id')===nb.id){focusBlock(els[j],true);break;}}
markDirty();
}
function removeBlock(blk){
var n=cur();if(!n)return;readDOM(n);
var id=blk.getAttribute('data-id');
if(n.blocks.length<=1){toast('Note needs at least one block');return;}
n.blocks=n.blocks.filter(function(b){return b.id!==id;});
if(!n.blocks.length)n.blocks=[mkBlock('text','')];
persist();render();markDirty();
}
function buildCodeHead(b){
  var head=document.createElement('div');head.className='code-head';head.setAttribute('contenteditable','false');
  var dots=document.createElement('span');dots.className='term-dots';
  dots.innerHTML='<i class="tdot r"></i><i class="tdot y"></i><i class="tdot g"></i>';
  head.appendChild(dots);
  var t=document.createElement('span');t.className='term-title';
  t.textContent=(b.cmode==='code')?((b.lang||'bash')+' ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â writeup'):'kali@kali: ~';
  head.appendChild(t);
  var lang=document.createElement('span');lang.className='code-lang';lang.title='Click to change language';
  lang.textContent=(b.lang||'bash')+' ÃƒÂ¢Ã¢â‚¬â€œÃ‚Â¼';head.appendChild(lang);
  var mode=document.createElement('button');mode.className='code-mode';mode.type='button';mode.title='Toggle terminal / code view';
  mode.textContent=(b.cmode==='term')?'>_':'{ }';head.appendChild(mode);
  var copy=document.createElement('button');copy.className='code-copy';copy.type='button';copy.textContent='Copy';head.appendChild(copy);
  return head;
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
  if(charsCount)charsCount.textContent=text.length+' chars';
}
function boxOf(n){ if(n&&n.blocks){for(var i=0;i<n.blocks.length;i++){if(n.blocks[i].type==='box'&&n.blocks[i].box)return n.blocks[i].box;}} return null; }
function fmtDate(ts){ try{var d=new Date(ts||Date.now());return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});}catch(e){return '';} }
function renderNotes(){
  if(!notesList)return;
  var q=(sideSearch&&sideSearch.value||'').toLowerCase();
  notesList.innerHTML='';
  var shown=0;
  for(var i=0;i<notes.length;i++){
    var n=notes[i];
    if(q){var __hay=((n.title||'Untitled')+' '+(n.blocks||[]).map(function(bb){return stripTags(bb.html||bb.src||'')+' '+((bb.box&&bb.box.name)||'');}).join(' ')).toLowerCase();if(__hay.indexOf(q)<0)continue;}
    shown++;
    var item=document.createElement('div');
    item.className='note-item'+(n.id===curId?' active':'');
    item.setAttribute('data-note',n.id);
    var bx=boxOf(n);
    var thumb=document.createElement('div');thumb.className='note-thumb';
    if(bx&&bx.cover){thumb.innerHTML='<img src="'+bx.cover+'" alt="">';}
    else{thumb.innerHTML='<i class="fa-solid fa-cube"></i>';}
    item.appendChild(thumb);
    var meta=document.createElement('div');meta.className='note-meta';
    var name=document.createElement('div');name.className='note-name';name.textContent=n.title||'Untitled';meta.appendChild(name);
    var sub=document.createElement('div');sub.className='note-sub';sub.textContent=fmtDate(n.updatedAt||n.createdAt);meta.appendChild(sub);
    if(bx){
      var badges=document.createElement('div');badges.className='note-badges';
      var p=document.createElement('span');p.className='nb plt-'+(bx.platform||'HTB');p.textContent=bx.platform||'HTB';badges.appendChild(p);
      if(bx.difficulty){var d=document.createElement('span');d.className='nb diff-'+(bx.difficulty||'').replace(/\s/g,'');d.textContent=bx.difficulty;badges.appendChild(d);}
      meta.appendChild(badges);
    }
    item.appendChild(meta);
    var del=document.createElement('button');del.className='note-del';del.type='button';del.title='Delete';
    del.setAttribute('data-del',n.id);del.innerHTML='<i class="fa-solid fa-trash"></i>';
    item.appendChild(del);
    notesList.appendChild(item);
  }
  if(shown===0){var e=document.createElement('div');e.className='side-empty';e.textContent='No writeups found';notesList.appendChild(e);}
  if(sideCount)sideCount.textContent=notes.length;
}
function defaultNote(){ return {id:uid('note'),title:'Untitled',createdAt:Date.now(),updatedAt:Date.now(),blocks:[mkBox(),mkBlock('text','Welcome to WriteUp. Type <b>/</b> for commands.')]}; }
function openNote(id){
  if(id===curId)return;
  var n=cur();if(n)readDOM(n);
  curId=id;render();
  var first=editor.querySelector('.block');if(first)focusBlock(first,true);
}
function deleteNote(id){
  if(!confirm('Delete this writeup? This cannot be undone.'))return;
  notes=notes.filter(function(n){return n.id!==id;});
  if(!notes.length)notes=[defaultNote()];
  if(curId===id)curId=notes[0].id;
  persist();render();toast('Writeup deleted');
}
function makeBlock(type,opts){
  opts=opts||{};
  if(type==='box'){var b=mkBox();if(opts.box)b.box=opts.box;return b;}
  var b=mkBlock(type,opts.html||'');
  if(type==='code'){b.lang=opts.lang||'bash';b.cmode=opts.cmode||'term';b.src=opts.src||'';}
  if(type==='todo'){b.checked=!!opts.checked;}
  if(type==='image'){b.src=opts.src||'';b.caption=opts.caption||'';}
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
  var idx=blockIndex(n,id);
  if(idx<0){n.blocks.push(data);}else{n.blocks.splice(idx,1,data);}
  persist();render();focusBlockById(data.id,true);markDirty();
}
function convertKeep(blk,type,html){replaceBlock(blk,makeBlock(type,{html:html}));}
function promptMsg(cmd){return cmd==='image'?'Image URL:':cmd==='video'?'Video URL (YouTube, Vimeo, or .mp4):':cmd==='embed'?'Embed URL (any iframe URL):':'Link URL:';}
function runSlashCmd(cmd){
  var blk=slash.anchorBlock;closeSlash();if(!blk)return;
  if(cmd==='text'||cmd==='h1'||cmd==='h2'||cmd==='h3'||cmd==='quote'||cmd==='callout'||cmd==='bullet'||cmd==='numbered'||cmd==='todo'){convertKeep(blk,cmd,'');}
  else if(cmd==='code'){replaceBlock(blk,makeBlock('code',{lang:'bash',cmode:'term'}));}
  else if(cmd==='box'){replaceBlock(blk,mkBox());}
  else if(cmd==='divider'){replaceBlock(blk,mkBlock('divider'));}
  else{var url=prompt(promptMsg(cmd),'https://');if(url&&url.trim()){url=url.trim();replaceBlock(blk,makeBlock(cmd,{src:url,url:url,title:url}));}else{convertKeep(blk,'text','');}}
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
    if(top+360>window.innerHeight)top=Math.max(8,r.top-360-8);
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
function editableBlock(blk){ if(!blk)return false; var t=blk.getAttribute('data-type'); return t!=='box'&&t!=='code'&&t!=='divider'&&t!=='image'&&t!=='video'&&t!=='embed'&&t!=='link'; }
var MD_RULES=[{re:/^# $/,type:'h1'},{re:/^## $/,type:'h2'},{re:/^### $/,type:'h3'},{re:/^- $/,type:'bullet'},{re:/^\* $/,type:'bullet'},{re:/^1\. $/,type:'numbered'},{re:/^> $/,type:'quote'},{re:/^---$/,type:'divider'},{re:/^\[\] $/,type:'todo'}];
function tryMarkdown(blk){
  var c=contentEl(blk);if(!c)return false;
  var t=blk.getAttribute('data-type');
  if(t==='code'||t==='box')return false;
  var tt=txt(c);
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
    if(t==='box'||t==='code'||t==='divider'||t==='image'||t==='video'||t==='embed'||t==='link'){markDirty();updateStats();return;}
    var c=contentEl(blk);var t2=txt(c);
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
  if(!blk)return;
  var t=blk.getAttribute('data-type');
  if(e.key==='Enter'&&!e.shiftKey){
    if(t==='code')return;
    e.preventDefault();
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
var dragState=null;
function startDrag(e,blk){
  e.preventDefault();
  if(slash.open)closeSlash();
  dragState={blk:blk,over:null,below:false};
  blk.classList.add('dragging');
  document.addEventListener('mousemove',onDragMove);
  document.addEventListener('mouseup',onDragEnd);
}
function onDragMove(e){
  if(!dragState)return;
  var blks=Array.prototype.slice.call(editor.querySelectorAll('.block'));
  for(var i=0;i<blks.length;i++)blks[i].classList.remove('drop-above','drop-below');
  var over=null,below=false;
  for(var j=0;j<blks.length;j++){
    if(blks[j]===dragState.blk)continue;
    var r=blks[j].getBoundingClientRect();
    if(e.clientY>r.top&&e.clientY<r.bottom){over=blks[j];below=e.clientY>r.top+r.height/2;blks[j].classList.add(below?'drop-below':'drop-above');}
  }
  dragState.over=over;dragState.below=below;
}
function onDragEnd(){
  document.removeEventListener('mousemove',onDragMove);
  document.removeEventListener('mouseup',onDragEnd);
  if(!dragState)return;
  var blk=dragState.blk,over=dragState.over,below=dragState.below;
  blk.classList.remove('dragging');
  var all=editor.querySelectorAll('.block');
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
  dragState=null;
}
function onEditorClick(e){
  var t=e.target;
  if(t===editor){var bl=editor.querySelectorAll('.block');if(bl.length)focusBlock(bl[bl.length-1],true);return;}
  var cl=function(s){return t.closest?t.closest(s):null;};
  var blk=blockOf(t);if(!blk)return;
  if(cl('.box-cover-btn')){var fi=blk.querySelector('.box-cover-file');if(fi)fi.click();e.stopPropagation();return;}
  if(cl('.box-cover-rm')){clearBoxCover(blk);e.stopPropagation();return;}
  if(cl('.code-lang')){cycleLang(blk);e.stopPropagation();return;}
  if(cl('.code-mode')){toggleCodeMode(blk);e.stopPropagation();return;}
  if(cl('.code-copy')){copyCode(blk);e.stopPropagation();return;}
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
    var del=e.target.closest?e.target.closest('.note-del'):null;
    if(del){e.stopPropagation();deleteNote(del.getAttribute('data-del'));return;}
    var item=e.target.closest?e.target.closest('.note-item'):null;
    if(item)openNote(item.getAttribute('data-note'));
  });
  if(sideSearch)sideSearch.addEventListener('input',function(){renderNotes();});
}
function wireTopbar(){
  var nb=document.getElementById('new-note-btn');if(nb)nb.addEventListener('click',newNote);
  var eh=document.getElementById('export-html-btn');if(eh)eh.addEventListener('click',exportHTML);
  var em=document.getElementById('export-md-btn');if(em)em.addEventListener('click',exportMD);
  var ib=document.getElementById('import-btn');if(ib)ib.addEventListener('click',function(){var inf=document.getElementById('import-file');if(inf)inf.click();});
  var inf2=document.getElementById('import-file');if(inf2)inf2.addEventListener('change',function(){importFile(this);});
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
function blockToHTML(b){
  var t=b.type,h=b.html||'';
  if(t==='h1'||t==='h2'||t==='h3')return '<'+t+'>'+h+'</'+t+'>';
  if(t==='bullet')return '<ul><li>'+h+'</li></ul>';
  if(t==='numbered')return '<ol><li>'+h+'</li></ol>';
  if(t==='todo')return '<p>'+(b.checked?'&#9745;':'&#9744;')+' '+h+'</p>';
  if(t==='quote')return '<blockquote>'+h+'</blockquote>';
  if(t==='callout')return '<div style="border-left:3px solid #6c7bff;background:#f4f5ff;padding:12px 16px;border-radius:8px;margin:12px 0">'+h+'</div>';
  if(t==='divider')return '<hr>';
  if(t==='code')return '<pre><code>'+esc(b.src||stripTags(h))+'</code></pre>';
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
    var out='<div style="border:1px solid #ddd;border-radius:12px;margin:16px 0;overflow:hidden;background:#fff">';
    if(x.cover)out+='<img src="'+esc(x.cover)+'" style="width:100%;max-height:280px;object-fit:cover;display:block">';
    out+='<div style="padding:16px 18px"><div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.08em;font-weight:700">'+esc(platLabel(x.platform))+' &bull; '+esc(x.difficulty||'')+' &bull; '+esc(x.os||'')+'</div>';
    out+='<h2 style="margin:6px 0 0">'+esc(x.name||'Untitled box')+'</h2></div></div>';
    return out;
  }
  return '<p>'+h+'</p>';
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
  return h;
}
function exportHTML(){
  var n=cur();if(!n)return;readDOM(n);
  var body=n.blocks.map(blockToHTML).join('\n');
  var css='body{font-family:Segoe UI,Arial,sans-serif;max-width:820px;margin:40px auto;padding:0 20px;line-height:1.7;color:#1a1a1a}img{max-width:100%;border-radius:8px}figure{margin:16px 0}figcaption{font-size:13px;color:#777;text-align:center}blockquote{border-left:3px solid #6c7bff;padding-left:16px;color:#555;font-style:italic;margin:12px 0}pre{background:#0f1115;color:#c8f05a;padding:16px;border-radius:10px;overflow-x:auto}code{font-family:Consolas,monospace}hr{border:0;border-top:1px solid #ddd;margin:24px 0}h1,h2,h3{line-height:1.3}';
  var full='<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(n.title)+'</title><style>'+css+'</style></head><body>'+body+'</body></html>';
  dl(full,slug(n.title)+'.html','text/html');
  toast('HTML exported ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â post it on your site');
}
function exportMD(){
  var n=cur();if(!n)return;readDOM(n);
  var md='# '+n.title+'\n\n'+n.blocks.map(blockToMD).join('\n\n')+'\n';
  dl(md,slug(n.title)+'.md','text/markdown');
  toast('Markdown exported');
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
function init(){
  load();
  boot();
}
function boot(){
  if(!notes.length)notes=[defaultNote()];
  curId=notes[0].id;
  render();
  buildColors();
  wireEditor();
  wireToolbar();
  wireSidebar();
  wireTopbar();
  wireModal();
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
(function(){var tb=document.querySelector('.topbar-left');if(!tb)return;var b=document.createElement('button');b.className='btn mobile-only';b.title='Menu';b.innerHTML='<i class="fa-solid fa-bars"></i>';b.addEventListener('click',function(){sidebar.classList.toggle('open');});tb.insertBefore(b,tb.firstChild);var st=document.createElement('style');st.textContent='@media(max-width:820px){.mobile-only{display:inline-flex!important}}@media(min-width:821px){.mobile-only{display:none!important}}';document.head.appendChild(st);})();
window.addEventListener('beforeunload',function(e){var n=cur();if(n){readDOM(n);n.title=noteTitle.value||'Untitled';persist();}if(saveStatus&&saveStatus.textContent!=='Saved'){e.preventDefault();e.returnValue='';}});
  setInterval(function(){var n=cur();if(n&&saveStatus.textContent==='Unsaved')saveNow();},4000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();




