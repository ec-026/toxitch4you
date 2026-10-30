(()=>{'use strict';
const $=s=>document.getElementById(s);
const keyMap={KeyA:['left',37],KeyD:['right',39],KeyW:['up',38],KeyS:['down',40],KeyJ:['attack',90],KeyK:['jump',88],KeyL:['skill',67],ArrowLeft:['left',37],ArrowRight:['right',39],ArrowUp:['up',38],ArrowDown:['down',40]};
const codes={left:37,right:39,up:38,down:40,attack:90,jump:88,skill:67};
let socket=null,role=null,friend=false,player=null,bridge=false,focused=false,hostCharacter=null,characterApplied=false,desired=null,hostStartSent=false,guestStarted=false,guestTitleAdvanced=false,hostStarted=false,selectionReadySent=false,roomPaused=false,pauseApplied=null;
const held=new Set(),remoteHeld=new Set();
window.hknGetRole=()=>role||'';
window.hknCharacterPicked=(n)=>{if(role==='host'&&(n===1||n===2)){hostCharacter=n;hostStartSent=false;showHostWait();send({type:'character',character:n});$('character').textContent='You chose '+(n===1?'Male':'Female')+'. Guest gets '+(n===1?'Female':'Male')+'.';}return true;};
const log=s=>{if(/error|unavailable|connection lost/i.test(String(s)))$('status').textContent='CONNECTION ISSUE';};
const send=x=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(x))};
function flash(name,...args){if(!player||!bridge)return;try{return player.ruffle().callExternalInterface(name,...args)}catch(e){log('SWF bridge error: '+e.message)}}
function release(){for(const key of held){flash('hknLocalUp',codes[key]);send({type:'key',key,down:false})}held.clear()}
function applyPause(){if(!bridge||!characterApplied)return; if(pauseApplied===roomPaused)return;const response=flash('hknApplyRoomPause',roomPaused);if(response==='PAUSED'||response==='PLAYING'){pauseApplied=roomPaused;log('Room '+(roomPaused?'paused':'resumed'));}}
function setPause(paused){roomPaused=!!paused;$('pauseOverlay').hidden=!roomPaused;$('pauseButton').textContent=roomPaused?'RESUME':'PAUSE'; if(roomPaused){release();releaseRemote();}applyPause();}
function requestPause(){if(!socket||socket.readyState!==WebSocket.OPEN||!role||!characterApplied)return;send({type:'pause',paused:!roomPaused})}
window.hknRequestSharedPause=(paused)=>{if(!socket||socket.readyState!==WebSocket.OPEN||!role||!characterApplied)return false;if(!!paused===roomPaused)return true;send({type:'pause',paused:!!paused});return true;};
function releaseRemote(){for(const key of remoteHeld)flash('hknRemoteUp',codes[key]);remoteHeld.clear()}
function connect(){if(!desired)return;const protocol=location.protocol==='https:'?'wss':'ws';const endpoint=protocol+'://'+location.host+'/ws?room='+encodeURIComponent(desired.room)+'&mode='+encodeURIComponent(desired.type);socket=new WebSocket(endpoint);socket.onopen=()=>{};
socket.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.type==='welcome'){role=m.role;$('lobby').hidden=true;$('roomDialog').hidden=true;$('libraryShell').hidden=true;$('playArea').hidden=false;$('roomCode').textContent=m.room;document.querySelectorAll('.room-code-text').forEach(x=>x.textContent=m.room);$('roomLink').value=location.origin+'/?room='+m.room;history.replaceState(null,'','/?room='+m.room);$('character').textContent=role==='host'?'Choose Male or Female in the original game menu.':'Waiting for Player 1 to start the game...';$('guestWait').hidden=role!=='guest';showHostWait();$('role').textContent=role==='host'?'HOST / HERO 1':'GUEST / HERO 2';if(bridge)flash('hknSetRole',role);if(!player)startGame()}
if(m.type==='character'){hostCharacter=m.hostCharacter;characterApplied=false;$('character').textContent='Host chose '+(hostCharacter===1?'Male':'Female')+'. You automatically play '+(hostCharacter===1?'Female':'Male')+'. Click PLAY (not a character) if still on the title screen.';}
if(m.type==='pause-state'){setPause(m.paused);}
if(m.type==='start'){if(role==='host'){hostStarted=true;guestStarted=true;}else{guestStarted=true;}if(m.hostCharacter===1||m.hostCharacter===2)hostCharacter=m.hostCharacter;$('guestWait').hidden=role!=='guest';$('character').textContent='Both players ready — starting mission...';}
if(m.type==='character-reset'){hostStarted=false;selectionReadySent=false;hostCharacter=null;characterApplied=false;guestStarted=false;guestTitleAdvanced=false;$('guestWait').hidden=false;$('character').textContent='Waiting for host to select a character';}
if(m.type==='status'){if(typeof m.paused==='boolean'&&characterApplied)setPause(m.paused);$('status').textContent=m.friend?'PARTNER CONNECTED':'WAITING FOR PARTNER';friend=!!m.friend;if(!friend){setPause(false);releaseRemote();selectionReadySent=false}showHostWait()}
if(m.type==='error'){$('lobbyError').textContent=m.reason||'Unable to join';desired=null}
if(m.type==='key'&&codes[m.key]&&typeof m.down==='boolean'){if(m.down){if(!remoteHeld.has(m.key)){remoteHeld.add(m.key);flash('hknRemoteDown',codes[m.key])}}else{remoteHeld.delete(m.key);flash('hknRemoteUp',codes[m.key])}}
if(m.type==='peer-left'){setPause(false);releaseRemote();hostStarted=false;guestStarted=false;selectionReadySent=false;showHostWait();if(role==='guest'){$('guestWait').hidden=false;$('character').textContent='Host disconnected. Waiting for Player 1...';}}};socket.onclose=e=>{releaseRemote();if(role){$('status').textContent='CONNECTION LOST — REJOIN ROOM';}else if(desired){$('lobbyError').textContent=e.code===1006?'Room unavailable, full, or connection failed.':'Connection closed. Please try again.';}socket=null};socket.onerror=()=>log('WebSocket connection error')}
async function startGame(){try{
  if(!window.RufflePlayer)throw Error('Ruffle unavailable — check internet');
  // HEAD preflight avoids downloading the 6 MB game twice.
  for(const path of ['/hongkongninja.swf','/resource/level_1.swf']){
    const result=await fetch(path,{method:'HEAD',cache:'no-store'});
    if(!result.ok)throw Error(path+' returned HTTP '+result.status);
    if(!/shockwave-flash|octet-stream/i.test(result.headers.get('content-type')||''))
      throw Error(path+' has incorrect content type: '+result.headers.get('content-type'));
  }
player=window.RufflePlayer.newest().createPlayer();player.config={autoplay:'on',unmuteOverlay:'visible',letterbox:'off',scale:'exactFit',forceScale:true,allowScriptAccess:true};$('game').appendChild(player);await player.ruffle().load({url:location.origin+'/hongkongninja.swf',base:location.origin+'/'});setInterval(checkBridge,600)}catch(e){$('status').textContent='GAME LOAD FAILED: '+e.message;console.error('Ruffle load failure',e);}}
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
$('copy').onclick=()=>navigator.clipboard.writeText($('roomLink').value).then(()=>{$('copy').textContent='COPIED'}).catch(()=>log('Copy address bar URL manually'));
$('focus').onclick=async()=>{
  const stage=$('playArea');
  try{
    if(document.fullscreenElement) await document.exitFullscreen();
    else if(stage.requestFullscreen) await stage.requestFullscreen();
    else throw Error('Browser fullscreen is unavailable');
    $('game').focus(); focused=true;
  }catch(e){ $('status').textContent='FULLSCREEN BLOCKED'; }
};
document.addEventListener('fullscreenchange',()=>{
  $('focus').textContent=document.fullscreenElement?'WINDOWED':'FULLSCREEN';
  if(!document.fullscreenElement){release();focused=false;}
});
$('game').addEventListener('pointerdown',()=>{focused=true});
window.addEventListener('keydown',e=>{if((e.code==='Escape'||e.code==='KeyP')&&role&&characterApplied&&focused){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)requestPause();return}if(!bridge||!role||!keyMap[e.code]||!focused||!characterApplied||roomPaused)return;if(e.repeat)return;e.preventDefault();e.stopImmediatePropagation();const [key,code]=keyMap[e.code];if(!held.has(key)){held.add(key);flash('hknLocalDown',code);send({type:'key',key,down:true})}},true);
window.addEventListener('keyup',e=>{if((e.code==='Escape'||e.code==='KeyP')&&role&&characterApplied&&focused){e.preventDefault();e.stopImmediatePropagation();return}if(!bridge||!role||!keyMap[e.code]||!focused||!characterApplied||roomPaused)return;e.preventDefault();e.stopImmediatePropagation();const [key,code]=keyMap[e.code];if(held.delete(key)){flash('hknLocalUp',code);send({type:'key',key,down:false})}},true);
$('create').onclick=()=>{const bytes=new Uint8Array(4);crypto.getRandomValues(bytes);const room=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();desired={type:'create',room};$('lobbyError').textContent='';connect()}; $('join').onclick=()=>{const r=$('joinCode').value.trim().toUpperCase();if(!/^[A-F0-9]{8}$/.test(r)){$('lobbyError').textContent='Room code must contain 8 letters/numbers';return}desired={type:'join',room:r};$('lobbyError').textContent='';connect()}; $('joinCode').addEventListener('keydown',e=>{if(e.key==='Enter')$('join').click()}); $('copyRoom').onclick=()=>navigator.clipboard.writeText($('roomLink').value).then(()=>{$('copyRoom').textContent='COPIED'}); const invite=new URLSearchParams(location.search).get('room');if(invite){$('joinCode').value=invite.toUpperCase();$('lobbyHelp').textContent='Invite detected. Join the private session using this code.';openDialog('join');} window.addEventListener('blur',()=>{focused=false;release()});document.addEventListener('visibilitychange',()=>{if(document.hidden){focused=false;release()}});
})();