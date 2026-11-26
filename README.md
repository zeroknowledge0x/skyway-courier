# Ridge Runner

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/zeroknowledge0x/skyway-courier/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/zeroknowledge0x/skyway-courier/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

An original valley flight game in plain static files, drawn entirely with canvas code and the
game's own palette. Fly a courier plane through a river valley carved between two ridgelines. Three missions share one aircraft: fly five amber rings, bring the
plane onto the runway slow and aligned, or follow six checkpoints down the canyon. Fuel and
airframe damage turn each sortie into a decision, and the camera, gauges and HUD are drawn by the
game's own code.

## Run it

```sh
node serve.ts                 # game/ at http://localhost:8080
node --experimental-strip-types main.ts   # writes /output/dossier.json
```

Arrows or WASD bank and pitch, Shift and Ctrl change throttle, Space is the airbrake; the mouse
steers and a click releases the brake. Space or Enter launches and restarts. Add `?mission=0|1|2`
to start on a chosen route, and `?shot=brief|rings|runway|canyon&seed=7` for a frozen render.

---

<sub>Entered on [make.fun](https://make.fun/?ref=4zn28et0&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
