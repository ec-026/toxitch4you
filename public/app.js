(()=>{'use strict';
const $=s=>document.getElementById(s);
const keyMap={KeyA:['left',37],KeyD:['right',39],KeyW:['up',38],KeyS:['down',40],KeyJ:['attack',90],KeyK:['jump',88],KeyL:['skill',67],ArrowLeft:['left',37],ArrowRight:['right',39],ArrowUp:['up',38],ArrowDown:['down',40]};
const codes={left:37,right:39,up:38,down:40,attack:90,jump:88,skill:67};
window.__hknRendererTest=new URLSearchParams(location.search).get('renderer');
let socket=null,role=null,friend=false,player=null,bridge=false,focused=false,hostCharacter=null,characterApplied=false,desired=null,hostStartSent=false,guestStarted=false,guestTitleAdvanced=false,hostStarted=false,selectionReadySent=false,roomPaused=false,pauseApplied=null,roomAway={host:false,guest:false};
const held=new Set(),remoteHeld=new Set();
let rtc=null, localStream=null, rtcStarting=false;
const RTC_CONFIG={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]};
function showStreamError(message){$('status').textContent=message;console.warn('[T4 stream]',message)}
function findGameCanvas(){const root=player?.shadowRoot;return root?.querySelector('canvas')||document.querySelector('#game canvas')}
function closeRTC(){if(rtc){rtc.close();rtc=null}if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}rtcStarting=false;const video=$('guestVideo');if(video){video.srcObject=null;video.hidden=true}}
function newRTC(){if(rtc)rtc.close();rtc=new RTCPeerConnection(RTC_CONFIG);rtc.onicecandidate=e=>{if(e.candidate)send({type:'rtc-ice',candidate:e.candidate.toJSON()})};rtc.onconnectionstatechange=()=>{if(rtc?.connectionState==='failed')showStreamError('VIDEO CONNECTION FAILED — try another network or configure TURN');};if(role==='guest')rtc.ontrack=e=>{const video=$('guestVideo');video.srcObject=e.streams[0]||new MediaStream([e.track]);video.hidden=false;video.play().catch(()=>{});$('guestWait').hidden=true;$('status').textContent='LIVE HOST GAME STREAM';};return rtc}
async function hostOffer(){if(role!=='host'||rtcStarting)return;rtcStarting=true;try{const canvas=await new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{const c=findGameCanvas();if(c&&c.width&&c.height){clearInterval(timer);resolve(c)}else if(++n>100){clearInterval(timer);reject(Error('Ruffle canvas unavailable'))}},200)});if(!canvas.captureStream)throw Error('Canvas capture unsupported');if(!localStream)localStream=canvas.captureStream(30);const peer=newRTC();for(const track of localStream.getTracks())peer.addTrack(track,localStream);const offer=await peer.createOffer();await peer.setLocalDescription(offer);send({type:'rtc-offer',sdp:peer.localDescription.sdp});$('status').textContent='STARTING LIVE VIDEO…'}catch(e){showStreamError('STREAM ERROR: '+e.message)}finally{rtcStarting=false}}
async function signalRTC(m){try{if(m.type==='rtc-ready'&&role==='host'){closeRTC();await hostOffer()}else if(m.type==='rtc-offer'&&role==='guest'){const peer=newRTC();await peer.setRemoteDescription({type:'offer',sdp:m.sdp});await flushIce();const answer=await peer.createAnswer();await peer.setLocalDescription(answer);send({type:'rtc-answer',sdp:peer.localDescription.sdp})}else if(m.type==='rtc-answer'&&role==='host'&&rtc){await rtc.setRemoteDescription({type:'answer',sdp:m.sdp});await flushIce()}else if(m.type==='rtc-ice'&&rtc&&m.candidate){if(rtc.remoteDescription)await rtc.addIceCandidate(m.candidate);else pendingIce.push(m.candidate)}}catch(e){showStreamError('WEBRTC ERROR: '+e.message)}}
const pendingIce=[];async function flushIce(){if(!rtc?.remoteDescription)return;while(pendingIce.length){try{await rtc.addIceCandidate(pendingIce.shift())}catch(e){console.warn(e)}}}

