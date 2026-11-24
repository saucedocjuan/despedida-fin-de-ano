import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync(new URL("../admin.html", import.meta.url), "utf8");

const mock = `<script>
/* Cliente Supabase simulado, solo para probar el panel. */
(function(){
  var KEY="invitacion.mockdb";
  var db=[]; try{ db=JSON.parse(sessionStorage.getItem(KEY)||"[]"); }catch(e){}
  function save(){ try{ sessionStorage.setItem(KEY,JSON.stringify(db)); }catch(e){} }
  window.mockDB=db;
  var firmado=false;

  function ejecutar(s){
    if(s.op==="select"){
      var out=db.filter(function(r){ return Object.keys(s.filters).every(function(k){ return String(r[k])===String(s.filters[k]); }); });
      return Promise.resolve({data:out.map(function(r){return Object.assign({},r);}),error:null});
    }
    if(s.op==="insert"){
      var row=Object.assign({id:"id-"+(db.length+1),token:"tok-"+(db.length+1),creado_en:new Date().toISOString(),
        actualizado_en:new Date().toISOString(),confirmado_en:null},s.payload);
      if(row.estado==="asistire") row.confirmado_en=row.creado_en;
      db.push(row); save(); return Promise.resolve({data:[row],error:null});
    }
    if(s.op==="update"){
      var r=db.filter(function(x){return x.id===s.filters.id;})[0];
      if(!r) return Promise.resolve({data:[],error:null});
      Object.assign(r,s.payload); r.actualizado_en=new Date().toISOString();
      if(r.estado==="asistire"&&!r.confirmado_en) r.confirmado_en=r.actualizado_en;
      if(r.estado!=="asistire") r.confirmado_en=null;
      save(); return Promise.resolve({data:[Object.assign({},r)],error:null});
    }
    if(s.op==="delete"){
      var i=db.findIndex(function(x){return x.id===s.filters.id;});
      if(i>=0) db.splice(i,1); save(); return Promise.resolve({data:[],error:null});
    }
    return Promise.resolve({data:null,error:{message:"Operación no soportada"}});
  }

  function query(op,payload){
    var s={op:op,payload:payload||null,filters:{}};
    var api={
      select:function(){return api;},
      order:function(){return ejecutar(s);},
      eq:function(k,v){s.filters[k]=v;return api;},
      insert:function(p){s.op="insert";s.payload=p;return api;},
      update:function(p){s.op="update";s.payload=p;return api;},
      delete:function(){s.op="delete";return api;},
      then:function(res,rej){return ejecutar(s).then(res,rej);}
    };
    return api;
  }

  var client={
    from:function(){return query("select");},
    rpc:async function(name){ if(name==="es_admin") return {data:firmado,error:null}; return {data:null,error:null}; },
    auth:{
      getSession:async function(){return {data:{session:firmado?{user:{email:"organizador@tudominio.com"}}:null}};},
      signInWithPassword:async function(p){
        if(p.email==="organizador@tudominio.com"&&p.password==="clave123"){ firmado=true; return {data:{user:{email:p.email}},error:null}; }
        return {data:null,error:{message:"Credenciales inválidas"}};
      },
      signOut:async function(){firmado=false;return {error:null};}
    }
  };
  window.APP_CONFIG.SUPABASE_URL="https://proyecto-de-pruebas.supabase.co";
  window.APP_CONFIG.SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiJ9."+"x".repeat(80)+".mock";
  window.supabase={createClient:function(){return client;}};
})();
<\/script>`;

const out = html.replace(
  /<script defer src="https:\/\/cdn\.jsdelivr\.net[^>]*><\/script>/,
  mock + "\n<script defer src=\"assets/supabase.js\"></script>"
);
if (out === html) throw new Error("No se pudo inyectar el mock");
writeFileSync(new URL("mock-admin.html", import.meta.url), out.replace(/href="assets\//g, 'href="../assets/').replace(/src="assets\//g, 'src="../assets/'));
console.log("OK: tests/mock-admin.html generado");
