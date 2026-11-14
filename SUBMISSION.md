# Submission drafts

Copy each block into the matching field of the Space Apps project form. Replace the bracketed parts.

## Project name

Body in Space

## High-level summary (under 150 words)

Halfway to Mars, a medical question takes 14 minutes to reach Earth and the earliest answer is 29 minutes away. Body in Space is a tablet "onboard doctor" for that gap. Crew members tap a body map to see the state of each body system, how to measure it in microgravity, why it matters in space and what to do now. Our Space-NEWS2 method combines the clinical NEWS2 early warning score with each astronaut's personal 7-day baseline and the mission environment, so slow drift is caught before the official score moves. In an emergency the SOS guide gives one instruction at a time, runs a CPR metronome and shows the countdown to Earth's earliest reply. KOMEK, an offline SI assistant, warns, reminds and explains from checked sources only. The same tool serves remote clinics on Earth where a doctor is hours away.

## Link to project demo

[link to the 30-second video]

## Link to final project

https://tuka2308.github.io/body-in-space/
Source code: https://github.com/Tuka2308/body-in-space

## Detailed project description

**What it does.** Body in Space lets an astronaut with no medical training assess their own health and act on it without waiting for Earth.

- An interactive body map shows nine zones (brain and mind, eyes, heart, lungs, blood, bones and muscles, temperature, cabin air, radiation). Status is always given by colour, shape and word.
- Each zone answers the three questions asked by the challenge author: how to measure it, why it is important, what to do when the value is abnormal. Steps are written for microgravity; every fact carries its source.
- Measurements are entered with large steppers suited to gloved hands, and four checks run on the tablet itself: a reaction test, a vision grid for SANS screening, a breath counter and a private PHQ-9 mood check.
- The SOS guide starts with one question, "Is the crewmate responsive?", then leads through a chest-pain branch or a cardiac-arrest branch with a CPR metronome (110 per minute, 30:2, AED reminder, stop criteria). A panel shows when the message reaches Earth and when the earliest reply can arrive. An incident report is written automatically and queued for Earth.
- KOMEK ("help" in Kazakh) is a small onboard SI assistant. It warns when a status changes, reminds about due measurements, and answers questions from a fixed knowledge base. It never diagnoses or prescribes; unknown questions are logged for the flight surgeon.
- Mission presets (ISS, Moon, Mars transit, Mars surface, remote clinic on Earth) change the link delay, evacuation options, gravity and radiation dose rate.

**How it works: Space-NEWS2.** This is our own method. (1) The official NEWS2 score is calculated exactly as published and never altered. (2) Every vital sign is compared with the crew member's own 7-day mean; a 20% drift in heart rate is flagged even when NEWS2 is 0. (3) Known in-flight shifts, such as a resting core temperature about 1 °C higher, are explained next to the score, and the environment decides who can help and how fast. The engine is unit-tested on every boundary value.

**Benefits.** It supports NASA's Earth-Independent Medical Operations concept: the crew acts first and reports after. On Earth the same offline tool fits remote villages, shift camps and polar stations where the nearest doctor is hours away.

**Honest limits.** Vital signs are simulated because open NASA data has none; lab data and space weather are real. No physician has reviewed the content; it is an educational prototype, not a medical device.

**Tools.** TypeScript, React, Vite, Tailwind CSS, Zustand, Vitest, Web Audio and Web Speech APIs, GitHub Pages. No backend: everything works offline in the browser.

## NASA data

- **NASA Human Research Program** (five hazards, human health risks): the basis for the body zones and the "why it matters in space" facts.
- **NASA Open Science Data Repository**: OSD-569 (Inspiration4 complete blood count) and OSD-575 (Inspiration4 metabolic panel) are loaded as published and charted for four crew members from 92 days before launch to 194 days after return. OSD-656 (urine inflammation panel of the same crew) is related data that this version does not use yet.
- **NASA DONKI**: live solar flares and coronal mass ejections drive the radiation zone and KOMEK's storm-shelter warning; the last result is cached for offline use.
- **NASA-STD-3001** (OCHMO technical briefs): cabin CO2 limits (3 mmHg 1-hour, 2.5 mmHg 7-day), radiation limits (250 mSv per event, 600 mSv career), sleep and nutrition figures.
- **NASA communication-delay study for crewed Mars missions** and the **Earth-Independent Medical Operations** concept: the Earth-link delays and the overall design.
- **Public ISS Medical Checklist (2016)**: structure of the SOS guide (CPR with AED, restraint, stop criteria).

## Space agency partner data

- **Canadian Space Agency, Bio-Monitor**: the set of parameters for our simulated wearable feed (heart rate, blood pressure, breathing rate, SpO2).
- **European Space Agency / IBMP, Mars-500**: sleep and isolation findings used in the brain and mind zone.
- **Brazilian research, PUCRS MicroG Centre**: the Evetts-Russomano CPR method for microgravity, referenced in the SOS guide.

## References

See REFERENCES.md in the repository: https://github.com/Tuka2308/body-in-space/blob/main/REFERENCES.md

## Use of Super Intelligence (SI)

We used an SI coding assistant (Claude, by Anthropic) to write the application code, unit tests, interface texts and SVG graphics under our direction; we chose the idea, features and sources and tested the result. SI tools also assisted our background research, and the figures were traced to the linked sources. The project contains no SI-generated photos, videos, audio or likenesses of people. KOMEK, the assistant inside the app, is rule-based with a fixed knowledge base and is not a neural network. The demo video is a screen recording with text captions.

---

## Before you submit: things a human must check

1. Read every measuring step and every "what to do" action in `src/data/content.ts` and `src/data/sos.ts`. No physician has reviewed them.
2. Values marked `TODO: verify` in the code (search for it): the "3 short nights" rule, baseline thresholds other than heart rate, the 5-minute re-check interval, ISS and Mars-surface dose rates, the shelter rule for solar events, exercise reminder share.
3. Kit colours and drug names in the SOS guide come from the 2016 public checklist and may be outdated.
4. Open the live link in a private window and run the demo once (`?fresh=1`, key `D`, SOS).
5. The video must be 30 seconds or less, in English, with no faces or voices of team members.
6. Confirm the team name, members and the video link in the form.