window.hknGetRole=()=>role||'';
window.hknCharacterPicked=(n)=>{if(role==='host'&&(n===1||n===2)){hostCharacter=n;hostStartSent=false;showHostWait();send({type:'character',character:n});$('character').textContent='You chose '+(n===1?'Male':'Female')+'. Guest gets '+(n===1?'Female':'Male')+'.';}return true;};
const log=s=>{if(/error|unavailable|connection lost/i.test(String(s)))$('status').textContent='CONNECTION ISSUE';};
const send=x=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(x))};
function flash(name,...args){if(!player||!bridge)return;try{return player.ruffle().callExternalInterface(name,...args)}catch(e){log('SWF bridge error: '+e.message)}}
function release(){for(const key of held){if(role==='host')flash('hknLocalUp',codes[key]);else send({type:'key',key,down:false})}held.clear()}
function applyPause(){if(role==='guest')return;if(!bridge||!characterApplied)return; if(pauseApplied===roomPaused)return;const response=flash('hknApplyRoomPause',roomPaused);if(response==='PAUSED'||response==='PLAYING'){pauseApplied=roomPaused;log('Room '+(roomPaused?'paused':'resumed'));}}
function updateAwayDisplay(){
  $('hostPresence').textContent='Player 1: '+(roomAway.host?'Away':'Ready');
  $('guestPresence').textContent='Player 2: '+(roomAway.guest?'Away':'Ready');
  const away=roomAway.host||roomAway.guest;
  $('pauseReason').textContent=away?'A player is away. The room is paused for both players.':'Both players are back. Resume when you are ready.';
  $('resumeTogether').disabled=away||!roomPaused||!characterApplied;
  $('pauseButton').disabled=away;
  $('resumeHint').textContent=away?'Waiting for both players to return…':'Either player can resume for both.';
}
function reportPresence(){if(role&&socket?.readyState===WebSocket.OPEN)send({type:'presence',away:document.hidden||!document.hasFocus()});}
function setPause(paused,away){if(away)roomAway={host:!!away.host,guest:!!away.guest};roomPaused=!!paused;$('pauseOverlay').hidden=!roomPaused;$('pauseButton').textContent=roomPaused?'RESUME':'PAUSE';updateAwayDisplay(); if(roomPaused){release();releaseRemote();}applyPause();}
function requestPause(){if(roomPaused&&(roomAway.host||roomAway.guest))return;if(!socket||socket.readyState!==WebSocket.OPEN||!role||!characterApplied)return;send({type:'pause',paused:!roomPaused})}
window.hknRequestSharedPause=(paused)=>{if(!socket||socket.readyState!==WebSocket.OPEN||!role||!characterApplied)return false;if(!paused&&(roomAway.host||roomAway.guest))return false;if(!!paused===roomPaused)return true;send({type:'pause',paused:!!paused});return true;};
function releaseRemote(){for(const key of remoteHeld)flash('hknRemoteUp',codes[key]);remoteHeld.clear()}
function connect(){if(!desired)return;const protocol=location.protocol==='https:'?'wss':'ws';const endpoint=protocol+'://'+location.host+'/ws?room='+encodeURIComponent(desired.room)+'&mode='+encodeURIComponent(desired.type);socket=new WebSocket(endpoint);socket.onopen=()=>{};
socket.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.type==='welcome'){role=m.role;$('lobby').hidden=true;$('roomDialog').hidden=true;$('libraryShell').hidden=true;$('playArea').hidden=false;$('roomCode').textContent=m.room;document.querySelectorAll('.room-code-text').forEach(x=>x.textContent=m.room);$('roomLink').value=location.origin+'/?room='+m.room;history.replaceState(null,'','/?room='+m.room);$('character').textContent=role==='host'?'Choose Male or Female in the original game menu.':'Waiting for Player 1 to start the game...';$('guestWait').hidden=role!=='guest';showHostWait();$('role').textContent=role==='host'?'HOST / HERO 1':'GUEST / HERO 2';if(bridge)flash('hknSetRole',role);reportPresence();if(role==='host'&&!player)startGame();if(role==='guest'){selectionReadySent=true;send({type:'ready'});send({type:'rtc-ready'});$('guestWait').hidden=false;$('status').textContent='WAITING FOR HOST VIDEO';}}
if(['rtc-ready','rtc-offer','rtc-answer','rtc-ice'].includes(m.type)){signalRTC(m).then(flushIce);}
if(m.type==='character'){hostCharacter=m.hostCharacter;characterApplied=false;$('character').textContent='Host chose '+(hostCharacter===1?'Male':'Female')+'. You automatically play '+(hostCharacter===1?'Female':'Male')+'. Click PLAY (not a character) if still on the title screen.';}
if(m.type==='pause-state'){setPause(m.paused,m.away);}
if(m.type==='start'){if(role==='guest'){characterApplied=true;$('guestWait').hidden=!!$('guestVideo').srcObject;updateAwayDisplay();}if(role==='host'){hostStarted=true;guestStarted=true;}else{guestStarted=true;}if(m.hostCharacter===1||m.hostCharacter===2)hostCharacter=m.hostCharacter;if(role==='guest')$('guestWait').hidden=!!$('guestVideo').srcObject;else $('guestWait').hidden=true;$('character').textContent='Both players ready — starting mission...';}
if(m.type==='character-reset'){hostStarted=false;selectionReadySent=false;hostCharacter=null;characterApplied=false;guestStarted=false;guestTitleAdvanced=false;$('guestWait').hidden=false;$('character').textContent='Waiting for host to select a character';}
if(m.type==='status'){if(typeof m.paused==='boolean')setPause(m.paused,m.away);$('status').textContent=m.friend?'PARTNER CONNECTED':'WAITING FOR PARTNER';friend=!!m.friend;if(!friend){setPause(false,{host:false,guest:false});releaseRemote();if(role==='host'){closeRTC();selectionReadySent=false}}showHostWait()}
if(m.type==='error'){$('lobbyError').textContent=m.reason||'Unable to join';desired=null}
if(m.type==='key'&&role==='host'&&codes[m.key]&&typeof m.down==='boolean'){if(m.down){if(!remoteHeld.has(m.key)){remoteHeld.add(m.key);flash('hknRemoteDown',codes[m.key])}}else{remoteHeld.delete(m.key);flash('hknRemoteUp',codes[m.key])}}
if(m.type==='peer-left'){closeRTC();setPause(false,{host:false,guest:false});releaseRemote();hostStarted=false;guestStarted=false;selectionReadySent=false;showHostWait();if(role==='guest'){$('guestWait').hidden=false;$('character').textContent='Host disconnected. Waiting for Player 1...';}}};socket.onclose=e=>{closeRTC();releaseRemote();setPause(true);if(role){$('status').textContent='CONNECTION LOST — REJOIN ROOM';}else if(desired){$('lobbyError').textContent=e.code===1006?'Room unavailable, full, or connection failed.':'Connection closed. Please try again.';}socket=null};socket.onerror=()=>log('WebSocket connection error')}
async function startGame(){
  const status=$('status');
  let bootTimer;
  try{
    status.textContent='LOADING GAME...';
    if(!window.RufflePlayer)throw Error('Ruffle script did not load');
    player=window.RufflePlayer.newest().createPlayer();
    // Optional renderer test: add ?renderer=canvas or ?renderer=webgl to the URL.
    // No query parameter means Ruffle's default renderer (same as the tested local app).
    const testRenderer=window.__hknRendererTest || new URLSearchParams(location.search).get('renderer');
    const renderer=['canvas','webgl','wgpu-webgl'].includes(testRenderer)?testRenderer:null;
    player.config={...window.RufflePlayer.config,base:location.origin+'/',...(renderer?{preferredRenderer:renderer}:{})};
    if(renderer)console.info('[toxitch4you] Ruffle renderer diagnostic:',renderer);
    $('game').appendChild(player);
    // Keep the same relative SWF URL as the locally verified build.
    // Do not block startup with HEAD/MIME checks: some edge hosts handle HEAD differently.
    bootTimer=setTimeout(()=>{
      if(!bridge&&role)status.textContent='GAME STILL STARTING — open F12 Console / Network for SWF errors';
    },14000);
    setInterval(checkBridge,600);
    await player.load(location.origin+'/hongkongninja.swf');
    if(status.textContent==='LOADING GAME...')status.textContent='GAME LOADED — WAITING FOR PARTNER';
  }catch(e){
    status.textContent='GAME LOAD FAILED: '+(e?.message||String(e));
    console.error('[toxitch4you] Ruffle failed to load the game:',e);
  }finally{if(bootTimer&&bridge)clearTimeout(bootTimer)}
}

