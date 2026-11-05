/** Shared wire and domain contracts for TypeScript clients of the ES modules. */
export type Seat = 0 | 1;
export type Group = 'solids' | 'stripes' | null;
export interface Ball {
  n:number; x:number; y:number; vx:number; vy:number;
  sx:number; sy:number; side:number; rot:number; dead:boolean;
}
export interface Shot {
  type:'shot'; seq:number; angle:number; power:number; spinX:number;
  spinY:number; ball:number; pocket:number; safety:boolean;
}
export interface ShotLog {
  first:number[]; rails:number[]; pots:Array<{n:number;p:number}>;
  before:number[]; crossedHead:boolean; firstX:number; off:number[];
}
export interface PlayerStats {
  shots:number; made:number; balls:number; fouls:number; visits:number;
  breakBalls:number; best:number; streak:number;
}
export interface Match {
  id:string; names:[string,string]; turn:Seat; breaker:Seat; balls:Ball[];
  groups:[Group,Group]; breaking:boolean; hand:false|'head'|'any';
  winner:Seat|null; choice:null|{reason:string;options:Array<{id:string;label:string}>};
  seq:number; stats:[PlayerStats,PlayerStats]; started:number; message:string;
  eight:boolean; run:boolean;
}
export interface RoomSession {code:string;key:string;seat:Seat}
export type TableAction = Shot | {type:'place';x:number;y:number;seq:number}
  | {type:'choice';id:string;seq:number} | {type:'spot';ball:number;seq:number};
