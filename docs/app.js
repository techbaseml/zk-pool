import {draw,point} from './render.js';
import {ball,rack,strike,step,autoPlace,place} from './physics.js';
import {legalTargets,headSpotOptions} from './rules.js';
import {newGame,action,tick,resign} from './game.js';
import {levels} from './ai.js';
import {drills,setupDrill,drillHints,assess} from './practice.js';
import {read,save,defaults,record} from './storage.js';
import {sound} from './sound.js';
import {enter,act,watch} from './network.js';
const $=s=>document.querySelector(s), dialog=$('#dialog'),body=$('#dialog-body'),hero=$('#hero'),table=$('#table');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(id,label,cl='')=>'<button class="'+cl+'" data-action="'+id+'">'+label+'</button>';
const opts=(items,value)=>items.map(x=>'<option '+(String(x)===String(value)?'selected':'')+'>'+esc(x)+'</option>').join('');
const select=(id,label,items,value)=>'<label>'+label+'<select id="'+id+'">'+opts(items,value)+'</select></label>';
const range=(id,label,min,max,step,value)=>'<label>'+label+' <output>'+value+'</output><input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'"></label>';
const check=(id,label,on)=>'<label class="check"><input type="checkbox" id="'+id+'" '+(on?'checked':'')+'>'+label+'</label>';
const pockets=['Upper left','Upper middle','Upper right','Lower left','Lower middle','Lower right'];
const modeName={quick:'Quick Play',computer:'Computer match',friend:'Local match',practice:'Practice table',online:'Private room'};
let name=read('name',''),pref={...defaults,...read('settings',{})},mode='',g=null,flight=null,paused=false,placing=false,busy=false;
let level='Medium',drill='Free table',angle=0,power=.76,spinX=0,spinY=0,called=1,pocket=0,safety=false;
let netPrevious=null, netFrameTime=0;
let auth=null,room=null,stream=null,ai=null,notice='',modal='',last=0,acc=0,dirty=true,heroAngle=-.54;
const heroBalls=[[0,340,325],[8,535,207],[1,705,150],[10,630,340],[13,850,270],[3,720,395]].map(a=>ball(...a));
const seat=()=>mode==='online'?auth?.seat:0;
const cpu=()=>['quick','computer'].includes(mode)&&g?.turn===1;
const moving=()=>mode==='online'?room?.moving:!!flight;
const canShoot=()=>g&&g.winner===null&&!moving()&&!paused&&!busy&&!g.choice&&!cpu()&&(mode!=='online'||(g.turn===seat()&&room?.connected?.every(Boolean)));
function applyPrefs(){document.body.dataset.theme=pref.theme;document.body.classList.toggle('still',!pref.motion);dirty=true}
function identity(){ $('#player-name').textContent=name||'Player';$('#avatar').textContent=Array.from(name||'P')[0].toUpperCase() }
function pop(id,title,html,close=true){modal=id;body.innerHTML='<div class="modalhead"><h2>'+esc(title)+'</h2>'+(close?btn('close','×','dismiss'):'')+'</div>'+html+'<p role="status" id="feedback"></p>';if(!dialog.open)dialog.showModal();dialog.setAttribute('aria-label',title)}
function shut(){dialog.close();modal='';dirty=true}
function error(e){const f=dialog.open?$('#feedback'):$('#game-status');if(f)f.textContent=e.message||String(e)}
function profile(){pop('profile',name?'Player profile':'Welcome to the club','<form id="name-form"><label>Your player name<input id="name" required maxlength="32" autocomplete="nickname" placeholder="Enter your name" value="'+esc(name)+'"></label><button class="primary">'+(name?'Save name':'Enter clubhouse')+'</button></form>',!!name)}
function configure(m){if(m==='quick')return start(m);
 let fields=m==='computer'?select('level','Computer difficulty',levels,level):m==='friend'?'<label>Second player<input id="friend-name" maxlength="32" value="Player 2" required></label>':select('drill','Training drill',Object.keys(drills),drill);
 pop('setup',modeName[m],'<form data-mode="'+m+'" id="setup">'+fields+'<button class="primary">Open table</button></form>')}
