// Coordinates in this module match the simulator's cloth, independent of screen size.
const WIDTH = 1000;
const HEIGHT = 500;
const BORDER = 48;
const FRAME_W = WIDTH + 2 * BORDER;
const FRAME_H = HEIGHT + 2 * BORDER;
const BALL = 11;
const pockets = [[0,0],[500,0],[1000,0],[0,500],[500,500],[1000,500]];
const colors = ['#f4eddb','#ecad1d','#2254bb','#c23635','#723f9c','#e57e23','#207e54','#883e35','#20232a'];
const frames = new WeakMap();

const palettes = {
  green:['#26805e','#176b50','#104936','#248361'],
  blue:['#367cb0','#215d8b','#16394f','#317fa9'],
  black:['#454957','#303442','#191d26','#484d60'],
  red:['#99475b','#742d42','#441c2e','#9a4356'],
  gold:['#b89751','#96783d','#574727','#af914f']
};

function palette(name='') {
  const slug = String(name).toLowerCase();
  if (slug.includes('blue')) return palettes.blue;
  if (slug.includes('black') || slug.includes('midnight')) return palettes.black;
  if (slug.includes('red') || slug.includes('burgundy')) return palettes.red;
  if (slug.includes('gold')) return palettes.gold;
  return palettes.green;
}
function grad(ctx,x,y,endX,endY,stops) {
  const gradient = ctx.createLinearGradient(x,y,endX,endY);
  stops.forEach(([stop,color]) => gradient.addColorStop(stop,color));
  return gradient;
}
function halo(ctx,x,y,r,stops) {
  const gradient = ctx.createRadialGradient(x,y,0,x,y,r);
  stops.forEach(([stop,color]) => gradient.addColorStop(stop,color));
  return gradient;
}
function disc(ctx,x,y,r,fill) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
}
function polygon(ctx,points,fill,stroke) {
  ctx.beginPath();
  points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
  if (stroke) { ctx.strokeStyle=stroke; ctx.lineWidth=.65; ctx.stroke(); }
}
function rounded(ctx,x,y,w,h,r,fill) {
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fillStyle=fill; ctx.fill();
}
function segment(ctx,x1,y1,x2,y2,stroke,width) {
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
  ctx.strokeStyle=stroke; ctx.lineWidth=width; ctx.stroke();
}
function noise(seed=18561) {
  return () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
}
function cushion(ctx,x,y,length,rotation,pal) {
  ctx.save(); ctx.translate(x,y); ctx.rotate(rotation);
  polygon(ctx,[[0,-13],[length,-13],[length-10,0],[10,0]],
    grad(ctx,0,-13,0,1,[[0,pal[2]],[.35,pal[3]],[.65,pal[1]],[1,pal[2]]]));
  segment(ctx,10,0,length-10,0,'rgba(0,0,0,.48)',1.5);
  segment(ctx,2,-12,length-2,-12,'rgba(255,255,255,.13)',1);
  ctx.restore();
}
function cabinet(ctx,pal) {
  rounded(ctx,-47,-47,1094,594,36,'#101113');
  rounded(ctx,-46,-46,1092,592,35,grad(ctx,0,-46,220,548,[[0,'#af936d'],[.13,'#30251d'],[.56,'#665137'],[.82,'#211810'],[1,'#98754b']]));
  rounded(ctx,-43,-43,1086,586,32,grad(ctx,0,-43,0,543,[[0,'#74513a'],[.04,'#493123'],[.13,'#34251b'],[.5,'#62422b'],[.89,'#3d281e'],[.97,'#65442e'],[1,'#38271e']]));
  const random=noise(808);
  // Grain follows the long and short rails separately.
  ctx.save(); ctx.beginPath(); ctx.roundRect(-42,-42,1084,584,31); ctx.clip();
  for(let i=0;i<156;i++) {
    const y=-42+random()*584;
    ctx.beginPath(); ctx.moveTo(-44,y); ctx.bezierCurveTo(230,y+random()*6,580,y-random()*7,1044,y+random()*2);
    ctx.strokeStyle=i%3 ? 'rgba(30,13,4,.16)' : 'rgba(251,209,148,.1)';
    ctx.lineWidth=.4+random(); ctx.stroke();
  }
  for(const edge of [-42,1014]) {
    for(let i=0;i<19;i++) {
      const x=edge+random()*28;
      segment(ctx,x,8,x+2,490,'rgba(239,194,131,.09)',.65);
    }
  }
  ctx.restore();
  rounded(ctx,-15,-15,1030,530,17,'#211a15');
  ctx.fillStyle=pal[1]; ctx.fillRect(-12,-12,1024,524);
  ctx.fillStyle=halo(ctx,410,162,740,[[0,pal[0]],[.6,pal[1]],[1,pal[2]]]); ctx.fillRect(-12,-12,1024,524);
  const grain = document.createElement('canvas'); grain.width=128; grain.height=128;
  const tex=grain.getContext('2d'); const pixels=tex.createImageData(128,128);
  for(let i=0;i<pixels.data.length;i+=4) {
    const v=random()>.5?230:2;
    pixels.data[i]=v; pixels.data[i+1]=v; pixels.data[i+2]=v;
    pixels.data[i+3]=Math.round(random()*19);
  }
  tex.putImageData(pixels,0,0); ctx.fillStyle=ctx.createPattern(grain,'repeat'); ctx.fillRect(-12,-12,1024,524);
  ctx.save();
  ctx.strokeStyle='rgba(231,251,229,.065)'; ctx.lineWidth=.7;
  segment(ctx,250,1,250,499,ctx.strokeStyle,.7);
  disc(ctx,750,250,2.4,'rgba(244,246,222,.32)');
  ctx.restore();
  for (const [x,y] of pockets) {
    disc(ctx,x,y,24.8,grad(ctx,x-20,y-25,x+22,y+24,[[0,'#e1c494'],[.18,'#987448'],[.55,'#564128'],[1,'#baa176']]));
    disc(ctx,x,y,22.4,'#201b17');
    disc(ctx,x,y,19.7,halo(ctx,x+2,y-2,27,[[0,'#040609'],[.65,'#0a0d0f'],[1,'#41382a']]));
  }
  for(const start of [17,515]) {
    const length=start===17?468:468;
    cushion(ctx,start,0,length,0,pal);
    cushion(ctx,1000-start,500,length,Math.PI,pal);
  }
  cushion(ctx,1000,17,466,Math.PI/2,pal);
  cushion(ctx,0,483,466,-Math.PI/2,pal);
  // Flush brass sights in the hardwood.
  for (const x of [125,250,375,625,750,875]) {
    for(const y of [-29,529]) polygon(ctx,[[x,y-3.7],[x+2.4,y],[x,y+3.7],[x-2.4,y]],'#d3b887','#432f20');
  }
  for (const y of [125,250,375]) {
    for(const x of [-30,1030]) polygon(ctx,[[x-3.7,y],[x,y-2.4],[x+3.7,y],[x,y+2.4]],'#d3b887','#432f20');
  }
  rounded(ctx,461,526,78,12,3,'#32271e');
  ctx.fillStyle='#c7ad83'; ctx.font='600 7px Georgia, serif'; ctx.textAlign='center';
  ctx.fillText('Z K   P O O L',500,534.8);
}

