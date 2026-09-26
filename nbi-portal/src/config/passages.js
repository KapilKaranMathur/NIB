/**
 * NBI Experiment Portal – Passage Content
 * 
 * Per protocol: "Load exact scored passage content/questions from Appendices D–G; do not paraphrase them."
 * 
 * IMPORTANT: These are PLACEHOLDER passages. Replace with actual Appendix D-G content
 * before running real sessions. The portal will warn if placeholder content is detected.
 * 
 * Each passage has 6 panels of text and 3 comprehension questions.
 * Word counts per panel are tracked for cumulative completed-panel words logging.
 */

export const PLACEHOLDER_FLAG = true; // Set to false once real content is loaded

export const PASSAGES = {
  A: {
    id: 'A',
    title: 'The History of Timekeeping',
    panels: [
      {
        panelNumber: 1,
        text: `For thousands of years, humans have sought ways to measure the passage of time. The earliest known timekeeping devices were sundials, which used the position of the sun's shadow to indicate the approximate hour of the day. Ancient Egyptians developed some of the most sophisticated sundials, dividing the daylight period into twelve equal parts. However, sundials had obvious limitations: they could not function at night or during cloudy weather, and their accuracy varied with the seasons as the length of daylight changed throughout the year.`,
        wordCount: 80,
      },
      {
        panelNumber: 2,
        text: `Water clocks, known as clepsydrae, emerged as an alternative that could operate independently of sunlight. These devices measured time by the regulated flow of water from one vessel to another. The ancient Greeks and Romans refined water clock designs, adding gears and mechanical components to improve accuracy. Some elaborate water clocks even featured automated figures that would perform actions at specific intervals, serving as both timekeeping instruments and sources of entertainment for wealthy households and public spaces.`,
        wordCount: 76,
      },
      {
        panelNumber: 3,
        text: `The mechanical clock, powered by weights and regulated by an escapement mechanism, first appeared in European monasteries during the late thirteenth century. These early clocks had no faces or hands; instead, they struck bells to mark the canonical hours for prayer. The word "clock" itself derives from the Latin "clocca," meaning bell. By the fourteenth century, public clock towers had become prominent features of town centers across Europe, fundamentally changing how communities organized their daily activities and commerce.`,
        wordCount: 79,
      },
      {
        panelNumber: 4,
        text: `The invention of the pendulum clock by Christiaan Huygens in 1656 represented a dramatic leap in accuracy. While previous mechanical clocks could drift by as much as fifteen minutes per day, Huygens' pendulum design reduced this error to approximately fifteen seconds. This improvement was crucial for scientific research and navigation, where precise time measurement was essential. The pendulum clock dominated timekeeping for nearly three centuries, undergoing continuous refinements in materials and design to achieve ever-greater precision.`,
        wordCount: 78,
      },
      {
        panelNumber: 5,
        text: `The twentieth century brought revolutionary changes to timekeeping technology. Quartz crystal oscillators, first developed in the 1920s, used the piezoelectric properties of quartz to maintain extremely stable frequencies. By the 1970s, quartz watches had become affordable consumer products, effectively ending the dominance of mechanical timepieces for everyday use. These watches could achieve accuracy within a few seconds per month, a level of precision that would have seemed miraculous to earlier generations of clockmakers.`,
        wordCount: 75,
      },
      {
        panelNumber: 6,
        text: `Today, atomic clocks define our standard of time measurement. The cesium-133 atom vibrates at exactly 9,192,631,770 cycles per second, providing a reference frequency of extraordinary stability. Modern optical lattice clocks push this precision even further, achieving accuracies that would not gain or lose a second in billions of years. These instruments support technologies from GPS navigation to telecommunications networks, making precise timekeeping an invisible but essential foundation of contemporary civilization and scientific discovery.`,
        wordCount: 76,
      },
    ],
    questions: [
      {
        id: 'A1',
        question: 'What was the primary limitation of sundials as timekeeping devices?',
        options: {
          A: 'They were too expensive to produce',
          B: 'They could not function at night or during cloudy weather',
          C: 'They required constant maintenance',
          D: 'They could only measure hours, not minutes',
        },
        correctAnswer: 'B', // RESEARCHER-ONLY
      },
      {
        id: 'A2',
        question: 'What improvement did Huygens\' pendulum clock achieve over earlier mechanical clocks?',
        options: {
          A: 'It was the first clock to have a face and hands',
          B: 'It could operate without any external power source',
          C: 'It reduced daily drift from about fifteen minutes to about fifteen seconds',
          D: 'It was the first clock small enough for personal use',
        },
        correctAnswer: 'C', // RESEARCHER-ONLY
      },
      {
        id: 'A3',
        question: 'What property of quartz crystals makes them useful for timekeeping?',
        options: {
          A: 'Their ability to generate electricity from heat',
          B: 'Their piezoelectric properties that maintain stable frequencies',
          C: 'Their resistance to temperature changes',
          D: 'Their natural radioactive decay rate',
        },
        correctAnswer: 'B', // RESEARCHER-ONLY
      },
    ],
    totalWords: 464,
  },

  B: {
    id: 'B',
    title: 'The Science of Sleep',
    panels: [
      {
        panelNumber: 1,
        text: `Sleep is one of the most fundamental biological processes, yet its precise functions remained mysterious for much of human history. Scientists now understand that sleep is not a passive state but rather a highly active period during which the brain performs critical maintenance tasks. During sleep, the brain consolidates memories, clears metabolic waste products, and repairs cellular damage. Research has revealed that virtually every major organ system in the body is affected by the quality and duration of sleep obtained each night.`,
        wordCount: 79,
      },
      {
        panelNumber: 2,
        text: `The architecture of a normal night's sleep follows a predictable pattern of cycles, each lasting approximately ninety minutes. Each cycle contains distinct stages: light sleep, deep slow-wave sleep, and rapid eye movement sleep. During slow-wave sleep, the body releases growth hormone and performs physical repair processes. The brain's glymphatic system, a waste clearance pathway that operates primarily during deep sleep, removes potentially toxic proteins including beta-amyloid, a substance associated with Alzheimer's disease progression.`,
        wordCount: 77,
      },
      {
        panelNumber: 3,
        text: `Rapid eye movement sleep, or REM sleep, is characterized by vivid dreaming, temporary muscle paralysis, and increased brain activity that resembles wakefulness. This stage appears crucial for emotional processing and creative problem-solving. Studies have shown that REM sleep helps integrate new information with existing knowledge, facilitating insight and innovation. Individuals deprived specifically of REM sleep show impaired ability to recognize emotional expressions in others and tend to react more intensely to negative stimuli throughout the following day.`,
        wordCount: 78,
      },
      {
        panelNumber: 4,
        text: `The circadian rhythm, governed by a master clock in the brain's suprachiasmatic nucleus, regulates the timing of sleep and wakefulness. This internal clock responds primarily to light exposure, releasing the hormone melatonin as darkness falls to promote sleepiness. Modern lifestyles have disrupted natural circadian patterns through artificial lighting, screen exposure, and irregular schedules. Shift workers, who must sleep during daylight hours, face significantly elevated risks of cardiovascular disease, metabolic disorders, and certain cancers as a consequence of chronic circadian disruption.`,
        wordCount: 82,
      },
      {
        panelNumber: 5,
        text: `Chronic sleep deprivation has been linked to a wide range of health consequences extending far beyond simple fatigue. Research demonstrates that consistently sleeping fewer than seven hours per night increases the risk of obesity, type two diabetes, and hypertension. The immune system's effectiveness is substantially reduced by insufficient sleep, with studies showing that individuals sleeping six hours or less are over four times more likely to develop a cold when exposed to a common virus compared to those sleeping seven hours or more.`,
        wordCount: 82,
      },
      {
        panelNumber: 6,
        text: `Understanding the science of sleep has led to the development of evidence-based recommendations for improving sleep quality. Maintaining a consistent sleep schedule, even on weekends, helps strengthen the circadian rhythm. Limiting caffeine intake after midday, creating a cool and dark sleeping environment, and reducing screen exposure in the hour before bedtime can all contribute to better sleep. Cognitive behavioral therapy for insomnia has proven more effective than medication for long-term treatment of chronic sleep difficulties in multiple clinical trials.`,
        wordCount: 80,
      },
    ],
    questions: [
      {
        id: 'B1',
        question: 'What is the primary function of the brain\'s glymphatic system during deep sleep?',
        options: {
          A: 'Consolidating emotional memories',
          B: 'Removing metabolic waste products including beta-amyloid',
          C: 'Releasing growth hormone for physical repair',
          D: 'Regulating body temperature during sleep cycles',
        },
        correctAnswer: 'B', // RESEARCHER-ONLY
      },
      {
        id: 'B2',
        question: 'What health consequence is specifically associated with chronic circadian disruption in shift workers?',
        options: {
          A: 'Impaired vision and hearing loss',
          B: 'Reduced bone density and joint problems',
          C: 'Elevated risks of cardiovascular disease and metabolic disorders',
          D: 'Accelerated aging of skin and connective tissue',
        },
        correctAnswer: 'C', // RESEARCHER-ONLY
      },
      {
        id: 'B3',
        question: 'According to the passage, which treatment has proven more effective than medication for chronic insomnia?',
        options: {
          A: 'Regular aerobic exercise programs',
          B: 'Herbal supplements and natural remedies',
          C: 'Cognitive behavioral therapy for insomnia',
          D: 'Light therapy combined with melatonin supplements',
        },
        correctAnswer: 'C', // RESEARCHER-ONLY
      },
    ],
    totalWords: 478,
  },

  C: {
    id: 'C',
    title: 'The Ocean\'s Hidden Ecosystems',
    panels: [
      {
        panelNumber: 1,
        text: `Beneath the surface of the world's oceans lie vast ecosystems that remain largely unexplored and poorly understood. The deep sea, defined as ocean depths below two hundred meters, represents the largest habitat on Earth yet has been less thoroughly mapped than the surface of Mars. Recent advances in submersible technology and remote sensing have begun to reveal the extraordinary diversity of life that thrives in these extreme environments, challenging earlier assumptions that deep ocean waters were essentially biological deserts with minimal ecological activity.`,
        wordCount: 80,
      },
      {
        panelNumber: 2,
        text: `Hydrothermal vents, first discovered in 1977 near the Galápagos Islands, fundamentally changed scientific understanding of where and how life could exist. These underwater hot springs release mineral-rich, superheated water from the earth's crust, supporting thriving communities of organisms through chemosynthesis rather than photosynthesis. Giant tube worms, specialized shrimp, and unique microbial communities form complex food webs around these vents, demonstrating that solar energy is not the only foundation upon which complex ecosystems can be built and sustained over time.`,
        wordCount: 81,
      },
      {
        panelNumber: 3,
        text: `Cold seeps represent another type of deep-sea ecosystem that depends on chemical energy rather than sunlight. At these sites, methane and hydrogen sulfide seep slowly from the seafloor, feeding dense communities of chemosynthetic bacteria. These bacteria form the base of food chains that support remarkable assemblages of clams, mussels, and tubeworms. Some cold seep communities have been estimated to persist for thousands of years, making them among the most stable ecosystems on the planet despite existing in conditions that seem profoundly inhospitable to complex life.`,
        wordCount: 84,
      },
      {
        panelNumber: 4,
        text: `The twilight zone, spanning depths from two hundred to one thousand meters, hosts what may be the greatest animal migration on Earth. Each night, billions of organisms including fish, squid, and zooplankton rise from the depths to feed in surface waters, then descend again before dawn. This daily vertical migration moves enormous quantities of carbon from the surface to the deep ocean, playing a significant role in the global carbon cycle that scientists are only beginning to quantify and incorporate into climate prediction models.`,
        wordCount: 81,
      },
      {
        panelNumber: 5,
        text: `Coral reefs in the deep sea extend far beyond the shallow tropical formations familiar to most people. Deep-water corals, growing without the benefit of symbiotic algae, can form massive reef structures at depths exceeding one thousand meters. These slow-growing organisms may live for thousands of years, creating habitats that support hundreds of associated species. Unfortunately, deep-sea coral reefs are highly vulnerable to bottom trawling, a fishing practice that can destroy in minutes reef structures that required centuries or millennia to develop and cannot be easily restored.`,
        wordCount: 85,
      },
      {
        panelNumber: 6,
        text: `The exploration and conservation of deep-sea ecosystems present unique challenges and opportunities for the scientific community. Technological limitations mean that the vast majority of the deep ocean floor remains unobserved by human eyes or instruments. As industrial interests in deep-sea mining grow, scientists are racing to document biodiversity before it can be lost. International efforts to establish marine protected areas in the deep ocean face complex jurisdictional challenges, since much of the deep seabed lies beyond any nation's exclusive economic zone and thus requires unprecedented global cooperation.`,
        wordCount: 86,
      },
    ],
    questions: [
      {
        id: 'C1',
        question: 'What process supports life at hydrothermal vents instead of photosynthesis?',
        options: {
          A: 'Bioluminescence',
          B: 'Chemosynthesis',
          C: 'Thermal radiation absorption',
          D: 'Pressure-based energy conversion',
        },
        correctAnswer: 'B', // RESEARCHER-ONLY
      },
      {
        id: 'C2',
        question: 'What ecological role does the daily vertical migration in the twilight zone play?',
        options: {
          A: 'It regulates ocean temperature at different depths',
          B: 'It moves carbon from surface waters to the deep ocean',
          C: 'It distributes oxygen throughout the water column',
          D: 'It controls population levels of surface predators',
        },
        correctAnswer: 'B', // RESEARCHER-ONLY
      },
      {
        id: 'C3',
        question: 'Why are deep-sea coral reefs particularly vulnerable to bottom trawling?',
        options: {
          A: 'The corals depend on symbiotic algae that are easily disrupted',
          B: 'The fishing nets release toxic chemicals harmful to coral',
          C: 'The reefs grow extremely slowly and cannot be easily restored after damage',
          D: 'The trawling changes water temperature beyond coral tolerance',
        },
        correctAnswer: 'C', // RESEARCHER-ONLY
      },
    ],
    totalWords: 497,
  },
};

