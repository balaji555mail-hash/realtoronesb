import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
mkdirSync(root+'.local',{recursive:true});
const db=new DatabaseSync(process.env.DB_PATH || root+'.local/haven.db');
db.exec('CREATE TABLE IF NOT EXISTS inquiries (id INTEGER PRIMARY KEY, property_id TEXT NOT NULL, property_name TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)');
export const properties=[
{id:'oakwood',name:'The Oakwood Residence',address:'124 Oakwood Drive, Austin, TX',price:845000,beds:4,baths:3,area:2850,type:'House',tag:'Just listed',image:'photo-1600596542815-ffad4c1539a9',description:'Light-filled living spaces, thoughtful finishes, and a private backyard made for slow weekends. A beautifully considered home in a welcoming neighborhood.'},
{id:'skyline',name:'Skyline Penthouse',address:'88 Congress Avenue, Austin, TX',price:1250000,beds:3,baths:3,area:2400,type:'Condo',tag:'Featured',image:'photo-1600607687939-ce8a6c25118c',description:'An elevated city retreat with generous entertaining spaces, refined interiors, and sweeping views. Enjoy downtown living with room to unwind.'},
{id:'willow',name:'Willow Creek Retreat',address:'602 Willow Creek Lane, Austin, TX',price:625000,beds:3,baths:2,area:1950,type:'House',tag:'Open house',image:'photo-1600047509807-ba8f99d2cdde',description:'A peaceful retreat with warm natural materials, an inviting open layout, and space to gather. Close to local parks, shops, and everyday essentials.'},
{id:'cedar',name:'Cedar Park Townhome',address:'210 Cedar Park Way, Austin, TX',price:485000,beds:3,baths:2,area:1720,type:'Townhome',tag:'Just listed',image:'photo-1600566753086-00f18fb6b3ea',description:'Easy, contemporary living with a spacious kitchen, comfortable bedrooms, and a low-maintenance outdoor space.'},
{id:'lakeview',name:'Lakeview Modern',address:'45 Lakeview Terrace, Austin, TX',price:975000,beds:4,baths:3,area:3100,type:'House',tag:'Featured',image:'photo-1600607687920-4e2a09cf159d',description:'A striking modern home with expansive windows, versatile living areas, and a tranquil setting.'},
{id:'eastside',name:'The Eastside Loft',address:'315 East 6th Street, Austin, TX',price:395000,beds:2,baths:2,area:1280,type:'Condo',tag:'Just listed',image:'photo-1600210492486-724fe5c67fb0',description:'A bright urban home with character, open living spaces, and the best of the neighborhood on your doorstep.'}
];
const sessions=new Map();
const password=process.env.ADMIN_PASSWORD || 'change-me-local';
if(process.env.NODE_ENV==='production' && !process.env.ADMIN_PASSWORD) throw Error('Set ADMIN_PASSWORD in production');
function equal(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function authenticated(req){const token=req.headers.cookie?.match(/(?:^|; )haven_session=([^;]+)/)?.[1];return token&&sessions.get(token)>Date.now();}
async function body(req){let value='';for await(const chunk of req){value+=chunk;if(value.length>16384)throw Error('Request too large');}return JSON.parse(value);}
export const server=http.createServer(async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 try{
 const path=new URL(req.url,'http://localhost').pathname;
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 if(req.method==='GET'&&path==='/api/properties')return send(200,properties);
 if(req.method==='POST'&&path==='/api/inquiries'){
 const data=await body(req);const p=properties.find(p=>p.id===data.propertyId);
 if(!p||typeof data.name!=='string'||data.name.trim().length<2||data.name.length>120||typeof data.email!=='string'||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)||data.email.length>254||typeof data.phone!=='string'||! /^[+()\d\s.-]{7,30}$/.test(data.phone)||data.phone.replace(/\D/g,'').length<7||typeof(data.message??'')!=='string'||(data.message??'').length>2000)return send(400,{error:'Please enter a valid name, email, and phone number.'});
 db.prepare('INSERT INTO inquiries(property_id,property_name,name,email,phone,message) VALUES (?,?,?,?,?,?)').run(p.id,p.name,data.name.trim(),data.email.trim(),data.phone.trim(),(data.message||'').trim());return send(201,{success:true});
 }
 if(req.method==='POST'&&path==='/api/admin/login'){
 const data=await body(req);const key=req.socket.remoteAddress;const record=attempts.get(key)||{count:0,until:Date.now()+60000};if(record.until<Date.now()){record.count=0;record.until=Date.now()+60000;}record.count++;attempts.set(key,record);
 if(record.count>10)return send(429,{error:'Too many attempts. Please try again in a minute.'});
 if(typeof data.password!=='string'||!equal(data.password,password))return send(401,{error:'Incorrect password.'});
 const token=randomBytes(32).toString('hex');sessions.set(token,Date.now()+8*3600000);res.setHeader('Set-Cookie',`haven_session=${token}; HttpOnly; SameSite=Strict; Path=/${process.env.NODE_ENV==='production'?'; Secure':''}`);return send(200,{success:true});
 }
 if(req.method==='POST'&&path==='/api/admin/logout'){const token=req.headers.cookie?.match(/haven_session=([^;]+)/)?.[1];sessions.delete(token);res.setHeader('Set-Cookie','haven_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(200,{success:true});}
 if(req.method==='GET'&&path==='/api/admin/inquiries'){if(!authenticated(req))return send(401,{error:'Please sign in.'});return send(200,db.prepare('SELECT * FROM inquiries ORDER BY id DESC').all());}
 if(req.method==='GET'&&['/','/admin','/app.js','/style.css'].includes(path)) {const file=path==='/admin'||path==='/'?'index.html':path.slice(1);res.writeHead(200,{'Content-Type':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html'});return res.end(readFileSync(root+'public/'+file));}
 send(404,{error:'Not found'});
 }catch{send(400,{error:'Unable to process the request. Please try again.'});}
});
const attempts=new Map();
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Haven is running on port '+(process.env.PORT||3000)));