function start(m,opponent,breaker=0){stopAI();mode=m;g=newGame([name,opponent||(m==='practice'?'Practice':level+' computer')],breaker);if(m==='practice'){g.balls=setupDrill(drill);g.message=drillHints[drill];g.hand=false}
 flight=null;paused=placing=false;angle=0;power=.76;spinX=spinY=0;safety=false;notice='';if(dialog.open)shut();view()}
function view(){ $('#home').hidden=!!g;$('#game').hidden=!g;if(g){$('#game-title').textContent=modeName[mode];status()}dirty=true }
function cleanRoom(){stream?.abort();stream=null;auth=room=null;sessionStorage.removeItem('zkpool.room')}
function home(){stopAI();if(mode==='online')cleanRoom();mode='';g=flight=null;paused=false;notice='';if(dialog.open)shut();view()}
function stopAI(){ai?.terminate();ai=null}
function freshCall(){if(g){const targets=legalTargets(g);if(!targets.includes(called))called=targets[0]||1}placing=false}
function ballTray(i){const group=g.groups[i];if(!group)return '';const nums=group==='solids'?[1,2,3,4,5,6,7]:[9,10,11,12,13,14,15];return '<div class="tray" aria-label="Group balls">'+nums.map(n=>'<span class="'+(g.balls.find(b=>b.n===n)?.dead?'down':'')+'" title="Ball '+n+'">'+n+'</span>').join('')+'</div>'}
function status(){
 if(!g)return;freshCallUnlessPlacing();const mine=canShoot(),ended=g.winner!==null,practice=mode==='practice';
 $('#score').innerHTML=g.names.map((n,i)=>'<div class="player '+(g.turn===i&&!ended?'active':'')+'"><strong>'+esc(n)+'</strong><small>'+esc(practice?(i?'Training':'Shooter'):(g.groups[i]||'Open table'))+'</small><span>'+g.stats[i].balls+' pocketed</span>'+ballTray(i)+'</div>').join('');
 $('#game-status').classList.toggle('victory',ended);$('#game-status').textContent=notice||(ended?g.names[g.winner]+' wins · '+g.message:moving()?'Shot in motion…':paused?'Match paused':(cpu()?'Computer is lining up a shot…':practice?drill:g.names[g.turn]+' to shoot')+' · '+g.message);
 let h='';
 if(ended){record(g,seat(),mode);h=btn('rematch',mode==='online'&&room.rematch[seat()]?'Rematch requested':'Rematch','primary')+btn('leave','Clubhouse')}
 else if(g.choice){if(mode!=='online'? !cpu():g.turn===seat())h=g.choice.options.map(o=>btn('choice-'+o.id,esc(o.label))).join('')}
 else if(paused)h='';
 else if(mine){
 if(!g.breaking&&!practice)h+='<div class="controlrow">'+select('called','Call ball',legalTargets(g),called)+select('pocket','Call pocket',pockets,pockets[pocket])+check('safety','Play safety',safety)+'</div>';
 h+='<div class="controlrow">'+range('power','Power (%)',1,100,1,Math.round(power*100))+range('fine','Fine aim (degrees)',-5,5,.1,0)+btn('shoot','Strike','primary strike')+'</div>';
 if(pref.spin)h+='<details class="spinbox"><summary>Spin control</summary><div class="controlrow">'+range('side','Left / right',-1,1,.05,spinX)+range('follow','Draw / follow',-1,1,.05,spinY)+'</div></details>';
 if(g.hand||practice)h+=btn('place',placing?'Tap felt to place cue':'Place cue ball');
 for(const n of headSpotOptions(g))h+=btn('spot-'+n,'Spot ball '+n);
 }
 if(!ended){h+='<div class="match-actions">';if(mode!=='online')h+=btn('pause',paused?'Resume game':'Pause')+btn('restart',practice?'Reset drill':'Restart');
 if(!practice)h+=btn('resign','Resign');h+=btn('settings','Settings')+btn('sound',pref.sound?'Sound on':'Sound off')+'</div>'}
 $('#controls').innerHTML=h;dirty=true;scheduleAI()
}
function freshCallUnlessPlacing(){let a=legalTargets(g);if(!a.includes(called))called=a[0]||1}
function scheduleAI(){if(!cpu()||flight||paused||g.winner!==null||ai)return;
 if(g.choice){const opt=g.choice.options[0].id;queueMicrotask(()=>{if(cpu()&&!paused&&g?.choice)perform({type:'choice',id:opt})});return}
 const w=new Worker(new URL('./ai-worker.js',import.meta.url),{type:'module'});ai=w;w.onmessage=e=>{if(ai!==w)return;stopAI();if(e.data.error)return error(e.data.error);perform({type:'shot',...e.data.shot})};w.onerror=e=>{stopAI();error(e.message)};w.postMessage({game:g,level})}
