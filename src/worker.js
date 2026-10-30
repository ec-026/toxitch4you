// One Durable Object per private room. No player data or game state is logged.
const KEYS = new Set(['left','right','up','down','attack','jump','skill']);
const VALID_ROOM = /^[A-F0-9]{8}$/;
const encode = value => JSON.stringify(value);

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.state = {hostCharacter:null, started:false, hostReady:false, guestReady:false, paused:false, pauseBy:null,hostAway:false,guestAway:false};
    this.ctx.blockConcurrencyWhile(async () => {
      this.state = (await this.ctx.storage.get('room')) || this.state;
    });
  }
  sockets() {
    const sockets = this.ctx.getWebSockets();
    const host = sockets.find(ws => ws.deserializeAttachment()?.role === 'host') || null;
    const guest = sockets.find(ws => ws.deserializeAttachment()?.role === 'guest') || null;
    return {host, guest};
  }
  send(ws, payload) { if (ws) { try { ws.send(encode(payload)); } catch (_) {} } }
  away() {return {host:!!this.state.hostAway,guest:!!this.state.guestAway};}
  publishPause() {this.broadcast({type:'pause-state',paused:!!this.state.paused,by:this.state.pauseBy,away:this.away()});}
  async save() { await this.ctx.storage.put('room', this.state); }
  status(room) {
    const {host,guest}=this.sockets();
    this.send(host,{type:'status',role:'host',friend:!!guest,room,paused:this.state.paused,away:this.away()});
    this.send(guest,{type:'status',role:'guest',friend:!!host,room,paused:this.state.paused,away:this.away()});
  }
  broadcast(payload) {const {host,guest}=this.sockets();this.send(host,payload);this.send(guest,payload);}
  async fetch(request) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required',{status:426});
    const u = new URL(request.url), room=u.searchParams.get('room')||'', mode=u.searchParams.get('mode')||'';
    if (!VALID_ROOM.test(room) || !['create','join'].includes(mode)) return new Response('Invalid room',{status:400});
    const {host,guest}=this.sockets();
    if(mode==='create' && host) return new Response('Room already exists',{status:409});
    if(mode==='join' && (!host || guest)) return new Response('Room unavailable or full',{status:409});
    const pair=new WebSocketPair(), client=pair[0], server=pair[1];
    const role=mode==='create'?'host':'guest';
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({role,room});
    this.send(server,{type:'welcome',role,room});
    if(role==='guest' && this.state.hostCharacter!==null) this.send(server,{type:'character',hostCharacter:this.state.hostCharacter});
    if(role==='host') {
      this.state={hostCharacter:null,started:false,hostReady:false,guestReady:false,paused:false,pauseBy:null};
      await this.save();
    }
    this.status(room);
    return new Response(null,{status:101,webSocket:client});
  }
  async startIfReady() {
    const {host,guest}=this.sockets();
    if(this.state.started||!host||!guest||this.state.hostCharacter===null||!this.state.hostReady||!this.state.guestReady)return;
    this.state.started=true;this.state.paused=!!(this.state.hostAway||this.state.guestAway);this.state.pauseBy=this.state.paused?'away':null;
    await this.save();
    this.broadcast({type:'start',hostCharacter:this.state.hostCharacter});
    this.publishPause();
  }
  async webSocketMessage(ws, raw) {
    if(typeof raw !== 'string' || raw.length > 4096) return;
    let m;try{m=JSON.parse(raw)}catch{return}
    if(!m||typeof m!=='object')return;
    const a=ws.deserializeAttachment(),role=a?.role;if(!role)return;
    const {host,guest}=this.sockets();
    if((role==='host'?host:guest)!==ws)return;
    if(m.type==='character' && role==='host' && (m.character===1||m.character===2)) {
      this.state.hostCharacter=m.character;this.state.started=false;
      await this.save();this.send(guest,{type:'character',hostCharacter:m.character});await this.startIfReady();return;
    }
    if(m.type==='ready') {
      if(role==='host')this.state.hostReady=true;else this.state.guestReady=true;
      await this.save();await this.startIfReady();return;
    }
    if(m.type==='presence' && typeof m.away==='boolean') {
      const field=role==='host'?'hostAway':'guestAway';
      this.state[field]=m.away;
      if(m.away && this.state.started){this.state.paused=true;this.state.pauseBy='away';}
      await this.save();this.publishPause();return;
    }
    if(m.type==='pause' && this.state.started && host && guest && typeof m.paused==='boolean') {
      if(!m.paused && (this.state.hostAway || this.state.guestAway)) {this.publishPause();return;}

      this.state.paused=m.paused;this.state.pauseBy=role;
      await this.save();this.publishPause();return;
    }
    if(m.type==='key'&&this.state.started&&!this.state.paused&&KEYS.has(m.key)&&typeof m.down==='boolean'){
      this.send(role==='host'?guest:host,{type:'key',key:m.key,down:m.down});return;
    }
    if(m.type==='ping')this.send(ws,{type:'pong'});
  }
  async webSocketClose(ws) {await this.leave(ws)}
  async webSocketError(ws) {await this.leave(ws)}
  async leave(ws) {
    const a=ws.deserializeAttachment(),role=a?.role;if(!role)return;
    ws.serializeAttachment({role:null,room:null});
    const {host,guest}=this.sockets(), other=role==='host'?guest:host;
    if(role==='host'){
      this.state={hostCharacter:null,started:false,hostReady:false,guestReady:false,paused:false,pauseBy:null};
      this.send(other,{type:'peer-left'});this.send(other,{type:'character-reset'});
    }else{
      this.state.guestReady=false;this.state.started=false;this.state.paused=false;this.state.pauseBy=null;this.state.guestAway=false;
      this.send(other,{type:'peer-left'});
    }
    await this.save();
    this.status(a.room);
    try{ws.close(1000,'Disconnected')}catch(_){}
  }
}

export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(url.pathname==='/ws') {
      if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
      const room=url.searchParams.get('room')||'';
      if(!VALID_ROOM.test(room))return new Response('Invalid room',{status:400});
      const id=env.GAME_ROOMS.idFromName('hkn:'+room);
      return env.GAME_ROOMS.get(id).fetch(request);
    }
    // Ruffle dynamically loads additional level_*.swf files. Serve them with an
    // explicit Flash MIME type, so edge MIME inference and nosniff cannot block them.
    if (/^\/(?:hongkongninja|resource\/level_[1-6])\.swf$/.test(url.pathname)) {
      const asset = await env.ASSETS.fetch(request);
      if (!asset.ok) return new Response('Missing Flash game asset: '+url.pathname,{status:asset.status});
      const headers = new Headers(asset.headers);
      headers.set('Content-Type','application/x-shockwave-flash');
      headers.set('X-Content-Type-Options','nosniff');
      headers.set('Cache-Control','public, max-age=3600');
      return new Response(asset.body,{status:asset.status,headers});
    }
    return env.ASSETS.fetch(request);
  }
};