function metrics(canvas) {
  const box=canvas.getBoundingClientRect();
  const cssW=canvas.clientWidth||box.width||FRAME_W;
  const cssH=canvas.clientHeight||box.height||FRAME_H;
  const scale=Math.min(cssW/FRAME_W,cssH/FRAME_H);
  return {cssW,cssH,scale,left:(cssW-FRAME_W*scale)/2+BORDER*scale,top:(cssH-FRAME_H*scale)/2+BORDER*scale};
}
export function point(canvas,event) {
  const r=canvas.getBoundingClientRect(),m=metrics(canvas);
  return {x:((event.clientX-r.left)*m.cssW/r.width-m.left)/m.scale,
          y:((event.clientY-r.top)*m.cssH/r.height-m.top)/m.scale};
}
function surface(canvas,opt,m) {
  const maxDpr=String(opt.quality).toLowerCase()==='low'?1:2.5;
  const dpr=Math.min(devicePixelRatio||1,maxDpr);
  const w=Math.max(1,Math.round(m.cssW*dpr)),h=Math.max(1,Math.round(m.cssH*dpr));
  if (canvas.width!==w) canvas.width=w;
  if (canvas.height!==h) canvas.height=h;
  const key=[w,h,opt.table].join('/');
  let cache=frames.get(canvas);
  if (!cache || cache.key!==key) {
    const bg=document.createElement('canvas'); bg.width=w; bg.height=h;
    const ctx=bg.getContext('2d');
    ctx.setTransform(m.scale*dpr,0,0,m.scale*dpr,m.left*dpr,m.top*dpr);
    cabinet(ctx,palette(opt.table));
    cache={key,bg,last:new Map(),sinking:new Map()}; frames.set(canvas,cache);
  }
  return {cache,dpr};
}