async function perform(a){
 try{a.seq=g.seq;notice='';
 if(mode==='online'){if(busy)return;busy=true;try{await act(auth,{...a,game:g.id})}finally{busy=false;if(g)status()}return}
 if(mode==='practice'){
 if(a.type==='place'){if(!place(g.balls,a.x,a.y))throw Error('Choose clear felt.')}
 if(a.type==='shot'){flight={log:strike(g.balls,a),shot:a};g.stats[0].shots++}}
 else flight=action(g,a)||null;
 if(a.type==='shot')sound('shot',pref);placing=false;acc=0;status()
 }catch(e){error(e)}
}
function finishPractice(){const l=flight.log;g.stats[0].balls+=l.pots.filter(b=>b.n).length;
 if(g.balls.find(b=>!b.n).dead)autoPlace(g.balls,false);
 g.message=l.pots.length?'Shot settled. '+l.pots.filter(b=>b.n).length+' object balls pocketed.':'Shot settled.';
 g.message=assess(drill,g.balls,l,flight.shot);}
function paint(t){const dt=Math.min(.12,(t-last)/1000||0);last=t;
 if(g&&mode!=='online'&&flight&&!paused){acc+=dt;while(acc>=1/240&&flight){acc-=1/240;
 const emit=(kind,v)=>sound(kind,pref,v);let active=mode==='practice'?step(g.balls,flight.log,emit):tick(g,flight,emit);
 if(!active){if(mode==='practice')finishPractice();flight=null;freshCall();sound(g.winner!==null?'win':g.hand?'foul':'turn',pref);status()}}dirty=true}
 if(dirty){const settings={...pref,reducedMotion:!pref.motion||matchMedia('(prefers-reduced-motion: reduce)').matches};
 let display=g?.balls;if(mode==='online'&&room?.moving&&netPrevious){const f=Math.min(1,(t-netFrameTime)/50);display=g.balls.map((b,i)=>{const a=netPrevious[i];return !a||a.dead||b.dead?b:{...b,x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f}})}
 if(g)draw(table,display,{...settings,angle:canShoot()&&!placing?angle:undefined,power,guide:pref.guide});
 else draw(hero,heroBalls,{...settings,hero:true,guide:false,angle:heroAngle,power:.35});dirty=mode==='online'&&room?.moving}requestAnimationFrame(paint)}
