/** Every source cited in the interface. Keys are referenced from thresholds, content and findings. */
export interface Source {
  label: string
  url: string
  /** Which organisation the source belongs to, for the "NASA data" / "partner data" lists. */
  group: 'NASA' | 'Partner agency' | 'Clinical guideline' | 'Research' | 'This project'
}

export const SOURCES = {
  spaceNews2: {
    label: 'Space-NEWS2, this team’s method: NEWS2 + personal baseline + environment context',
    url: 'https://github.com/Tuka2308/body-in-space#space-news2',
    group: 'This project',
  },
  news2: {
    label: 'Royal College of Physicians, National Early Warning Score 2 (NEWS2)',
    url: 'https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/',
    group: 'Clinical guideline',
  },
  aha2025: {
    label: 'American Heart Association, 2025 High Blood Pressure Guideline',
    url: 'https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know',
    group: 'Clinical guideline',
  },
  ada: {
    label: 'American Diabetes Association, hypoglycemia levels (2025)',
    url: 'https://professional.diabetes.org/sites/dpro/files/2025-05/hypoglycemia-hcp-5-27-25.pdf',
    group: 'Clinical guideline',
  },
  phq9: {
    label: 'PHQ-9 depression questionnaire (Kroenke, Spitzer, Williams)',
    url: 'https://en.wikipedia.org/wiki/PHQ-9',
    group: 'Clinical guideline',
  },
  hrpHazards: {
    label: 'NASA Human Research Program, the five hazards of human spaceflight',
    url: 'https://www.nasa.gov/hrp/hazards/',
    group: 'NASA',
  },
  hrpRisks: {
    label: 'NASA Human Research Program, human health risks',
    url: 'https://www.nasa.gov/hrp/risks/',
    group: 'NASA',
  },
  co2: {
    label: 'NASA-STD-3001, OCHMO-TB-004 Carbon Dioxide',
    url: 'https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/',
    group: 'NASA',
  },
  radiation: {
    label: 'NASA-STD-3001, OCHMO Radiation Protection technical brief',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf',
    group: 'NASA',
  },
  radTransit: {
    label: 'NASA Curiosity RAD, 1.8 mSv/day measured in transit to Mars',
    url: 'https://www.sciencedaily.com/releases/2013/05/130530145930.htm',
    group: 'NASA',
  },
  donki: {
    label: 'NASA DONKI, Space Weather Database of Notifications, Knowledge, Information',
    url: 'https://api.nasa.gov/',
    group: 'NASA',
  },
  ochmoSleep: {
    label: 'NASA-STD-3001, OCHMO Sleep Accommodations technical brief',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/03/sleep-accomodations-technical-brief-ochmo.pdf',
    group: 'NASA',
  },
  nutrition: {
    label: 'NASA-STD-3001, OCHMO-TB-013 Food and Nutrition',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-013-food-and-nutrition.pdf',
    group: 'NASA',
  },
  medOps: {
    label: 'NASA-STD-3001, Medical Operations',
    url: 'https://www.nasa.gov/reference/6-0-medical-operations/',
    group: 'NASA',
  },
  sans: {
    label: 'NASA, Spaceflight Associated Neuro-ocular Syndrome overview (2023)',
    url: 'https://ntrs.nasa.gov/api/citations/20230006218/downloads/Brunstetter%20-%20Crewmember%20SANS%20Overview%20-%20Export%20Control%20-FINAL%20-%2001May23.pdf',
    group: 'NASA',
  },
  commDelay: {
    label: 'NASA, Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions (2022)',
    url: 'https://ntrs.nasa.gov/citations/20220013418',
    group: 'NASA',
  },
  eimo: {
    label: 'NASA, Earth-Independent Medical Operations concept of operations (2024)',
    url: 'https://ntrs.nasa.gov/api/citations/20240001402/downloads/2024_IWS_EIMO_ConOps_FINAL.pdf',
    group: 'NASA',
  },
  issChecklist: {
    label: 'ISS Medical Checklist / Emergency Manual (public 2016 release)',
    url: 'https://webcf.waybackmachine.org/web/20211027133343/https://www.governmentattic.org/19docs/NASA-ISSmedicalEmergManual_2016.pdf',
    group: 'NASA',
  },
  osdr: {
    label: 'NASA Open Science Data Repository (OSDR)',
    url: 'https://osdr.nasa.gov',
    group: 'NASA',
  },
  osd569: {
    label: 'NASA OSDR OSD-569, Inspiration4 complete blood count',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-569',
    group: 'NASA',
  },
  osd575: {
    label: 'NASA OSDR OSD-575, Inspiration4 metabolic panel and cytokines',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-575',
    group: 'NASA',
  },
  osd656: {
    label: 'NASA OSDR OSD-656, Inspiration4 urine inflammation panel',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-656',
    group: 'NASA',
  },
  bioMonitor: {
    label: 'Canadian Space Agency, Bio-Monitor wearable vital-signs system',
    url: 'https://www.asc-csa.gc.ca/eng/sciences/astroskin.asp',
    group: 'Partner agency',
  },
  mars500: {
    label: 'European Space Agency / IBMP, Mars-500 isolation study',
    url: 'https://www.esa.int/Our_Activities/Human_Spaceflight/Mars500/Mars500_study_overview',
    group: 'Partner agency',
  },
  cprMicrog: {
    label: 'Evetts-Russomano CPR method, MicroG Centre PUCRS, Brazil (Extreme Physiology & Medicine 2013)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3710155',
    group: 'Partner agency',
  },
  awmf: {
    label: 'Guideline: Cardiopulmonary resuscitation during spaceflight (AWMF S2e, 2022)',
    url: 'https://register.awmf.org/assets/guideline_bkp/182-002e_S2e_Kardiopulmonale-Reanimation-Schwerelosigkeit-Cardiopulmonary-resuscitation-CPR-during-spaceflight_2022-07.pdf',
    group: 'Research',
  },
  stahn2017: {
    label: 'Stahn et al., Increased core body temperature in astronauts (Scientific Reports 2017)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5701078',
    group: 'Research',
  },
  hrShift: {
    label: 'Cardiovascular changes in spaceflight, meta-analysis (Frontiers in Physiology 2024)',
    url: 'https://www.frontiersin.org/articles/10.3389/fphys.2024.1438089/full',
    group: 'Research',
  },
  boneLoss: {
    label: 'Stavnichuk et al., Bone loss in space travelers (npj Microgravity 2020)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7200725',
    group: 'Research',
  },
  barger2014: {
    label: 'Barger et al., Sleep deficiency in astronauts (Lancet Neurology 2014)',
    url: 'https://sciencedaily.com/releases/2014/08/140807215803.htm',
    group: 'Research',
  },
  immune: {
    label: 'Herpes virus reactivation in astronauts (Frontiers in Microbiology 2019)',
    url: 'https://www.frontiersin.org/articles/10.3389/fmicb.2019.00016/text',
    group: 'Research',
  },
  medea: {
    label: 'MEDEA: medical conditions on a crewed Mars mission (arXiv:2010.07029)',
    url: 'https://arxiv.org/pdf/2010.07029',
    group: 'Research',
  },
  cognition: {
    label: 'Cognition test battery and PVT-B (University of Pennsylvania)',
    url: 'https://www.med.upenn.edu/uep/cognition.html',
    group: 'Research',
  },
} as const satisfies Record<string, Source>

export type SourceId = keyof typeof SOURCES

export function source(id: string): Source {
  return (SOURCES as Record<string, Source>)[id] ?? SOURCES.spaceNews2
}
