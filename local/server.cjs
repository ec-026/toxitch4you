'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../public'),port=Number(process.env.PORT||8765);
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.swf':'application/x-shockwave-flash','.json':'application/json','.png':'image/png'};
const peers=new Map(), rooms=new Map();
const KEY_SET=new Set(['left','right','up','down','attack','jump','skill']);
function send(c,msg){if(!c||c.closed)return;const b=Buffer.from(JSON.stringify(msg));let header;if(b.length<126){header=Buffer.from([129,b.length])}else if(b.length<65536){header=Buffer.alloc(4);header[0]=129;header[1]=126;header.writeUInt16BE(b.length,2)}else{return}try{c.socket.write(Buffer.concat([header,b]))}catch{}}
function code(){let id;do{id=crypto.randomBytes(4).toString('hex').toUpperCase()}while(rooms.has(id));return id}
function other(c){const r=rooms.get(c.room);if(!r)return null;return c.role==='host'?r.guest:r.host}
function away(r){return {host:!!r.hostAway,guest:!!r.guestAway}}
function status(r){if(!r)return;send(r.host,{type:'status',role:'host',friend:!!r.guest,room:r.id,paused:!!r.paused,away:away(r)});send(r.guest,{type:'status',role:'guest',friend:!!r.host,room:r.id,paused:!!r.paused,away:away(r)})}
function pauseBroadcast(r){const message={type:'pause-state',paused:!!r.paused,by:r.pauseBy||null,away:away(r)};send(r.host,message);send(r.guest,message)}
function leave(c){const r=rooms.get(c.room);if(!r)return;const o=other(c);if(r.host===c){r.host=null;r.hostCharacter=null;r.started=false;r.hostReady=false;r.guestReady=false;r.paused=false;r.pauseBy=null;r.hostAway=false;r.guestAway=false;send(o,{type:'peer-left'});send(o,{type:'character-reset'});}if(r.guest===c){r.guest=null;r.guestReady=false;r.started=false;r.paused=false;r.pauseBy=null;r.hostAway=false;r.guestAway=false;send(o,{type:'peer-left'})}c.room=null;c.role=null; if(!r.host&&!r.guest){rooms.delete(r.id)}else status(r)}
function disconnect(c){if(c.closed)return;c.closed=true;leave(c);peers.delete(c.socket)}
function join(c,id,create){if(c.role){send(c,{type:'error',reason:'Already in a room'});return}let r;
 if(create){id=(typeof id==='string'&&/^[A-F0-9]{8}$/.test(id))?id:code();if(rooms.has(id)){send(c,{type:'error',reason:'Room already exists'});return}r={id,host:c,guest:null,hostCharacter:null,started:false,hostReady:false,guestReady:false,paused:false,pauseBy:null,hostAway:false,guestAway:false};rooms.set(id,r);c.role='host';}
 else{if(typeof id!=='string'||!/^[A-F0-9]{8}$/.test(id)){send(c,{type:'error',reason:'Enter an 8-character room code'});return}r=rooms.get(id);if(!r){send(c,{type:'error',reason:'Room not found'});return}if(!r.host||r.guest){send(c,{type:'error',reason:'Room full or host disconnected'});return}r.guest=c;c.role='guest';}
 c.room=id;send(c,{type:'welcome',role:c.role,room:id});if(c.role==='guest'&&r.hostCharacter!==null)send(c,{type:'character',hostCharacter:r.hostCharacter});status(r);
}
function tryStart(r){
 if(r.started||!r.host||!r.guest||r.hostCharacter===null||!r.hostReady||!r.guestReady)return;
 r.started=true;
 send(r.host,{type:'start',hostCharacter:r.hostCharacter});
 send(r.guest,{type:'start',hostCharacter:r.hostCharacter});
 r.paused=!!(r.hostAway||r.guestAway);r.pauseBy=r.paused?'away':null;pauseBroadcast(r);
}
function handle(c,msg){if(!msg||typeof msg!=='object')return;
 if(msg.type==='create'){join(c,msg.room,true);return}
 if(msg.type==='join'){join(c,typeof msg.room==='string'?msg.room.trim().toUpperCase():'',false);return}
 if(msg.type==='leave'){leave(c);send(c,{type:'left'});return}
 if(!c.room||!c.role)return;
 const r=rooms.get(c.room);if(!r)return;
 if(msg.type==='character'&&c.role==='host'&&(msg.character===1||msg.character===2)){r.hostCharacter=msg.character;r.started=false;send(r.guest,{type:'character',hostCharacter:r.hostCharacter});tryStart(r);return}
 if(msg.type==='ready'){if(c.role==='host')r.hostReady=true;else r.guestReady=true;tryStart(r);return}
 if(msg.type==='presence'&&typeof msg.away==='boolean'){
   if(c.role==='host')r.hostAway=msg.away;else r.guestAway=msg.away;
   if(msg.away&&r.started){r.paused=true;r.pauseBy='away'}
   pauseBroadcast(r);return;
 }
 if(msg.type==='pause'&&r.started&&r.host&&r.guest&&typeof msg.paused==='boolean'){
   if(!msg.paused&&(r.hostAway||r.guestAway)){pauseBroadcast(r);return;}
r.paused=msg.paused;r.pauseBy=c.role;pauseBroadcast(r);return}
 if(msg.type==='key'&&r.started&&!r.paused&&KEY_SET.has(msg.key)&&typeof msg.down==='boolean'){send(other(c),{type:'key',key:msg.key,down:msg.down});return}
 if(msg.type==='world-state'&&c.role==='host'&&r.started&&!r.paused&&r.guest&&typeof msg.snapshot==='string'&&msg.snapshot.length<16000){send(r.guest,{type:'world-state',snapshot:msg.snapshot});return}
 if(msg.type==='ping')send(c,{type:'pong'});
}
function receive(c,chunk){c.buffer=Buffer.concat([c.buffer,chunk]);if(c.buffer.length>262144){c.socket.destroy();return}while(c.buffer.length>=2){const b=c.buffer;const opcode=b[0]&15,masked=!!(b[1]&128);let len=b[1]&127,offset=2;if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);offset=4}else if(len===127){c.socket.destroy();return}if(!masked){c.socket.destroy();return}if(len>200000){c.socket.destroy();return}if(b.length<offset+4+len)return;const key=b.subarray(offset,offset+4);const payload=Buffer.from(b.subarray(offset+4,offset+4+len));for(let i=0;i<payload.length;i++)payload[i]^=key[i%4];c.buffer=b.subarray(offset+4+len);if(opcode===8){c.socket.end();return}if(opcode===9){c.socket.write(Buffer.from([0x8a,0]));continue}if(opcode!==1)continue;try{handle(c,JSON.parse(payload.toString('utf8')))}catch{}}}
const server=http.createServer((req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}const file=path.resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}const destination=file===root?path.join(root,'index.html'):file;fs.stat(destination,(err,st)=>{if(err||!st.isFile()){res.writeHead(404).end('Not found');return}res.setHeader('Content-Type',MIME[path.extname(destination)]||'application/octet-stream');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');fs.createReadStream(destination).pipe(res)})});
server.on('upgrade',(req,socket)=>{if(new URL(req.url,'http://localhost').pathname!=='/ws'||!req.headers['sec-websocket-key']){socket.destroy();return}const key=req.headers['sec-websocket-key'];const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');const c={socket,buffer:Buffer.alloc(0),role:null,closed:false};peers.set(socket,c);const params=new URL(req.url,'http://localhost').searchParams;handle(c,{type:params.get('mode'),room:params.get('room')});socket.on('data',chunk=>receive(c,chunk));socket.on('error',()=>disconnect(c));socket.on('close',()=>disconnect(c))});
server.listen(port,'0.0.0.0');