let drag=false;
function aim(e){const p=point(table,e),c=g.balls.find(b=>!b.n);angle=Math.atan2(p.y-c.y,p.x-c.x);dirty=true}
table.onpointerdown=e=>{if(!canShoot())return;if(placing){const p=point(table,e);perform({type:'place',...p});return}drag=true;table.setPointerCapture(e.pointerId);aim(e)};
table.onpointermove=e=>{if(canShoot()&&!placing&&(drag||e.pointerType==='mouse'))aim(e)};
table.onpointerup=table.onpointercancel=()=>{drag=false};
hero.parentElement.onpointermove=e=>{if(pref.motion){const r=hero.getBoundingClientRect();heroAngle=-.54+(e.clientX-r.left-r.width/2)/Math.max(1,r.width)*.35;dirty=true}};
new ResizeObserver(()=>{dirty=true}).observe(document.body);
function settings(){pop('settings','Table settings','<div class="settinggrid">'+select('tablePref','Table felt',['Tournament Green','Royal Blue','Midnight Black','Burgundy Red','Premium Gold Edition'],pref.table)+select('cuePref','Cue',['Classic Wood','Dark Carbon','Metallic Gold','Modern Pro'],pref.cue)+select('theme','Interface',['dark','light'],pref.theme)+select('quality','Graphics',['High','Low'],pref.quality)+range('volume','Volume',0,100,1,pref.volume)+range('sensitivity','Fine aim sensitivity',.25,2,.25,pref.sensitivity)+check('sound','Sound effects',pref.sound)+check('guide','Aim assistance',pref.guide)+check('spin','Cue spin controls',pref.spin)+check('motion','Animations',pref.motion)+'</div><div class="match-actions">'+btn('profile','Edit name')+btn('clear','Clear history')+btn('close','Done','primary')+'</div>')}
function stats(){const h=read('history',[]),sum=k=>h.reduce((s,m)=>s+Number(m[k]||0),0),wins=sum('won');
 const nums={'Matches':h.length,'Wins':wins,'Losses':h.length-wins,'Win rate':(h.length?Math.round(wins*100/h.length):0)+'%','Pocketed':sum('balls'),'Successful shots':sum('made'),'Fouls':sum('fouls'),'Eight-ball wins':sum('eight'),'Break & runs':sum('run'),'Best streak':Math.max(0,...h.map(m=>m.best))};
 pop('stats','Player statistics','<div class="statsgrid">'+Object.entries(nums).map(([k,v])=>'<div><strong>'+v+'</strong><small>'+k+'</small></div>').join('')+'</div><h3>Recent matches</h3>'+(h.slice(0,12).map(m=>'<p>'+esc(new Date(m.date).toLocaleDateString())+' · '+esc(m.opponent)+' · '+(m.won?'Win':'Loss')+'<br><small>'+esc(modeName[m.mode])+' · '+Math.ceil(m.duration/60)+' min · '+m.balls+' pocketed · '+m.fouls+' fouls · '+(m.shots?Math.round(m.made/m.shots*100):0)+'% accuracy · '+m.breakBalls+' on break</small></p>').join('')||'<p>Your completed matches will appear here.</p>'))}
function onlineSetup(){const code=new URL(location.href).searchParams.get('room')||'';pop('online','Private online room',btn('create','Create room','primary')+'<form id="join"><label>Room code<input id="code" required maxlength="8" minlength="8" pattern="[a-fA-F0-9]{8}" value="'+esc(code)+'"></label><button>Join room</button></form>')}
function lobby(){pop('lobby','Private room '+auth.code,'<p>'+esc(room?.names.filter(Boolean).join('  ·  ')||name)+'</p><p>'+(room?.names.length===2?'Both seats filled. Each player confirms readiness.':'Waiting for a second player…')+'</p>'+btn('copy','Copy invitation')+btn('ready',room?.ready[seat()]?'Ready ✓':'Ready to play','primary')+btn('leave','Leave room'),false)}
function connect(key){auth=key;sessionStorage.setItem('zkpool.room',JSON.stringify(key));mode='online';stream?.abort();stream=new AbortController();lobby();
 watch(auth,stream.signal,({kind,value})=>{
 if(kind==='audio'){for(const [k,v] of value)sound(k,pref,v);return}
 if(kind==='frame'){if(g){netPrevious=g.balls.map(b=>({...b}));netFrameTime=performance.now();for(const [n,x,y,dead,rot] of value){const b=g.balls.find(b=>b.n===n);Object.assign(b,{x,y,dead,rot})}dirty=true}return}
 const prev=g,wasMoving=room?.moving;room=value;g=room.game;notice=room.connected.every(Boolean)||g?.winner!=null?'':'Opponent disconnected. Waiting for reconnection.';
 if(!g){if(modal==='lobby')lobby();return}
 if(modal==='lobby')shut();if(prev?.id!==g.id){angle=0;placing=false}
 if(wasMoving&&!room.moving)sound(g.winner!==null?'win':'turn',pref);if(!wasMoving&&room.moving)sound('shot',pref);
 view()
 },(msg,terminal)=>{notice=msg;if(room)room.connected=[false,false];if(g)status();else error(msg);if(terminal){sessionStorage.removeItem('zkpool.room');if(!g)pop('expired','Room closed','<p>'+esc(msg)+'</p>'+btn('leave','Clubhouse'),false)}})}