function showHostWait(){
 const mask=$('hostWait');if(!mask)return;
 mask.hidden=!(role==='host'&&hostCharacter!==null&&!hostStarted);
 if(!mask.hidden)$('hostWaitText').textContent=friend?'Waiting for Player 2 to finish loading...':'Waiting for Player 2 to join...';
}
function checkBridge(){
 if(!player||!role)return;
 try{
  // The guest advances only to the selection menu. No mission starts yet.
  if(role==='guest'&&!guestTitleAdvanced){
   const opened=player.ruffle().callExternalInterface('hknGuestBegin');
   if(opened==='OPENED'||opened==='ALREADY_OPEN')guestTitleAdvanced=true;
  }
  if(!selectionReadySent){
   const ready=player.ruffle().callExternalInterface('hknCharacterScreenReady');
   if(ready==='READY'){
    selectionReadySent=true;send({type:'ready'});log('Character screen ready. Awaiting other player.');
   }
  }
  if(role==='host'&&hostStarted&&!characterApplied){
   const result=player.ruffle().callExternalInterface('hknHostCommitCharacter');
   if(result==='SELECTED'||result==='ALREADY_SELECTED'){characterApplied=true;pauseApplied=null;log('Host mission started.');applyPause();}
  }
  if(role==='guest'&&guestStarted&&hostCharacter!==null&&!characterApplied){
   const result=player.ruffle().callExternalInterface('hknAutoSelectCharacter',hostCharacter);
   if(result==='SELECTED'||result==='ALREADY_SELECTED'){characterApplied=true;pauseApplied=null;log('Guest mission started.');$('guestWait').hidden=true;applyPause();}
  }
  const ok=player.ruffle().callExternalInterface('hknBridgePing')==='HKN-DUAL-READY';
  if(ok&&!bridge){bridge=true;flash('hknSetRole',role);pauseApplied=null;applyPause();$('bridge').textContent='Bridge: READY ('+role+')';log('Input relay ready.');}
  else if(!ok){bridge=false;$('bridge').textContent='Bridge: waiting for mission';}
  showHostWait();
 }catch(e){bridge=false;$('bridge').textContent='Bridge: waiting for mission'}
}
function openDialog(mode){$('roomDialog').hidden=false;$('dialogTitle').textContent=mode==='join'?'JOIN A SESSION':'CREATE A SESSION';$('dialogDescription').textContent=mode==='join'?'Enter your partner’s invite code to join their co-op match.':'Create a private room for exactly two players.';if(mode==='join')setTimeout(()=>$('joinCode').focus(),0)}
// The creator notice appears once per browser session; it can be reopened from the header.
const notice=$('noticeDialog');
function closeNotice(){notice.hidden=true;try{sessionStorage.setItem('hkn-notice-seen','1')}catch(_){}}
$('openNotice').onclick=()=>{notice.hidden=false};
$('dismissNotice').onclick=closeNotice;
$('dismissNoticeTop').onclick=closeNotice;
notice.addEventListener('click',e=>{if(e.target===notice)closeNotice()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!notice.hidden)closeNotice()});
// Invite guests go straight to Join Room; only normal library visits show the creator notice.
const isDirectInvite=/^[A-F0-9]{8}$/i.test((new URLSearchParams(location.search).get('room')||'').trim());
try{notice.hidden=isDirectInvite||sessionStorage.getItem('hkn-notice-seen')==='1'}catch(_){notice.hidden=isDirectInvite}
$('openCreate').onclick=()=>openDialog('create');
$('openJoin').onclick=()=>openDialog('join');