function ball(ctx,b,scale=1) {
  ctx.save(); ctx.translate(b.x,b.y); ctx.scale(scale,scale);
  const n=b.n,base=colors[n>8?n-8:n]||colors[0];
  ctx.fillStyle=halo(ctx,1.8,3.2,14.8,[[0,'rgba(0,0,0,.8)'],[.6,'rgba(0,0,0,.58)'],[1,'rgba(0,0,0,0)']]);
  ctx.fillRect(-16,-13,35,33);
  ctx.beginPath(); ctx.arc(0,0,BALL,0,Math.PI*2); ctx.clip();
  ctx.fillStyle=n>8?'#f0ebd9':base; ctx.fillRect(-11,-11,22,22);
  if(n>8) {
    ctx.save(); ctx.rotate(-.38+.35*Math.sin(b.rot||0)); ctx.fillStyle=base;
    ctx.beginPath(); ctx.moveTo(-13,-6); ctx.quadraticCurveTo(0,-3,13,-6);
    ctx.lineTo(13,5); ctx.quadraticCurveTo(0,9,-13,5); ctx.fill(); ctx.restore();
  }
  if(n) {
    ctx.save(); ctx.translate(Math.sin(b.rot||0)*2.4,.8+Math.cos(b.rot||0)*.8);
    disc(ctx,0,0,n>9?4.6:4.3,'#eee9d7');
    ctx.fillStyle='#18191d'; ctx.font='bold 6.8px Arial,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(n,0,.35);
    ctx.restore();
  }
  const volume=ctx.createRadialGradient(-3.1,-4.4,1,0,0,11.3);
  [[0,'rgba(255,255,255,.22)'],[.45,'rgba(255,255,255,.02)'],[.74,'rgba(20,20,24,.1)'],[1,'rgba(1,7,11,.53)']].forEach(([s,c])=>volume.addColorStop(s,c));
  ctx.fillStyle=volume;ctx.fillRect(-11,-11,22,22);
  ctx.save();ctx.rotate(-.45);ctx.fillStyle='rgba(255,255,255,.78)';
  ctx.beginPath();ctx.ellipse(-1.9,-6.3,3,1.45,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.32)';ctx.fillRect(2,-7.2,1.9,1);ctx.restore();
  ctx.restore();
}