let opening=false;
async function openRoom(code){if(opening)return;opening=true;try{const key=await enter(name,code);connect(key)}catch(e){error(e)}finally{opening=false}}
let pending=null,aimBase=0;
function confirmAction(title,description,fn){pending=fn;pop('confirm',title,'<p>'+esc(description)+'</p>'+btn('confirm','Confirm','primary')+btn('close','Cancel'))}
async function exitMatch(){if(g&&g.winner===null&&mode!=='practice'){if(mode==='online'){const response=await act(auth,{type:'resign',game:g.id});record(response.game,seat(),mode)}else{resign(g,0);record(g,0,mode)}}home()}
async function dispatch(id){
 if(!name&&id!=='profile'){profile();return}
 if(id==='close'){shut();pending=null;return}
 if(id==='confirm'){const fn=pending;pending=null;shut();return fn?.()}
 if(id==='profile')return profile();
 if(id==='settings')return settings();
 if(id==='stats')return stats();
 if(id==='rules')return pop('rules','8-ball rulebook','<p>Break from behind the head string. Pocket an object ball or send four different object balls to a cushion. The table stays open after the break.</p><p>Call a ball and a pocket before each scoring shot. A legal called pot assigns groups on an open table. Hit your group first, then pocket a ball or send any ball to a rail. Call safety to pass after the shot.</p><p>A foul gives your opponent ball in hand. Clear your group before calling the eight. An early eight, wrong pocket or foul on the eight loses the rack. An eight on the break brings a choice to spot it or re-rack.</p><p>Point or touch the table to aim. Use Fine aim for small adjustments or the arrow keys. Choose power and spin, then Strike or press Space.</p>'+btn('close','Back','primary'));
 if(id==='leave'){if(auth&&modal==='lobby')await act(auth,{type:'leave'});home();return}
 if(id==='home'||id==='exit'){if(!g||g.winner!==null)return home();return confirmAction('Leave this table?',mode==='practice'?'End this practice session.':'Leaving an active match records a resignation.',exitMatch)}
 if(['computer','friend','practice','quick'].includes(id))return configure(id);
 if(id==='online')return onlineSetup();
 if(id==='create')return openRoom('');
 if(id==='ready')return act(auth,{type:'ready'});
 if(id==='copy'){const u=new URL(location.href);u.searchParams.set('room',auth.code);try{await navigator.clipboard.writeText(u.href);error('Invitation copied.')}catch{error(u.href)}return}
 if(id==='clear')return confirmAction('Clear match history?','This removes completed match records and statistics from this browser.',()=>{save('history',[]);stats()});
 if(id==='sound'){pref.sound=!pref.sound;save('settings',pref);status();return}
 if(id==='pause'){if(mode==='online'||!g)return;paused=!paused;stopAI();acc=0;status();return}
 if(id==='restart')return confirmAction('Restart this table?','Start a fresh rack with the same opponent or drill.',()=>start(mode,g.names[1]));
 if(id==='resign')return confirmAction('Resign this rack?','Your opponent wins this match.',async()=>{if(mode==='online')await act(auth,{type:'resign',game:g.id});else{stopAI();flight=null;resign(g,mode==='friend'?g.turn:0);status()}});
 if(id==='rematch'){if(mode==='online')return act(auth,{type:'rematch',game:g.id});return start(mode,g.names[1],1-g.breaker)}
 if(id.startsWith('choice-'))return perform({type:'choice',id:id.slice(7)});
 if(id.startsWith('spot-'))return perform({type:'spot',ball:+id.slice(5)});
 if(id==='place'&&canShoot()){placing=!placing;notice=placing?'Tap a clear spot '+(g.hand==='head'?'behind the head string (left quarter).':'on the felt.') :'';status();return}
 if(id==='shoot'&&canShoot()){return perform({type:'shot',angle,power,spinX:pref.spin?spinX:0,spinY:pref.spin?spinY:0,ball:called,pocket,safety})}
}
document.onclick=e=>{const b=e.target.closest('[data-action]');if(!b)return;document.querySelector('.mobmenu')?.removeAttribute('open');sound('menu',pref,80);Promise.resolve(dispatch(b.dataset.action)).catch(error)};
document.onsubmit=e=>{e.preventDefault();if(e.target.id==='name-form'){const value=$('#name').value.trim();if(!value)return error('Enter a player name.');const first=!name;name=value;save('name',name);identity();shut();if(first)resumeInvite()}
 if(e.target.id==='setup'){const m=e.target.dataset.mode;if(m==='friend'&&!$('#friend-name').value.trim())return error('Enter a name for player two.');if(m==='computer')level=$('#level').value;if(m==='practice')drill=$('#drill').value;start(m,$('#friend-name')?.value.trim())}
 if(e.target.id==='join')openRoom($('#code').value.trim())};
