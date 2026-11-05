const prefix='zkpool.';
export function read(key,fallback){try{return JSON.parse(localStorage.getItem(prefix+key))??fallback}catch{return fallback}}
export function save(key,value){localStorage.setItem(prefix+key,JSON.stringify(value))}
export const defaults={volume:65,sound:true,quality:'High',motion:true,table:'Tournament Green',cue:'Classic Wood',theme:'dark',guide:true,sensitivity:1,spin:true};
export function record(g,seat,mode){
 if(g.winner===null||mode==='practice')return;
 const h=read('history',[]);if(h.some(m=>m.id===g.id))return;
 h.unshift({id:g.id,date:Date.now(),opponent:g.names[1-seat],winner:g.names[g.winner],player:g.names[seat],mode,won:g.winner===seat,duration:Math.round((Date.now()-g.started)/1000),...g.stats[seat],eight:g.winner===seat&&g.eight,run:g.winner===seat&&g.run});save('history',h)
}
