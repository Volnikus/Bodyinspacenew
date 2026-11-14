# References

## NASA data and resources

- NASA Human Research Program, the five hazards of human spaceflight — https://www.nasa.gov/hrp/hazards/
- NASA Human Research Program, human health risks — https://www.nasa.gov/hrp/risks/
- NASA Open Science Data Repository (OSDR) — https://osdr.nasa.gov
  - OSD-569, Inspiration4 complete blood count (`LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv`) — https://osdr.nasa.gov/bio/repo/data/studies/OSD-569
  - OSD-575, Inspiration4 comprehensive metabolic panel (`LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv`) — https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
  - OSD-656, Inspiration4 urine inflammation panel (related data, not used in this version) — https://osdr.nasa.gov/bio/repo/data/studies/OSD-656
- NASA DONKI, Space Weather Database Of Notifications, Knowledge, Information (via https://api.nasa.gov, public demo key)
- NASA-STD-3001, OCHMO-TB-004 Carbon Dioxide — https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/
- NASA-STD-3001, OCHMO Radiation Protection technical brief — https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf
- NASA-STD-3001, OCHMO Sleep Accommodations technical brief — https://www.nasa.gov/wp-content/uploads/2023/03/sleep-accomodations-technical-brief-ochmo.pdf
- NASA-STD-3001, OCHMO-TB-013 Food and Nutrition — https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-013-food-and-nutrition.pdf
- NASA-STD-3001, Medical Operations — https://www.nasa.gov/reference/6-0-medical-operations/
- NASA, Spaceflight Associated Neuro-ocular Syndrome overview (2023) — https://ntrs.nasa.gov/citations/20230006218
- NASA, Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions (2022) — https://ntrs.nasa.gov/citations/20220013418
- NASA, Earth-Independent Medical Operations concept of operations (2024) — https://ntrs.nasa.gov/citations/20240001402
- NASA Curiosity RAD transit dose measurement — https://www.sciencedaily.com/releases/2013/05/130530145930.htm
- ISS Medical Checklist / Emergency Manual, public 2016 release — https://webcf.waybackmachine.org/web/20211027133343/https://www.governmentattic.org/19docs/NASA-ISSmedicalEmergManual_2016.pdf

## Space agency partner resources

- Canadian Space Agency, Bio-Monitor — https://www.asc-csa.gc.ca/eng/sciences/astroskin.asp
- European Space Agency / IBMP, Mars-500 — https://www.esa.int/Our_Activities/Human_Spaceflight/Mars500/Mars500_study_overview
- Brazil, PUCRS MicroG Centre: Evetts-Russomano CPR method (Extreme Physiology & Medicine 2013) — https://pmc.ncbi.nlm.nih.gov/articles/PMC3710155

## Clinical guidelines and research

- Royal College of Physicians, National Early Warning Score 2 (NEWS2) — https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/
- American Heart Association, 2025 High Blood Pressure Guideline — https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know
- American Diabetes Association, hypoglycemia levels (2025) — https://professional.diabetes.org/sites/dpro/files/2025-05/hypoglycemia-hcp-5-27-25.pdf
- PHQ-9 (Kroenke, Spitzer, Williams) — https://en.wikipedia.org/wiki/PHQ-9
- Guideline: Cardiopulmonary resuscitation during spaceflight (AWMF S2e, 2022) — https://register.awmf.org/assets/guideline_bkp/182-002e_S2e_Kardiopulmonale-Reanimation-Schwerelosigkeit-Cardiopulmonary-resuscitation-CPR-during-spaceflight_2022-07.pdf
- Stahn et al., Increased core body temperature in astronauts (Scientific Reports 2017) — https://pmc.ncbi.nlm.nih.gov/articles/PMC5701078
- Cardiovascular changes in spaceflight, meta-analysis (Frontiers in Physiology 2024) — https://www.frontiersin.org/articles/10.3389/fphys.2024.1438089/full
- Stavnichuk et al., Bone loss in space travelers (npj Microgravity 2020) — https://pmc.ncbi.nlm.nih.gov/articles/PMC7200725
- Barger et al., Sleep deficiency in astronauts (2014) — https://sciencedaily.com/releases/2014/08/140807215803.htm
- Herpes virus reactivation in astronauts (Frontiers in Microbiology 2019) — https://www.frontiersin.org/articles/10.3389/fmicb.2019.00016/text
- MEDEA: medical conditions on a crewed Mars mission — https://arxiv.org/pdf/2010.07029
- Cognition test battery and PVT-B (University of Pennsylvania) — https://www.med.upenn.edu/uep/cognition.html

## Software

| Library | Use | License |
|---|---|---|
| React, React DOM | User interface | MIT |
| Zustand | State and local persistence | MIT |
| Vite, @vitejs/plugin-react | Build tool | MIT |
| TypeScript | Language | Apache-2.0 |
| Tailwind CSS, @tailwindcss/vite | Styling | MIT |
| Vitest | Unit tests | MIT |
| Saira typeface (Omnibus-Type), via @fontsource-variable/saira | Font, self-hosted | SIL Open Font License 1.1 |

Hosting: GitHub Pages. No analytics, no backend, no user accounts.

## Graphics and icons

All icons, the body silhouette, the pixel-art KOMEK character, the product mark and the charts are original graphics drawn in code for this project. KOMEK is an original character, not based on any existing one. No stock images, no photos, no logos or emblems of any agency or mission.

## Data notes

- NASA OSDR CSV files in `public/data/` are unmodified copies of the published "_TRANSFORMED" tables.
- All vital signs, the four crew members and their histories are fictional and synthetic, generated by `src/sim/simulator.ts` with a fixed seed. They are labelled "Simulated" in the interface.

## Use of Super Intelligence (SI)

- **Code.** The application code, unit tests and configuration were written with an SI coding assistant (Claude, by Anthropic) directed by the team. The team chose the concept, features, sources and priorities, and tested the result.
- **Text.** Interface texts, the knowledge base of the KOMEK assistant and these documents were drafted with the same SI assistant from sources collected by the team. Numbers come from the sources listed above; team-chosen values are marked "reference value".
- **Graphics.** The SVG icons and the body figure were written as code with the SI assistant. There are no SI-generated photos, videos, audio or likenesses of people.
- **In the product.** KOMEK is not a neural network. It is a rule-based assistant with a fixed, hand-checked knowledge base, and it works offline.
- **Research.** Background research was assisted by SI tools and the figures were traced back to the linked sources. No physician has reviewed the medical content.