dialog.oncancel=e=>{if(!name||modal==='lobby'||modal==='expired')e.preventDefault();else{pending=null;modal=''}};
document.onpointerdown=e=>{if(e.target.id==='fine')aimBase=angle};
document.onfocusin=e=>{if(e.target.id==='fine')aimBase=angle};
document.oninput=e=>{const el=e.target,id=el.id,v=el.value;const output=el.parentElement?.querySelector('output');if(output)output.value=v;
 if(id==='fine'){angle=aimBase+(+v)*pref.sensitivity*Math.PI/180;dirty=true}
 if(id==='power'){power=+v/100;dirty=true}
 if(id==='side'||id==='follow'){if(id==='side')spinX=+v;else spinY=+v;const len=Math.hypot(spinX,spinY);if(len>1){if(id==='side')spinY=Math.sign(spinY)*Math.sqrt(Math.max(0,1-spinX**2));else spinX=Math.sign(spinX)*Math.sqrt(Math.max(0,1-spinY**2))}for(const [key,val] of [['side',spinX],['follow',spinY]]){const ctrl=$('#'+key);ctrl.value=val;ctrl.parentElement.querySelector('output').value=val.toFixed(2)}}
 if(id==='called')called=+v;if(id==='pocket')pocket=pockets.indexOf(v);if(id==='safety')safety=el.checked;
 if(modal==='settings'){const key={tablePref:'table',cuePref:'cue'}[id]||id;if(key in defaults){pref[key]=el.type==='checkbox'?el.checked:el.type==='range'?+v:v;save('settings',pref);applyPrefs();if(g)status()}}};
document.onkeydown=e=>{if(dialog.open||!canShoot()||['INPUT','SELECT','BUTTON','SUMMARY'].includes(e.target.tagName))return;
 if(e.code==='Space'){e.preventDefault();dispatch('shoot')}if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();angle+=(e.key==='ArrowLeft'?-1:1)*.003*pref.sensitivity;dirty=true}};
function resumeInvite(){try{const stored=JSON.parse(sessionStorage.getItem('zkpool.room')),invite=new URL(location.href).searchParams.get('room');if(stored&&(!invite||invite===stored.code))connect(stored);else if(invite)onlineSetup()}catch{}}
applyPrefs();identity();requestAnimationFrame(paint);if(!name)profile();else resumeInvite();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
