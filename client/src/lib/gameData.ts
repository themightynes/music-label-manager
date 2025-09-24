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

// PROJECT_TYPES moved to data/balance.json - fetch via API
// Use /api/project-types endpoint instead of hardcoded data

export const ACCESS_TIERS = {
  playlist: ["None", "Niche", "Mid", "Flagship"],
  press: ["None", "Blogs", "Mid-Tier", "Major"],
  venue: ["None", "Clubs", "Theaters", "Arenas"]
};


// SAMPLE_DIALOGUE removed - obsolete hardcoded data
// Use rich dialogue system from data/roles.json via API

// WEEKLY_ACTIONS moved to data/actions.json - fetch via API
// Use /api/actions/weekly endpoint instead of hardcoded data
