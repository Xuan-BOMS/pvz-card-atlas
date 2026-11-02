# PvZ TV Card Atlas

Static Chinese card encyclopedia for PvZ TV 3215. It includes the supplied full-card images, a plant statistics catalog, and a zombie directory. It does not display win rates or match statistics.

Open `index.html` directly, or serve this folder with `python -m http.server 8000` for local testing. Pushes to `main` publish through GitHub Pages.

Plant card IDs, sun costs, cooldowns, attack intervals, and projectile damage are based on the [PlantsVsZombies-AndroidTV source](https://github.com/ZombieYetis/PlantsVsZombies-AndroidTV). Card names are cross-checked against the [PvZ-TV-Server seed-name map](https://github.com/ZombieYetis/PvZ-TV-Server). Images are copied from the user-provided `v3215全卡图` folder.

Plant DPS is shown as actual damage per second plus a Peashooter-relative value (`1 pea = Peashooter DPS`). It is calculated from damage per attack cycle and the cycle interval; probabilistic or form-dependent attacks show an expected value or range.
