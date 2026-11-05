// Table units are proportional to a 2:1 playing surface. Fixed 240 Hz solver.
export const W=1000,H=500,R=11,DT=1/240;
export const pockets=[[0,0],[500,-5],[1000,0],[0,500],[500,505],[1000,500]];
const jaws=[[29,0],[477,0],[523,0],[971,0],[29,500],[477,500],[523,500],[971,500],[0,29],[0,471],[1000,29],[1000,471]];
export function ball(n,x,y){return {n,x,y,vx:0,vy:0,sx:0,sy:0,side:0,rot:0,dead:false}}
function shuffled(items){for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]]}return items}
export function rack(){
 const solids=shuffled([1,2,3,4,5,6,7]),stripes=shuffled([9,10,11,12,13,14,15]);
 const corners=shuffled([solids.pop(),stripes.pop()]),rest=shuffled([...solids,...stripes]),balls=[ball(0,235,250)];
 for(let i=0;i<5;i++)for(let j=0;j<=i;j++){
 const n=i===2&&j===1?8:i===4&&(j===0||j===4)?corners.pop():rest.pop();
 balls.push(ball(n,750+i*(Math.sqrt(3)*R+0.04),250+(j-i/2)*(2*R+.04)))}
 return balls.sort((a,b)=>a.n-b.n)
}
export function canPlace(balls,x,y,head=false){
 return Number.isFinite(x)&&Number.isFinite(y)&&x>=R&&x<=W-R&&y>=R&&y<=H-R&&(!head||x<250)&&
 !pockets.some(([px,py])=>Math.hypot(x-px,y-py)<28)&&!balls.some(b=>b.n&&!b.dead&&Math.hypot(b.x-x,b.y-y)<2*R+.02)
}
export function place(balls,x,y,head=false){if(!canPlace(balls,x,y,head))return false;Object.assign(balls.find(b=>!b.n),ball(0,x,y));return true}
export function autoPlace(balls,head){for(let x=230;x>=20;x-=24)for(let i=0;i<19;i++){let y=250+(i%2?1:-1)*Math.ceil(i/2)*24;if(place(balls,x,y,head))return true}return false}
export function strike(balls,s){
 const c=balls.find(b=>!b.n),v=95+s.power*1620,dx=Math.cos(s.angle),dy=Math.sin(s.angle);
 c.vx=v*dx;c.vy=v*dy;c.sx=v*dx*(s.spinY||0)*1.45;c.sy=v*dy*(s.spinY||0)*1.45;c.side=v*(s.spinX||0)*.82;
 return {first:[],rails:[],pots:[],before:balls.filter(b=>b.n&&!b.dead).map(b=>b.n),crossedHead:c.x>=250,firstX:0,off:[]}
}
function rebound(b,nx,ny){
 const vn=b.vx*nx+b.vy*ny;if(vn>=0)return false;
 const tangent=b.vx*(-ny)+b.vy*nx,grip=Math.max(-Math.abs(vn)*.18,Math.min(Math.abs(vn)*.18,(b.side-tangent)*.14));
 b.vx-=1.83*vn*nx+grip*ny;b.vy-=1.83*vn*ny-grip*nx;b.side-=grip*1.5;return true
}
export function step(balls,log,emit){
 let active=false,firstThisTick=!log.first.length;
 function rail(b,nx,ny){if(rebound(b,nx,ny)){if(log.first.length&&!log.rails.includes(b.n))log.rails.push(b.n);emit?.('rail',Math.hypot(b.vx,b.vy))}}
 for(const b of balls){if(b.dead)continue;
 b.x+=b.vx*DT;b.y+=b.vy*DT;
 if(!b.n&&!log.first.length&&b.x>=250)log.crossedHead=true;
 const pocket=pockets.findIndex(([x,y])=>Math.hypot(b.x-x,b.y-y)<23);
 if(pocket>=0){b.dead=true;b.vx=b.vy=b.sx=b.sy=b.side=0;log.pots.push({n:b.n,p:pocket});emit?.(b.n?'pocket':'scratch',500);continue}
 if(b.y<R&&((b.x>=29&&b.x<=477)||(b.x>=523&&b.x<=971))){b.y=R;rail(b,0,1)}
 if(b.y>H-R&&((b.x>=29&&b.x<=477)||(b.x>=523&&b.x<=971))){b.y=H-R;rail(b,0,-1)}
 if(b.y>=29&&b.y<=471){if(b.x<R){b.x=R;rail(b,1,0)}if(b.x>W-R){b.x=W-R;rail(b,-1,0)}}
 for(const [x,y] of jaws){let dx=b.x-x,dy=b.y-y,d=Math.hypot(dx,dy);if(d>0&&d<R){dx/=d;dy/=d;b.x=x+dx*R;b.y=y+dy*R;rail(b,dx,dy)}}
 if(b.x< -20||b.x>1020||b.y< -20||b.y>520){b.dead=true;log.off.push(b.n);continue}
 }
 for(let i=0;i<balls.length;i++){const a=balls[i];if(a.dead)continue;
 for(let j=i+1;j<balls.length;j++){const b=balls[j];if(b.dead)continue;
 let dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)>=2*R||Math.abs(dy)>=2*R)continue;
 let d=Math.hypot(dx,dy);if(d>=2*R||d<.00001)continue;dx/=d;dy/=d;
 const push=(2*R-d)/2+.00001;a.x-=push*dx;a.y-=push*dy;b.x+=push*dx;b.y+=push*dy;
 const closing=(a.vx-b.vx)*dx+(a.vy-b.vy)*dy;if(closing<=0)continue;
 const imp=closing*.983, tang=Math.max(-imp*.035,Math.min(imp*.035,((a.vy-b.vy)*dx-(a.vx-b.vx)*dy+a.side+b.side)*.05));
 a.vx-=imp*dx-tang*dy;a.vy-=imp*dy+tang*dx;b.vx+=imp*dx-tang*dy;b.vy+=imp*dy+tang*dx;a.side-=tang;b.side-=tang;
 if(firstThisTick&&(a.n===0||b.n===0)){const num=a.n||b.n;if(!log.first.includes(num))log.first.push(num);log.firstX=(a.n?a:b).x}
 emit?.('collision',closing)
 }}
 for(const b of balls){if(b.dead)continue;
 // Horizontal rotational velocity at the contact patch. Cloth friction couples sliding and rolling.
 const dx=b.sx-b.vx,dy=b.sy-b.vy,slip=Math.hypot(dx,dy),drag=Math.min(slip/3.5,820*DT);
 if(slip>.0001){const fx=drag*dx/slip,fy=drag*dy/slip;b.vx+=fx;b.vy+=fy;b.sx-=2.5*fx;b.sy-=2.5*fy}
 const speed=Math.hypot(b.vx,b.vy),k=speed?Math.max(0,1-(50+.042*speed)*DT/speed):0;
 b.vx*=k;b.vy*=k;if(slip<5){b.sx=b.vx;b.sy=b.vy}b.side*=.997;b.rot+=speed*DT/R;
 if(speed<1&&slip<4){b.vx=b.vy=b.sx=b.sy=b.side=0}else active=true
 }return active
}
