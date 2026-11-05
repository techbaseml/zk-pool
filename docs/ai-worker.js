import {plan} from './ai.js';
self.onmessage=({data})=>{try{postMessage({shot:plan(data.game,data.level)})}catch(e){postMessage({error:e.message})}};
