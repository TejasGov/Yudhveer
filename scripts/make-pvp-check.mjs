/**
 * Generates a temporary dev-only browser check page, outside the production entry point. Its visible controls
 * call the existing debug hooks and explicitly step a hidden Browser pane, where requestAnimationFrame stops.
 * The network scripts keep two heroes at a known distance to measure actual contacts, local parry age and peer
 * RTT. They are a transport/defence check, not a substitute for human playtesting. See docs/PVP.md for results.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const controls = `<div style="position:fixed;z-index:99999;top:0;left:0;background:#111;color:white;max-width:60vw;max-height:35vh;overflow:auto">
<button id="run-baseline">Run campaign check</button><button id="run-local">Run local duel check</button>
<button id="defence-check">Check defence rules</button><button id="step-live">Step live</button><button id="attack-live">Script attacks</button><button id="parry-live">Script parries</button><button id="stop-live">Stop stepping</button><button id="pause-check">Check pause menu</button>
<pre id="test-result">Ready</pre></div>
<script type="module">
const out = document.getElementById('test-result'); let interval; let attacking=false, defending=false, tick=0, parried=new Set();
const ready = async () => {
  for(let n=0; n<200 && !window.__yudhveer?.player?.motor; n++) await new Promise(resolve=>setTimeout(resolve,50));
  if(!window.__yudhveer?.player?.motor)throw new Error('Engine did not finish initialization');
};
const summary = e => ({ mode:e.gameMode, flow:e.mode, active:e.duel?.active, finished:e.duel?.finished, room:e.duel?.transport?.room, round:e.duel?.transport?.round, seat:e.duel?.transport?.seat,
 hp:e.player.currentHealth, posture:e.player.currentMarma, state:e.player.stateMachine.currentState, opponentHp:e.duel?.opponent.currentHealth, stats:e.combatSystem.stats, metrics:e.duel?.transport?.metrics, latency:e.duel?.transport?.latency,
 position:e.player.group.position.toArray(), remotePosition:e.duel?.opponent.group.position.toArray(), remoteState:e.duel?.opponent.stateMachine.currentState,
 log:e.combatSystem.log.slice(-8) });
document.getElementById('run-baseline').onclick = async () => { clearInterval(interval); out.textContent='Running campaign';
try { await ready(); __yudhveer.gameLoop=()=>{}; out.textContent=JSON.stringify(await __debug.playtest([2,4,5],2,{skill:'steady'})); } catch(e){out.textContent=e.stack;} };
document.getElementById('run-local').onclick = async () => { clearInterval(interval); out.textContent='Running local';
try { await ready(); const e=__yudhveer; e.gameLoop=()=>{}; await e.startDuel(); e.inputManager.exitPointerLock(); let n=0; while(!e.duel.finished&&n++<3600)e.debugAdvance(1/60);
 e.hud.update(e.player,[],e.sceneManager.camera,1/60); e.sceneManager.render(1/60); out.textContent=JSON.stringify({...summary(e),seconds:n/60}); }catch(e){out.textContent=e.stack;} };
document.getElementById('defence-check').onclick = async () => { await ready(); const {checkDuelDefence}=await import('/src/debug/DuelCheck.ts'); out.textContent=JSON.stringify(await checkDuelDefence(__yudhveer)); };
document.getElementById('step-live').onclick = () => { const e=__yudhveer; e.gameLoop=()=>{}; clearInterval(interval); e.inputManager.exitPointerLock();
 interval=setInterval(()=>{ try {
   if(e.duel?.active&&!e.duel.finished){
     const hero=e.player, foe=e.duel.opponent;
     if(attacking||defending){ const seat=e.duel.transport.seat; hero.group.position.set(0,0,seat===0?0.85:-0.85); hero.faceYaw(seat===0?Math.PI:0); }
     if(attacking&&tick%65===0)e.inputManager.press('attack');
     if(defending&&foe.snapshot){ const s=foe.snapshot, w=foe.hitWindows(s.state)[0];
       if(w&&s.state.startsWith('ATTACK')&&foe.stateMachine.stateTime>=w.t0-0.01&&!parried.has(s.swing)){
         parried.add(s.swing); e.inputManager.keys.Mouse2=true; e.inputManager.press('parry');
       }
     }
     e.duel.suspended=false; e.debugAdvance(1/60); tick++;
     if(tick%10===0){e.hud.update(e.player,[],e.sceneManager.camera,1/6); e.sceneManager.render(1/60);}
   }
   out.textContent=JSON.stringify(summary(e));
 } catch(err){out.textContent=err.stack;clearInterval(interval);} },1000/60);
};
document.getElementById('attack-live').onclick=()=>{attacking=!attacking;};
document.getElementById('parry-live').onclick=()=>{defending=!defending; if(!defending)__yudhveer.inputManager.keys.Mouse2=false;};
document.getElementById('pause-check').onclick=()=>{clearInterval(interval); __yudhveer.paused=false; __yudhveer.pause();};
document.getElementById('stop-live').onclick=()=>{clearInterval(interval);out.textContent=JSON.stringify(summary(__yudhveer));};
</script>`;
writeFileSync('pvp-check.html', readFileSync('index.html','utf8').replace('</body>',controls+'</body>'));