function aiming(ctx,cue,balls,opt) {
  const a=opt.angle,dx=Math.cos(a),dy=Math.sin(a);
  let t=Infinity,target=null;
  for(const b of balls) {
    if(!b.n||b.dead)continue;
    const x=b.x-cue.x,y=b.y-cue.y,along=x*dx+y*dy,side=x*dy-y*dx;
    if(along<=0||Math.abs(side)>=2*BALL)continue;
    const entry=along-Math.sqrt((2*BALL)**2-side**2);
    if(entry>=0&&entry<t){t=entry;target=b;}
  }
  const tw=Math.min(dx>0?(WIDTH-BALL-cue.x)/dx:dx<0?(BALL-cue.x)/dx:Infinity,
    dy>0?(HEIGHT-BALL-cue.y)/dy:dy<0?(BALL-cue.y)/dy:Infinity);
  if(tw<t){ t=tw;target=null; }
  if(opt.guide!==false && Number.isFinite(t) && t>0) {
    const x=cue.x+t*dx,y=cue.y+t*dy;
    ctx.save();ctx.setLineDash([6,5]);segment(ctx,cue.x+dx*12,cue.y+dy*12,x,y,'rgba(252,247,213,.59)',1.3);ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(x,y,BALL,0,Math.PI*2);ctx.strokeStyle='rgba(250,247,224,.48)';ctx.lineWidth=1;ctx.stroke();
    if(target) {
      const nx=(target.x-x)/(2*BALL),ny=(target.y-y)/(2*BALL);
      segment(ctx,target.x+nx*12,target.y+ny*12,target.x+nx*48,target.y+ny*48,'rgba(240,204,136,.77)',1.5);
    }
    ctx.restore();
  }
  let p=Number(opt.power)||0;if(p>1)p/=100;
  const tip=-(18+Math.max(0,Math.min(1,p))*20);
  const style=String(opt.cue||'').toLowerCase();
  const shaft=style.includes('carbon')?['#1b2229','#69747f','#232b30']:style.includes('gold')?['#80663c','#f3d390','#a17e41']:style.includes('pro')?['#293d4a','#91a8b4','#465765']:['#956c40','#ead0a5','#a67d50'];
  ctx.save();ctx.translate(cue.x,cue.y);ctx.rotate(a);
  ctx.shadowColor='rgba(0,0,0,.52)';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
  polygon(ctx,[[tip-221,-4.6],[tip,-1.9],[tip,1.9],[tip-221,4.6]],grad(ctx,0,-4,0,5,[[0,shaft[0]],[.33,shaft[1]],[1,shaft[2]]]));
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  polygon(ctx,[[tip-221,-4.6],[tip-159,-3.8],[tip-159,3.8],[tip-221,4.6]],grad(ctx,0,-4,0,5,[[0,'#22292c'],[.38,'#5b5145'],[1,'#1c2124']]));
  for(const x of [tip-161,tip-158,tip-215])segment(ctx,x,-3.9,x,3.9,'#bc9d67',1.5);
  ctx.fillStyle='#e5dfce';ctx.fillRect(tip-5,-1.95,4.1,3.9);
  ctx.fillStyle='#76a5af';ctx.fillRect(tip-.9,-1.85,1.3,3.7);
  ctx.restore();
}

export function draw(canvas,balls,opt={}) {
  const m=metrics(canvas),{cache,dpr}=surface(canvas,opt,m),ctx=canvas.getContext('2d');
  ctx.resetTransform();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(cache.bg,0,0);
  ctx.setTransform(m.scale*dpr,0,0,m.scale*dpr,m.left*dpr,m.top*dpr);
  const cue=balls.find(b=>b.n===0&&!b.dead);
  if(cue && Number.isFinite(opt.angle)) aiming(ctx,cue,balls,opt);
  const now=performance.now();
  for(const b of balls) {
    if(!b.dead) {cache.last.set(b.n,{x:b.x,y:b.y,rot:b.rot,n:b.n});cache.sinking.delete(b.n);ball(ctx,b);continue;}
    const prev=cache.last.get(b.n);
    if(prev && !opt.reducedMotion) {
      const dest=pockets.reduce((best,p)=>Math.hypot(p[0]-prev.x,p[1]-prev.y)<Math.hypot(best[0]-prev.x,best[1]-prev.y)?p:best);
      if(Math.hypot(dest[0]-prev.x,dest[1]-prev.y)<38)cache.sinking.set(b.n,{start:now,prev,dest});
    }
    cache.last.delete(b.n);
    const sink=cache.sinking.get(b.n);
    if(!sink)continue;
    const f=Math.min(1,(now-sink.start)/165);
    if(f===1){cache.sinking.delete(b.n);continue;}
    ball(ctx,{...sink.prev,x:sink.prev.x+(sink.dest[0]-sink.prev.x)*f,y:sink.prev.y+(sink.dest[1]-sink.prev.y)*f},1-f*.95);
  }
  ctx.resetTransform();
}
