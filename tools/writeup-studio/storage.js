/* storage.js — IndexedDB-backed notes store with localStorage fallback.
   Exposes: Storage.init() -> Promise, Storage.ready -> Promise,
            Storage.load() -> notes[], Storage.persist(notes),
            Storage.flushNow(), Storage.clear() */
(function(){
'use strict';
var DB_NAME='writeup_db', DB_VER=1, STORE='notes', META='meta', LS_KEY='writeup_notes_v4';
var MEDIA_DB_NAME='writeup_media_v1', MEDIA_STORE_NAME='media';

function hasIDB(){ try{ return typeof indexedDB!=='undefined' && indexedDB!==null; }catch(e){ return false; } }
function openDB(){ return new Promise(function(res,rej){
  var r=indexedDB.open(DB_NAME,DB_VER);
  r.onupgradeneeded=function(e){ var db=e.target.result;
    if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'});
    if(!db.objectStoreNames.contains(META)) db.createObjectStore(META);
  };
  r.onsuccess=function(){res(r.result);}; r.onerror=function(){rej(r.error);};
});}
function idbGetAll(db){ return new Promise(function(res,rej){
  var tx=db.transaction(STORE,'readonly'), s=tx.objectStore(STORE), q=s.getAll();
  q.onsuccess=function(){res(q.result||[]);}; q.onerror=function(){rej(q.error);};
});}
function idbPutAll(db,notes){ return new Promise(function(res,rej){
  var tx=db.transaction([STORE,META],'readwrite');
  var s=tx.objectStore(STORE), m=tx.objectStore(META);
  s.clear();
  for(var i=0;i<notes.length;i++) s.put(notes[i]);
  m.put(true,'hydrated'); m.put(Date.now(),'updatedAt');
  tx.oncomplete=function(){res();}; tx.onerror=function(){rej(tx.error);}; tx.onabort=function(){rej(tx.error);};
});}
function readLS(){ try{var d=localStorage.getItem(LS_KEY);return d?JSON.parse(d)||[]:[];}catch(e){return [];} }
function writeLS(n){ try{localStorage.setItem(LS_KEY,JSON.stringify(n));return true;}catch(e){return false;} }
function clearLS(){ try{localStorage.removeItem(LS_KEY);}catch(e){} }

var Storage={
  ready:null, _db:null, _mode:'ls', _notes:[], _timer:null,

  init:function(){
    var self=this;
    this.ready=new Promise(function(resolve){
      if(!hasIDB()){ self._mode='ls'; self._notes=readLS(); resolve(); return; }
      openDB().then(function(db){
        self._db=db; self._mode='idb';
        return idbGetAll(db).then(function(rows){
          if(rows.length){ self._notes=rows; resolve(); return; }
          var legacy=readLS();
          if(legacy.length){
            self._notes=legacy;
            idbPutAll(db,legacy).then(function(){clearLS();resolve();},function(){resolve();});
          } else { self._notes=[]; resolve(); }
        });
      }).catch(function(){ self._mode='ls'; self._notes=readLS(); resolve(); });
    });
    return this.ready;
  },

  load:function(){ return this._notes.slice(); },

  persist:function(notes){
    this._notes = notes && notes.slice ? notes.slice() : (notes||[]);
    if(this._mode==='ls'){ writeLS(this._notes); return; }  /* sync for tests */
    var self=this;
    clearTimeout(this._timer);
    this._timer=setTimeout(function(){ self._flush(); },200);
  },

  _flush:function(){
    var self=this;
    if(this._mode==='idb'&&this._db){
      idbPutAll(this._db,this._notes).catch(function(){
        self._mode='ls'; writeLS(self._notes);
      });
    } else { writeLS(this._notes); }
  },

  flushNow:function(){ clearTimeout(this._timer); this._flush(); },

  clear:function(){
    this._notes=[];
    if(this._mode==='idb'&&this._db){
      var db=this._db;
      return new Promise(function(res){
        var tx=db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete=res; tx.onerror=res; tx.onabort=res;
      });
    }
    return Promise.resolve();
  }
};

function openMediaDB(){
  return new Promise(function(res,rej){
    if(!hasIDB()){ rej(new Error('No IndexedDB')); return; }
    var r=indexedDB.open(MEDIA_DB_NAME,1);
    r.onupgradeneeded=function(e){ var db=e.target.result; if(!db.objectStoreNames.contains(MEDIA_STORE_NAME)) db.createObjectStore(MEDIA_STORE_NAME,{keyPath:'id'}); };
    r.onsuccess=function(){res(r.result);}; r.onerror=function(){rej(r.error);};
  });
}
function mediaId(){ return 'm-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8); }
Storage.putMedia=function(f){return new Promise(function(res,rej){if(!hasIDB()){rej(new Error('No IndexedDB'));return;}openMediaDB().then(function(db){var e={id:mediaId(),name:f.name||'',type:f.type||'application/octet-stream',size:f.size||0,blob:f};var tx=db.transaction(MEDIA_STORE_NAME,'readwrite'),s=tx.objectStore(MEDIA_STORE_NAME);s.put(e);tx.oncomplete=function(){res(e.id)};tx.onerror=function(){rej(tx.error)};tx.onabort=function(){rej(tx.error)};}).catch(function(e){rej(e)});});};
Storage.getMedia=function(id){return new Promise(function(res,rej){if(!hasIDB()){rej(new Error('No IndexedDB'));return;}openMediaDB().then(function(db){var tx=db.transaction(MEDIA_STORE_NAME,'readonly'),s=tx.objectStore(MEDIA_STORE_NAME);var q=s.get(id);q.onsuccess=function(){res(q.result?q.result.blob:null)};q.onerror=function(){rej(q.error)};}).catch(function(e){rej(e)});});};
Storage.delMedia=function(id){return new Promise(function(res,rej){if(!hasIDB()){rej(new Error('No IndexedDB'));return;}openMediaDB().then(function(db){var tx=db.transaction(MEDIA_STORE_NAME,'readwrite');var q=tx.objectStore(MEDIA_STORE_NAME).delete(id);q.onsuccess=function(){res()};q.onerror=function(){rej(q.error)};}).catch(function(e){rej(e)});});};
Storage.clearMedia=function(){return new Promise(function(res,rej){if(!hasIDB()){res();return;}openMediaDB().then(function(db){var tx=db.transaction(MEDIA_STORE_NAME,'readwrite'),s=tx.objectStore(MEDIA_STORE_NAME);s.clear();tx.oncomplete=res;tx.onerror=function(){rej(tx.error)};tx.onabort=function(){rej(tx.error)};}).catch(function(e){rej(e)});});};
Storage.__urlCache=Object.create(null);
window.Storage=Storage;
})();
