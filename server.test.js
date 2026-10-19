import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('property interest persists and admin access requires authentication',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'haven-test-'));process.env.DB_PATH=join(dir,'test.db');process.env.ADMIN_PASSWORD='test-password';
 const {server}=await import('./server.js');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const api=(path,options)=>fetch(base+path,options);const post=data=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 try{
 let r=await api('/api/properties');const list=await r.json();assert.equal(list.length,6);
 assert.equal((await api('/api/admin/inquiries')).status,401);
 assert.equal((await api('/api/inquiries',post({propertyId:'fake'}))).status,400);
 assert.equal((await api('/api/inquiries',post({propertyId:list[0].id,name:'Alex Buyer',email:'alex@example.com',phone:'512-555-0123',message:'Please arrange a viewing'}))).status,201);
 assert.equal((await api('/api/admin/login',post({password:'wrong'}))).status,401);
 r=await api('/api/admin/login',post({password:'test-password'}));assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];assert.match(r.headers.get('set-cookie'),/HttpOnly/);
 r=await api('/api/admin/inquiries',{headers:{cookie}});const entries=await r.json();assert.equal(entries.length,1);assert.equal(entries[0].property_name,list[0].name);assert.equal(entries[0].email,'alex@example.com');assert.equal(entries[0].phone,'512-555-0123');
 assert.equal((await api('/admin')).status,200);assert.equal((await api('/style.css')).status,200);
 await api('/api/admin/logout',{method:'POST',headers:{cookie}});assert.equal((await api('/api/admin/inquiries',{headers:{cookie}})).status,401);
 }finally{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});}
});
