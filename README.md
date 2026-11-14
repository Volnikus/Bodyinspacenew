# Body in Space

**Your onboard doctor when Earth can't answer.**

A tablet health monitor for deep-space crews, built for the NASA Space Apps Challenge 2026 challenge
*Create Health Monitoring Software for Astronauts on Space Missions*.

Live demo: https://tuka2308.github.io/body-in-space/ (add `?fresh=1` to start from the untouched demo state)

> Educational prototype. Not a medical device. Vital signs are simulated.

## What it does

Halfway to Mars a question to a flight surgeon takes about 14 minutes to arrive and the earliest answer is about 29 minutes away. The app is built around that fact: it guides the crew first and reports to Earth afterwards.

- **Title screen.** One fact first: halfway to Mars, Earth's answer is 29 minutes away.
- **Body map.** A tappable figure with a zone for brain and mind, eyes, heart, lungs, blood, bones and muscles, temperature, plus cabin air and radiation around it. Every status has a colour, a shape and a word.
- **How / why / what to do.** Each zone shows how to measure it in microgravity, why it matters in space (every number with its source) and what to do for the current status.
- **Space-NEWS2.** Our scoring method, described below.
- **SOS guide.** One question ("Is the crewmate responsive?"), then one large instruction at a time. CPR metronome at 110 per minute with a 30:2 counter, AED reminder, stop criteria, and an Earth-link panel that counts down to the earliest possible reply. It ends with an automatic incident report.
- **KOMEK, the onboard SI assistant.** A small pixel-art robot that waits behind a ledge and climbs out when it has something to say. Rule-based and fully offline. It warns when a status gets worse, reminds about due measurements and answers questions only from the project's checked knowledge base. It does not diagnose or prescribe; unknown questions are logged for the flight surgeon.
- **Self-tests on the tablet.** Reaction test, vision grid (SANS screening), breath counter, private PHQ-9 mood check.
- **Real NASA lab data.** Inspiration4 blood counts and metabolic panel before and after flight (NASA OSDR OSD-569 and OSD-575).
- **Live space weather.** Coronal mass ejections and solar flares from NASA DONKI, cached for offline use. A strong event makes KOMEK say "Solar event detected — go to storm shelter".
- **Mission environments.** ISS, Moon, Mars transit, Mars surface and a "Remote clinic on Earth" preset. They change the link delay, evacuation, gravity and dose rate.
- **Daily health missions.** Who has done which routine today, with streaks.
- **Earth view.** Spacecraft and flight surgeon side by side: the Earth side shows only what the signal has had time to deliver.
- **Works offline.** After the first visit the app is cached by a service worker and can be installed on a tablet.

## Space-NEWS2

Space-NEWS2 is this team's own method. It has three layers:

1. **Official NEWS2** (Royal College of Physicians, SpO2 scale 1). The score is never modified.
2. **Personal baseline.** Every vital sign is compared with that crew member's own mean over the last 7 days. A heart rate 20% away from baseline is flagged even when NEWS2 is still 0, and lifts "low risk" to "check". Space shifts what is normal for each person, so population thresholds alone miss slow drift.
3. **Space and environment context.** Known in-flight shifts (resting core temperature about +1 °C, heart rate about +3 bpm, about 6 h of sleep) are explained beside the score instead of silently changing it. The mission environment sets who can help and how fast.

The code is in `src/engine/` and is covered by unit tests on every NEWS2 boundary value (`npm test`).

## NASA and partner data

| Source | Use in the app |
|---|---|
| NASA Human Research Program, hazards and risks | Zone content and "why it matters" facts |
| NASA-STD-3001 (OCHMO technical briefs) | Cabin CO2 limits, radiation limits, sleep, nutrition |
| NASA OSDR OSD-569 | Inspiration4 complete blood count, charted in "NASA data" |
| NASA OSDR OSD-575 | Inspiration4 metabolic panel, charted in "NASA data" |
| NASA OSDR OSD-656 | Inspiration4 urine inflammation panel: identified as related data, not used in this version |
| NASA DONKI | Live solar flares and CMEs in the Radiation zone |
| NASA communication-delay study, EIMO concept | Earth-link delays and the "act first, report after" design |
| Public ISS Medical Checklist (2016) | Structure of the SOS guide |
| CSA Bio-Monitor | Set of parameters for the simulated wearable feed |
| ESA / IBMP Mars-500 | Sleep and isolation facts |
| PUCRS MicroG Centre (Brazil) | Evetts-Russomano CPR method in the SOS guide |

Full list with links: [REFERENCES.md](REFERENCES.md).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 88 unit tests
npm run build    # static site in dist/
```

Demo keys: `D` starts a crew member's deterioration, `T` switches demo time ×60, `Shift+R` resets everything.

## Architecture

Static single-page app, no backend. Vite, React, TypeScript, Tailwind CSS, Zustand.

```
src/engine/   Space-NEWS2: NEWS2, personal baseline, other thresholds (tested)
src/data/     thresholds, zone content, sources, crew, environments, SOS steps
src/sim/      seeded simulator of four fictional crew members
src/si/       KOMEK knowledge base, search and replies (tested)
src/state/    stores, selectors, hash router, NASA DONKI client
src/ui/       screens and the SVG body map
public/data/  NASA OSDR CSV files, unmodified
```

Everything is stored in the browser (localStorage). Medical thresholds and texts are isolated in `src/data/thresholds.ts` and `src/data/content.ts` so they are easy to review.

## Limitations

- No physician has reviewed the content. Measuring steps and "what to do" actions are a team-designed training flow built from the cited sources.
- Vital signs are synthetic: open NASA data has no astronaut vital signs. Fictional crew, deterministic seed.
- NASA has no published in-flight thresholds for vital signs; a flight surgeon decides. Values the team had to choose are marked "reference value" in the UI and `TODO: verify` in the code.
- The public 2016 ISS checklist may be outdated and has no step-by-step chest-pain procedure. Drug names are shown only to locate them in the kit.
- Partial-gravity bone loss has no human data; the microgravity rate is shown as an upper-bound reference.
- The "Remote clinic" preset uses illustrative figures.
- The NASA DONKI demo key is rate-limited; when it is unavailable the last saved events are shown with their date.

## Use of Super Intelligence (SI)

The code, texts and SVG graphics were written with the help of an SI coding assistant (Claude, by Anthropic) under the team's direction. There are no SI-generated photos, videos or voices of people. Details: [REFERENCES.md](REFERENCES.md).
