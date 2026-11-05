# ZK POOL rack rules

The reference is the [WPA Rules of Play, sections 1, 3 and 4](https://www.wpapool.com/wp-content/uploads/2026/01/2026.01.02-WPA-Rules.pdf). This digital adaptation uses a level cue and explicit ball-and-pocket calls, including for straightforward shots. A scratch removes the cue ball until placement. Physical attendance, lag adjudication, apparatus fouls and referee discretion belong to tournament administration.

| Situation | ZK POOL decision |
| --- | --- |
| Break | A pot retains the visit. Without a pot, four distinct object balls must reach cushions. Groups stay open. |
| Short break | The opponent accepts the layout, breaks a new rack, or gives the breaker another attempt. |
| Eight potted on break | The breaker chooses spotting or a new break. A foul gives that decision to the opponent and restricts placement behind the head string when spotting. |
| Open table | A legal called pot assigns groups. An open-table eight call temporarily claims a fully cleared group. |
| Safety | Potted object balls stay down and the visit ends. |
| Foul | After the break, the opponent places the cue ball anywhere legal. Unresolved split contacts favor a legal target. |
| Eight | Clearance is evaluated before the stroke. An early, scratched, uncalled or off-table eight loses. |
| Head-string relief | When all legal targets lie behind the string, the closest may be spotted. Tied candidates are selectable. |

An object ball leaving on the break stays down, apart from the eight which is spotted. The incoming player may accept the layout or take head-string placement. A legal-density break scratch automatically grants head-string placement since the cue ball has no resting position. A scratch on an insufficient break allows head-string placement or either re-break option. A shot beginning with restricted placement must cross the head string before first striking a ball behind it.

The table model measures 1000 by 500 units. The head string crosses x = 250. The foot spot is (750, 250). The resolver receives a settled shot log and never infers first contact or pocket order from the drawing. The game’s level-cue simulation does not generate airborne jump shots. Off-table entries can be adjudicated if a simulator supplies them.
