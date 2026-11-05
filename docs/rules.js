// Pure rack adjudication shared by offline and authoritative online matches.
const HEAD = 250, FOOT = 750, CENTER = 250, RADIUS = 11;
export function groupOf(n) {
  if (n >= 1 && n <= 7) return 'solids';
  if (n >= 9 && n <= 15) return 'stripes';
  return null;
}
export function legalTargets(state, before = state.balls.filter(b => !b.dead && b.n).map(b => b.n)) {
  if (state.breaking) return before;
  const group = state.groups[state.turn];
  if (group) {
    const own = before.filter(n => groupOf(n) === group);
    return own.length ? own : before.filter(n => n === 8);
  }
  const available = before.filter(n => groupOf(n));
  if (before.includes(8) && ['solids','stripes'].some(g => !available.some(n => groupOf(n) === g))) available.push(8);
  return available;
}
function spotBall(state, n) {
  const ball = state.balls.find(b => b.n === n);
  const zones = state.balls.filter(b => b.n !== n && !b.dead).map(b => {
    const clearance = 2 * RADIUS + (b.n === 0 ? .05 : .001);
    const dx = Math.sqrt(Math.max(0, clearance ** 2 - (b.y - CENTER) ** 2));
    return [b.x - dx, b.x + dx];
  });
  function nearest(sign) {
    let x = FOOT;
    for (const [a,b] of [...zones].sort((u,v) => sign > 0 ? u[0]-v[0] : v[1]-u[1])) {
      if (x > a && x < b) x = sign > 0 ? b : a;
    }
    return x;
  }
  let x = nearest(1);
  if (x > 1000 - RADIUS) x = nearest(-1);
  Object.assign(ball,{x,y:CENTER,dead:false,vx:0,vy:0});
}
// Optional WPA 1.6 remedy when all legal first contacts are behind the string.
export function headSpotOptions(state) {
  if (state.hand !== 'head' || state.breaking || state.choice || state.winner != null) return [];
  const numbers = legalTargets(state);
  const targets = state.balls.filter(b => numbers.includes(b.n) && !b.dead);
  if (!targets.length || targets.some(b => b.x >= HEAD)) return [];
  const nearest = Math.max(...targets.map(b => b.x));
  return targets.filter(b => Math.abs(b.x-nearest) < 1e-6).map(b => b.n);
}
export function spotHeadTarget(state, n) {
  if (!headSpotOptions(state).includes(n)) throw Error('Unavailable head-string spot');
  spotBall(state,n);
}
const actions = {
  accept:'Accept table', hand:'Take cue ball behind head string', spot:'Spot 8-ball and play',
  spotHand:'Spot 8-ball and take cue ball in hand', rerack:'Re-rack and break', returnBreak:'Have opponent re-break'
};
function decision(state, reason, ids) {
  state.message = reason;
  state.choice = {reason, options:ids.map(id => ({id,label:actions[id]}))};
}
export function chooseBreak(state,id,rackFn) {
  if (!state.choice?.options.some(o => o.id === id)) throw Error('Unavailable break option');
  if (id === 'rerack' || id === 'returnBreak') {
    state.balls = rackFn();
    if (id === 'returnBreak') state.turn = 1-state.turn;
    state.breaking = true;
    state.groups = [null,null];
    state.hand = 'head';
  } else {
    if (id === 'spot' || id === 'spotHand') spotBall(state,8);
    state.hand = id === 'hand' || id === 'spotHand' ? 'head' : false;
  }
  state.choice = null;
  state.message = state.breaking ? 'New rack. Take the break.' : state.hand ? 'Place the cue ball behind the head string.' : 'Table open. Call a ball and pocket.';
  return state;
}
function resolveBreak(state, log, scratch, off) {
  state.breaking = false;
  const pots = log.pots.filter(b => b.n);
  const eight = pots.some(b => b.n === 8);
  const rails = new Set(log.rails.filter(n => n > 0)).size;
  const shortBreak = !pots.length && rails < 4;
  const foul = scratch || off.length > 0 || shortBreak;
  const continued = !foul && pots.length > 0;
  if (!continued) state.turn = 1 - state.turn;
  if (eight) {
    decision(state, foul ? 'Eight on a foul break.' : 'Eight on the break.', [foul ? 'spotHand' : 'spot','rerack']);
  } else if (off.length || scratch) {
    if (off.includes(8)) spotBall(state,8);
    // After a scratch there is no resting cue ball to accept.
    if (scratch && !shortBreak) {
      state.hand = 'head';
      state.message = 'Break scratch. Cue ball in hand behind the head string.';
    } else if (scratch) {
      decision(state,'Scratch on an insufficient break.',['hand','rerack','returnBreak']);
    } else {
      decision(state,'A ball left the table on the break.',['accept','hand']);
    }
  } else if (shortBreak) {
    decision(state,'Illegal break. Fewer than four object balls reached a rail.',['accept','rerack','returnBreak']);
  } else {
    state.message = continued ? 'Legal break. Shoot again on the open table.' : 'Dry break. Open table passes to the opponent.';
  }
  return {foul,continued,won:false,eight,made:continued};
}
export function resolve(state,log,shot) {
  if (state.winner != null || state.choice) throw Error('Cannot resolve a shot in this rack state');
  const wasHeadRestricted = state.hand === 'head' || shot.headRestricted;
  const off = log.off || [];
  const scratch = off.includes(0) || log.pots.some(b => b.n === 0);
  state.hand = false;
  if (state.breaking) return resolveBreak(state,log,scratch,off);
  const legal = legalTargets(state, log.before);
  const open = !state.groups[state.turn];
  const temporaryClaim = open && shot.ball === 8 && legal.includes(8) && !shot.safety;
  const rightFirst = log.first.some(n => (temporaryClaim ? n === 8 : n === 8 && open ? false : legal.includes(n)));
  const headViolation = wasHeadRestricted && log.firstX < HEAD && !log.crossedHead;
  let reason = '';
  if (scratch) reason = 'Cue-ball scratch';
  else if (off.length) reason = 'Ball driven off table';
  else if (!log.first.length) reason = 'No object-ball contact';
  else if (!rightFirst) reason = 'Wrong first contact';
  else if (headViolation) reason = 'Illegal contact behind the head string';
  else if (!log.rails.length && !log.pots.length) reason = 'No rail after contact';
  const foul = Boolean(reason);
  const called = !shot.safety && legal.includes(shot.ball) && log.pots.some(b => b.n === shot.ball && b.p === shot.pocket);
  const made = called && !foul;
  const eight = off.includes(8) || log.pots.some(b => b.n === 8);
  const won = eight && made && shot.ball === 8 && !off.includes(8);
  if (eight) {
    state.winner = won ? state.turn : 1-state.turn;
    state.message = won ? 'Called eight. Rack won.' : (reason ? reason + ' on the eight.' : 'Eight down before clearance or outside its call.');
  } else if (foul) {
    state.turn = 1-state.turn;
    state.hand = 'any';
    state.message = reason + '. Opponent has ball in hand.';
  } else if (made) {
    if (open) {
      state.groups[state.turn] = groupOf(shot.ball);
      state.groups[1-state.turn] = groupOf(shot.ball) === 'solids' ? 'stripes' : 'solids';
    }
    state.message = 'Called shot made. Continue with ' + state.groups[state.turn] + '.';
  } else {
    state.turn = 1-state.turn;
    state.message = shot.safety ? 'Safety played. Turn passes.' : 'Turn passes.';
  }
  return {foul,continued:!eight && made,won,eight,made};
}
