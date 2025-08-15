export const ARTIST_ARCHETYPES = {
  Visionary: {
    name: "Visionary",
    description: "Creative and experimental, pushes artistic boundaries",
    traits: { creativity: 80, commercial: 30, reliability: 60 }
  },
  Workhorse: {
    name: "Workhorse",
    description: "Reliable and productive, consistently delivers quality work",
    traits: { creativity: 60, commercial: 70, reliability: 90 }
  },
  Trendsetter: {
    name: "Trendsetter",
    description: "Trend-aware and commercially minded, appeals to mainstream",
    traits: { creativity: 50, commercial: 90, reliability: 70 }
  }
};

export const ROLE_TYPES = {
  Manager: { name: "Manager", icon: "fas fa-user-tie" },
  "A&R": { name: "A&R Representative", icon: "fas fa-search" },
  Producer: { name: "Producer", icon: "fas fa-sliders-h" },
  PR: { name: "PR Specialist", icon: "fas fa-bullhorn" },
  Digital: { name: "Digital Marketing", icon: "fas fa-chart-line" },
  Streaming: { name: "Streaming Curator", icon: "fas fa-list-ul" },
  Booking: { name: "Booking Agent", icon: "fas fa-calendar-alt" },
  Operations: { name: "Operations Manager", icon: "fas fa-cogs" }
};

export const PROJECT_TYPES = {
  Single: {
    name: "Single",
    minBudget: 3000,
    maxBudget: 12000,
    duration: 1, // months
    tracks: 1
  },
  EP: {
    name: "EP",
    minBudget: 15000,
    maxBudget: 35000,
    duration: 2,
    tracks: 4
  },
  "Mini-Tour": {
    name: "Mini-Tour",
    minBudget: 5000,
    maxBudget: 15000,
    duration: 1,
    venues: 4
  }
};

export const ACCESS_TIERS = {
  playlist: ["None", "Niche", "Mid", "Flagship"],
  press: ["None", "Blogs", "Mid-Tier", "Major"],
  venue: ["None", "Clubs", "Theaters", "Arenas"]
};

export const SAMPLE_ARTISTS = [
  {
    name: "Luna Santos",
    archetype: "Visionary",
    mood: 78,
    loyalty: 65,
    popularity: 45
  },
  {
    name: "Jake Rivers",
    archetype: "Workhorse", 
    mood: 85,
    loyalty: 80,
    popularity: 60
  },
  {
    name: "Nova Kim",
    archetype: "Trendsetter",
    mood: 70,
    loyalty: 55,
    popularity: 75
  }
];

export const SAMPLE_DIALOGUE = {
  Manager: [
    {
      sceneId: "monthly_check_in",
      context: "I've been reviewing Luna's latest tracks, and I think we need to discuss her creative direction. The market is shifting towards more experimental sounds, but we also need to consider commercial viability. What's your take on how we should position her next release?",
      choices: [
        {
          text: "Let's prioritize artistic integrity. Luna's vision should drive the direction.",
          effects: { creativeCapital: 5, money: -2000 },
          delayed: { artistMood: 10 }
        },
        {
          text: "We need to balance both. Let's find a middle ground that satisfies commercial and artistic goals.",
          effects: { reputation: 3 },
          delayed: {}
        },
        {
          text: "Commercial success comes first. We need to follow market trends to ensure profitability.",
          effects: { money: 5000 },
          delayed: { artistMood: -3 }
        }
      ]
    }
  ]
};

export const MONTHLY_ACTIONS = [
  { id: "meet_manager", name: "Meet Manager", type: "role_meeting", icon: "fas fa-user-tie" },
  { id: "meet_ar", name: "Meet A&R", type: "role_meeting", icon: "fas fa-search" },
  { id: "meet_producer", name: "Meet Producer", type: "role_meeting", icon: "fas fa-sliders-h" },
  { id: "meet_pr", name: "Meet PR", type: "role_meeting", icon: "fas fa-bullhorn" },
  { id: "meet_digital", name: "Digital Marketing", type: "role_meeting", icon: "fas fa-chart-line" },
  { id: "meet_streaming", name: "Streaming Pitch", type: "role_meeting", icon: "fas fa-list-ul" },
  { id: "meet_booking", name: "Meet Booking", type: "role_meeting", icon: "fas fa-calendar-alt" },
  { id: "meet_operations", name: "Meet Operations", type: "role_meeting", icon: "fas fa-cogs" },
  { id: "start_single", name: "Start Single", type: "project", icon: "fas fa-music" },
  { id: "start_ep", name: "Start EP", type: "project", icon: "fas fa-compact-disc" },
  { id: "start_tour", name: "Plan Tour", type: "project", icon: "fas fa-route" },
  { id: "pr_push", name: "PR Push", type: "marketing", icon: "fas fa-newspaper" },
  { id: "digital_push", name: "Digital Campaign", type: "marketing", icon: "fas fa-ad" }
];