/**
 * Practice passage content (separate from scored passages)
 */
export const PRACTICE_PASSAGE = {
  id: 'PRACTICE',
  title: 'Practice: The Common Garden Spider',
  panels: [
    {
      panelNumber: 1,
      text: `The common garden spider, found throughout temperate regions worldwide, is among the most recognizable arachnids. These spiders construct elaborate orb webs, circular structures of silk that can span up to sixty centimeters in diameter. Each web is rebuilt daily, as the spider consumes the old silk to recycle its proteins before spinning a fresh structure, typically during the early morning hours before prey insects become active.`,
      wordCount: 63,
    },
    {
      panelNumber: 2,
      text: `Despite their fearsome reputation among some people, garden spiders are generally harmless to humans and serve a valuable ecological function. A single garden spider may consume hundreds of insects during its lifetime, including many species that damage crops or spread disease. Research has demonstrated that gardens with healthy spider populations tend to have significantly fewer pest insects, reducing the need for chemical pesticides that can harm beneficial organisms and contaminate water supplies.`,
      wordCount: 72,
    },
  ],
  questions: [
    {
      id: 'P1',
      question: 'How often does a garden spider typically rebuild its web?',
      options: {
        A: 'Once a week',
        B: 'Daily',
        C: 'Once a month',
        D: 'Only when damaged',
      },
      correctAnswer: 'B',
    },
  ],
  totalWords: 135,
};

