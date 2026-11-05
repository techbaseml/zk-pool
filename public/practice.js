import {rack,ball} from './physics.js';
export const drills={
 'Free table':null,'Straight pot':[[0,500,300],[1,500,120]],'Position play':[[0,230,330],[2,475,120],[3,750,320]],'Draw and follow':[[0,500,280],[4,500,160]],'Bank shot':[[0,220,365],[5,570,190]],'Combination':[[0,500,350],[3,500,220],[7,500,85]],'Break practice':null,'Eight-ball finish':[[0,755,315],[8,900,432]]
};
export function setupDrill(label){return drills[label]?.map(a=>ball(...a))||rack()}
export const drillHints={
 'Free table':'Aim anywhere and experiment. Place the cue between shots.',
 'Straight pot':'Call the line from the cue through the 1 into the upper middle pocket.',
 'Position play':'Pot the 2 and leave the cue within 150 units of table center.',
 'Draw and follow':'Pot the 4 with backspin and draw the cue back past its starting line.',
 'Bank shot':'Send the 5 into a cushion before it drops.',
 'Combination':'Strike the 3 first and pocket the 7 on the same shot.',
 'Break practice':'Pocket a ball or send four different object balls to cushions.',
 'Eight-ball finish':'Finish with the 8 in the lower right pocket.'
};
export function assess(label,balls,log,shot){
 const live=balls.find(b=>!b.n),pots=log.pots.filter(b=>b.n),down=n=>pots.some(b=>b.n===n);
 if(log.pots.some(b=>b.n===0))return 'Scratch. Place the cue and try again.';
 let done=false;
 switch(label){
 case 'Straight pot':done=pots.some(b=>b.n===1&&b.p===1);break;
 case 'Position play':done=down(2)&&Math.hypot(live.x-500,live.y-250)<150;break;
 case 'Draw and follow':done=down(4)&&shot.spinY<0&&live.y>280;break;
 case 'Bank shot':done=down(5)&&log.rails.includes(5);break;
 case 'Combination':done=log.first.includes(3)&&down(7);break;
 case 'Break practice':done=pots.length>0||log.rails.filter(n=>n).length>=4;break;
 case 'Eight-ball finish':done=pots.some(b=>b.n===8&&b.p===5);break;
 default:return pots.length+' pocketed. Continue or reset the table.'
 }
 return done?'Drill complete. Reset to repeat it.':'Try again. '+drillHints[label]
}
