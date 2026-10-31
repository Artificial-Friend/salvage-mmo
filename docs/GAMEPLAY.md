# Gameplay plan

What has been agreed for the game's depth, in build order. Each step is one or more pull requests; it lands in the milestone named next to it (see `ROADMAP.md`). Earlier steps are what later ones stand on.

Rules for every step (from `CLAUDE.md`): physics is real in its rules and compressed in scale; limits come from world rules (mass, heat, signature, fuel), never arbitrary game rules; every threat warns before it acts; the world has no timers — it exists forever.

## Steps

### 1. Finite fuel and mass · M4
- Propellant is a finite budget carried from the hub; every burn spends delta-v by the rocket equation.
- Salvage has mass. Cargo, fitted parts and hauled sections all make the ship heavier, so the same burn moves it less and costs more.
- A full hold means a slow, expensive trip home: what you take is a choice about how you get back.
- No added speed or "yank" difficulty to salvage itself — the challenge is the trip, not the cut.

### 2. You only know what your sensors see · M4
- Contacts, wrecks and threats exist on the map only when a sensor has seen them: IR, radar, visual, each with its own range and signature rules.
- What you saw ages. Old contacts drift on their last known orbit and fade in confidence.
- Better sensors are salvaged and fitted like any other part.

### 3. Celestial mechanics place the loot · M4
- Wrecks settle where orbits put them: Lagrange points collect debris, radiation belts hide (and damage) rich hulks, the ring plane is crowded and dangerous.
- Reading the system's mechanics is how you find good salvage.

### 4. The base · M4
- A persistent base, saved with the player: hangar, storage, workshop, dock.
- Salvage brought home stays there; the base is where ships are fitted, studied and restored.
- Save shape changes go through a migration (`salvage.save.v3` → next).

### 5. Jump geography · M4
- The system is a map of zones connected by jumps; the jump drive burns rare fuel.
- Distance, fuel and mass decide where a ship can reach and still come back.
- Risk tiers follow geography: the deeper the zone, the costlier the trip home.

### 6. Megawrecks that change permanently · M4
- Capital-scale wrecks (like the Halvard) that are never reset: every cut, every section taken, every breach stays for everyone.
- The world's biggest hulks wear the history of everything players have done to them.

### 7. Learning by tearing parts apart · M5
- Reverse engineering: taking a navy's parts apart at the base teaches its technology.
- Mount adapters: fitting a part from another navy needs an adapter; mismatched parts cost efficiency until the technology is understood.

### 8. Ships designed by physics · M5
- A "Frankenstein" ship editor: assemble a ship from salvaged hull sections and parts.
- Nothing is allowed or forbidden by a rule list — mass, thrust, centre of mass, heat, power and signature decide whether the design flies well, badly, or not at all.
- Every design must still pass `shipClearance()`.

### 9. The machine swarm · M4
- An AI swarm salvages the same wrecks players do and builds its own ships from what it takes.
- Swarm ships are visibly made of what they ate; what the swarm salvages is gone from the world.
- Drones stir before they wake (existing warning rule).

### 10. Restoring ships · M5
- Every wreck was a working ship (models already have both states). A salvager can claim a hulk, survey what it lacks, bring the right parts and make it fly again.
- A restored ship keeps its name, its navy, its scars and its layout — no two are the same, because no two wrecks are the same.
- Loot runs get a purpose: hunting the specific parts a project needs.
- Capital ships can be restored only with a group, many hauls and a base dock.
- A restored ship that is lost becomes a wreck in the world again.

### 11. Big salvage takes more than one ship · M2–M3
- Some prizes are too massive for one hull: several ships tether, burn together and haul as one.
- Group restorations (step 10) and megawreck sections (step 6) are built on this.

### 12. Your death becomes someone's find · M2
- A lost player ship becomes a persistent derelict with its fitted parts, its logs and its crew pod.
- Another player can find it, strip it, recover the pod — or restore the ship (step 10).

### 13. Players can become Reavers · M3
- A salvager who attacks other players crosses the line: no hub, no market, no hangar — they live in the field.
- Reavers grow by welding their victims' parts onto their hulls; mass, heat, signature and jump cost limit how far that can go.
- Killing a Reaver drops everything it took — a prize worth a group hunt.
- Before multiplayer, the machine swarm (step 9) supplies Reaver-like ships.
- Griefing is limited by world rules, not game rules.

## Open question
The bigger reason to keep playing — a goal beyond the loop of salvage, build, lose, restore — is not decided yet. It must not be forward progression, must not be a timer, must not be philosophy, must fit a small world, and must not punish players for being offline or at their base.

## Not doing
Faster or harder-to-catch salvage ("yank dances"); hot reactors on broken ships; timers of any kind; part history; frontier/"forward" purpose; scarcity as theme. Debris (questionable) and combat depth are deferred, not rejected.