$('closeDialog').onclick=()=>{$('roomDialog').hidden=true;};
$('roomDialog').addEventListener('click',e=>{if(e.target===$('roomDialog'))$('roomDialog').hidden=true});
$('leaveSession').onclick=()=>{release();releaseRemote();desired=null;if(socket){socket.onclose=null;socket.close()}location.href=location.origin+'/';};
$('pauseButton').onclick=requestPause;
$('resumeTogether').onclick=requestPause;
$('copy').onclick=()=>navigator.clipboard.writeText($('roomLink').value).then(()=>{$('copy').textContent='COPIED'}).catch(()=>log('Copy address bar URL manually'));
$('focus').onclick=async()=>{
  const stage=$('playArea');
  try{
    if(document.fullscreenElement) await document.exitFullscreen();
    else if(stage.requestFullscreen) await stage.requestFullscreen();
    else throw Error('Browser fullscreen is unavailable');
    (role==='guest' ? $('guestVideo') : $('game')).focus(); focused=true;
  }catch(e){ $('status').textContent='FULLSCREEN BLOCKED'; }
};
document.addEventListener('fullscreenchange',()=>{
  $('focus').textContent=document.fullscreenElement?'WINDOWED':'FULLSCREEN';
  if(!document.fullscreenElement){release();focused=false;}
});
$('game').addEventListener('pointerdown',()=>{focused=true});$('guestVideo').addEventListener('pointerdown',()=>{focused=true});
window.addEventListener('keydown',e=>{if((e.code==='Escape'||e.code==='KeyP')&&role&&characterApplied&&focused){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)requestPause();return}if(!(role==='guest'||bridge)||!role||!keyMap[e.code]||!focused||!characterApplied||roomPaused)return;if(e.repeat)return;e.preventDefault();e.stopImmediatePropagation();const [key,code]=keyMap[e.code];if(!held.has(key)){held.add(key);if(role==='host')flash('hknLocalDown',code);else send({type:'key',key,down:true})}},true);
window.addEventListener('keyup',e=>{if((e.code==='Escape'||e.code==='KeyP')&&role&&characterApplied&&focused){e.preventDefault();e.stopImmediatePropagation();return}if(!(role==='guest'||bridge)||!role||!keyMap[e.code]||!focused||!characterApplied||roomPaused)return;e.preventDefault();e.stopImmediatePropagation();const [key,code]=keyMap[e.code];if(held.delete(key)){if(role==='host')flash('hknLocalUp',code);else send({type:'key',key,down:false})}},true);
$('create').onclick=()=>{const bytes=new Uint8Array(4);crypto.getRandomValues(bytes);const room=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();desired={type:'create',room};$('lobbyError').textContent='';connect()}; $('join').onclick=()=>{const r=$('joinCode').value.trim().toUpperCase();if(!/^[A-F0-9]{8}$/.test(r)){$('lobbyError').textContent='Room code must contain 8 letters/numbers';return}desired={type:'join',room:r};$('lobbyError').textContent='';connect()}; $('joinCode').addEventListener('keydown',e=>{if(e.key==='Enter')$('join').click()}); $('copyRoom').onclick=()=>navigator.clipboard.writeText($('roomLink').value).then(()=>{$('copyRoom').textContent='COPIED'}); const invite=new URLSearchParams(location.search).get('room');if(invite){$('joinCode').value=invite.toUpperCase();$('lobbyHelp').textContent='Invite detected. Join the private session using this code.';openDialog('join');} window.addEventListener('blur',()=>{focused=false;release();reportPresence()});
window.addEventListener('focus',()=>{reportPresence()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){focused=false;release()}reportPresence()});
updateAwayDisplay();
})();