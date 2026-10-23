const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const appjs=fs.readFileSync('app.js','utf8');
const storejs=fs.readFileSync('storage.js','utf8');

const errors=[];
const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'http://localhost/'});
const {window}=dom;
window.HTMLCanvasElement.prototype.getContext=function(){return {drawImage(){}};};
window.URL.createObjectURL=function(){return 'blob:x';};
window.URL.revokeObjectURL=function(){};
window.Element.prototype.scrollIntoView=function(){};
window.document.execCommand=function(){return true;};
// jsdom can't navigate; suppress the "Not implemented: navigation" noise
// that blob-URL downloads trigger. Real browsers handle this fine.
window.HTMLAnchorElement.prototype.click=function(){};
window.confirm=function(){return true;};
window.prompt=function(){return 'https://x';};
window.addEventListener('error',function(e){errors.push('WINDOW ERROR: '+e.message+' @'+e.lineno);});

try{ window.eval(storejs); }catch(e){ errors.push('EVAL storage: '+e.message); }
try{ window.eval(appjs); }
catch(e){ errors.push('EVAL: '+e.message); }

// App defers init to DOMContentLoaded when readyState==='loading' (correct browser
// behavior). jsdom fires DOMContentLoaded itself under outside-only, so we just
// wait for it · with a one-shot guard in case it double-fires.
var didInit=false;
function afterReady(fn){
  var run=function(){ if(didInit)return; didInit=true; setTimeout(fn,0); };
  if(window.document.readyState!=='loading'){ run(); return; }
  window.document.addEventListener('DOMContentLoaded',run);
}

const d=window.document;
function assert(name,cond){ if(!cond) errors.push('FAIL: '+name); else console.log('ok - '+name); }

afterReady(function(){
  assert('editor has blocks', d.querySelectorAll('#editor .block').length>0);
  assert('sidebar lists notes', d.querySelectorAll('#notes-list .note-item').length>=1);

  // New note via modal
  try{
    d.getElementById('new-note-btn').click();
    assert('modal opens', d.getElementById('new-modal').style.display==='flex');
    d.getElementById('m-name').value='Editorial';
    d.getElementById('m-create').click();
    assert('modal closed after create', d.getElementById('new-modal').style.display!=='flex');
    const notes=JSON.parse(window.localStorage.getItem('writeup_notes_v4')||'[]');
    assert('note created + persisted', notes.some(n=>n.title==='Editorial'));
    const created=notes.find(n=>n.title==='Editorial');
    assert('created note has box block', created&&created.blocks[0].type==='box');
    assert('box name saved', created&&created.blocks[0].box.name==='Editorial');
  }catch(e){ errors.push('NEWNOTE: '+e.message); }

  // Slash menu opens on "/"
  try{
    const ed=d.getElementById('editor');
    const blk=ed.querySelector('.block[data-type=text] .block-content');
    assert('editable text block present', !!blk);
    blk.focus();
    blk.textContent='/';
    blk.dispatchEvent(new window.Event('input',{bubbles:true}));
    assert('slash menu opens on /', d.getElementById('slash-menu').style.display!=='none');
  }catch(e){ errors.push('SLASH: '+e.message); }

  // Export MD must not throw
  try{ d.getElementById('export-md-btn').click(); assert('export MD click does not throw', true); }
  catch(e){ errors.push('EXPORT: '+e.message); }

  finish();
});

function finish(){
  // give the interval/DOMContentLoaded microtasks a tick
  setTimeout(function(){
    if(errors.length){ console.log('\n=== ERRORS ==='); errors.forEach(e=>console.log(e)); process.exit(1); }
    else { console.log('\nALL FUNCTIONAL TESTS PASSED'); process.exit(0); }
  },50);
}

