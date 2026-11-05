let ctx,last=0;
export function sound(event,prefs,strength=450){if(!prefs.sound||prefs.volume<=0)return;
 try{ctx??=new AudioContext();if(ctx.state==='suspended')ctx.resume().catch(()=>{});
 const t=ctx.currentTime;if(event==='collision'&&t-last<.016)return;if(event==='collision')last=t;
 const freq={collision:920,rail:270,pocket:115,scratch:85,shot:620,foul:175,turn:430,win:660,menu:530}[event]||400;
 const len=['win','foul','scratch'].includes(event)?.28:.09,osc=ctx.createOscillator(),gain=ctx.createGain();
 osc.type=event==='collision'||event==='shot'?'triangle':'sine';osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(freq*(event==='win'?1.5:.32),t+len);
 gain.gain.setValueAtTime(Math.min(.24,.04+strength/4500)*prefs.volume/100,t);gain.gain.exponentialRampToValueAtTime(.0001,t+len);osc.connect(gain).connect(ctx.destination);osc.start(t);osc.stop(t+len)
 }catch{}}
