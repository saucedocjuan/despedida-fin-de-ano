import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

const mock = `<script>
/* Cliente Supabase simulado, solo para pruebas de UI. */
(function(){
  var KEY="invitacion.mockdb";
  var db=[];
  try{ db=JSON.parse(sessionStorage.getItem(KEY)||"[]"); }catch(e){ db=[]; }
  function save(){ try{ sessionStorage.setItem(KEY,JSON.stringify(db)); }catch(e){} }
  function norm(s){ return String(s||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").trim().toLowerCase(); }
  function clave(d){ return [d.nombre,d.apellido,String(d.telefono||"").replace(/\\D/g,"")].map(norm).join("|"); }
  function vista(r){ return {nombre:r.nombre,apellido:r.apellido,acompanantes:r.acompanantes,confirmado_en:r.confirmado_en}; }
  var client={
    rpc: async function(name,p){
      if(name==="confirmar_asistencia"){
        var row={ id:"id-"+db.length, token:"tok-"+(db.length+1), nombre:p.p_nombre.trim(), apellido:p.p_apellido.trim(),
          telefono:p.p_telefono, acompanantes:p.p_estado==="asistire"?Number(p.p_acompanantes):0,
          estado:p.p_estado, confirmado_en:new Date().toISOString() };
        if(db.some(function(r){return clave(r)===clave(row);})) return {data:null,error:{code:"23505",message:"DUPLICADO"}};
        db.push(row); save(); return {data:[row],error:null};
      }
      if(name==="obtener_mi_confirmacion"){
        var found=db.filter(function(r){return r.token===p.p_token;});
        return {data:found,error:found.length?null:{code:"P0002",message:"NO_ENCONTRADO"}};
      }
      if(name==="actualizar_mi_confirmacion"){
        var r=db.filter(function(x){return x.token===p.p_token;})[0];
        if(!r) return {data:null,error:{code:"P0002",message:"NO_ENCONTRADO"}};
        if(p.p_cancelar){ r.estado="cancelado"; r.acompanantes=0; }
        else{
          var tmp={nombre:p.p_nombre,apellido:p.p_apellido,telefono:p.p_telefono};
          if(db.some(function(x){return x.token!==r.token && clave(x)===clave(tmp);})) return {data:null,error:{code:"23505",message:"DUPLICADO"}};
          r.nombre=p.p_nombre.trim(); r.apellido=p.p_apellido.trim(); r.telefono=p.p_telefono;
          r.acompanantes=p.p_estado==="asistire"?Number(p.p_acompanantes):0; r.estado=p.p_estado;
        }
        save(); return {data:[r],error:null};
      }
      if(name==="listado_confirmados") return {data:db.filter(function(r){return r.estado==="asistire";}).map(vista),error:null};
      if(name==="totales_publicos"){
        var a=db.filter(function(r){return r.estado==="asistire";});
        var c=a.reduce(function(s,r){return s+Number(r.acompanantes||0);},0);
        return {data:[{personas:a.length,acompanantes:c,total:a.length+c}],error:null};
      }
      return {data:null,error:{message:"RPC desconocida"}};
    },
    auth:{getSession:async function(){return {data:{session:null}};}}
  };
  window.APP_CONFIG.SUPABASE_URL="https://proyecto-de-pruebas.supabase.co";
  window.APP_CONFIG.SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiJ9."+"x".repeat(80)+".mock";
  window.APP_CONFIG.EVENTO.FOTO_FONDO="../assets/foto.jpg";
  window.supabase={createClient:function(){return client;}};
  window.mockDB=db;
})();
<\/script>`;

const out = html.replace(
  /<script defer src="https:\/\/cdn\.jsdelivr\.net[^>]*><\/script>/,
  mock + "\n<script defer src=\"assets/supabase.js\"></script>"
);
if (out === html) throw new Error("No se pudo inyectar el mock");
writeFileSync(new URL("mock.html", import.meta.url), out.replace(/href="assets\//g, 'href="../assets/').replace(/src="assets\//g, 'src="../assets/'));
console.log("OK: tests/mock.html generado");