/**
 * Notification messages per protocol Appendix C.
 * Three variants (Q1, Q2, Q3) with 6 messages each.
 * Internal IDs and categories are stored but never shown to participants.
 * 
 * IMPORTANT: Replace with exact Appendix C messages before real sessions.
 */
export const NOTIFICATION_MESSAGES = {
  Q1: [
    { id: 'Q1-1', category: 'social', message: 'New message from a classmate about a group project meeting tomorrow.' },
    { id: 'Q1-2', category: 'social', message: 'A friend shared a photo album from last weekend\'s gathering.' },
    { id: 'Q1-3', category: 'informational', message: 'Weather update: Temperatures expected to drop this evening.' },
    { id: 'Q1-4', category: 'informational', message: 'Campus library announces extended hours during exam period.' },
    { id: 'Q1-5', category: 'promotional', message: 'Student discount available at the campus bookstore this week.' },
    { id: 'Q1-6', category: 'promotional', message: 'Free workshop on time management skills next Thursday.' },
  ],
  Q2: [
    { id: 'Q2-1', category: 'social', message: 'Your study group has scheduled a review session for Friday.' },
    { id: 'Q2-2', category: 'social', message: 'A friend sent you a link to an interesting article.' },
    { id: 'Q2-3', category: 'informational', message: 'Transit update: Bus route changes effective next Monday.' },
    { id: 'Q2-4', category: 'informational', message: 'Reminder: Building maintenance scheduled for this Saturday.' },
    { id: 'Q2-5', category: 'promotional', message: 'New course registration opens tomorrow at nine in the morning.' },
    { id: 'Q2-6', category: 'promotional', message: 'Volunteer opportunity at the community food drive this weekend.' },
  ],
  Q3: [
    { id: 'Q3-1', category: 'social', message: 'A classmate commented on your recent discussion board post.' },
    { id: 'Q3-2', category: 'social', message: 'Invitation to join an online game session this evening.' },
    { id: 'Q3-3', category: 'informational', message: 'Cafeteria menu updated with new seasonal options available today.' },
    { id: 'Q3-4', category: 'informational', message: 'Parking lot section B will be closed for resurfacing tomorrow.' },
    { id: 'Q3-5', category: 'promotional', message: 'Early bird tickets available for the spring music festival.' },
    { id: 'Q3-6', category: 'promotional', message: 'Career fair next Wednesday with over thirty employers attending.' },
  ],
};
