// Free facilitator resources, each rendered as a printable page at /toolkit/[slug].

export interface Resource {
  slug: string;
  title: string;
  summary: string;
  sections: { heading: string; items: string[] }[];
}

export const RESOURCES: Resource[] = [
  {
    slug: "retro-formats",
    title: "Six retro formats and when to use them",
    summary: "Keep retros fresh. Pick a format by what the team needs this sprint.",
    sections: [
      {
        heading: "Start, Stop, Continue",
        items: [
          "Best for: a quick, practical retro or a new team.",
          "Ask: what should we start doing, stop doing, and keep doing?",
          "Tip: limit each person to three cards per column so the board stays readable.",
        ],
      },
      {
        heading: "Mad, Sad, Glad",
        items: [
          "Best for: a sprint with strong feelings, such as a tough release or a big win.",
          "Ask: what made you mad, what made you sad, what made you glad?",
          "Tip: give everyone room to vent first, then vote on what the team can change.",
        ],
      },
      {
        heading: "4Ls: Liked, Learned, Lacked, Longed for",
        items: [
          "Best for: the end of a project or a long release.",
          "Lacked and Longed for often surface missing skills or tools worth raising with leadership.",
        ],
      },
      {
        heading: "Sailboat",
        items: [
          "Best for: teams that need to look beyond one sprint.",
          "Wind: what pushes us forward. Anchors: what slows us down. Rocks: risks ahead. Island: our goal.",
          "Tip: draw it on a whiteboard, or use four columns in QuickPoker.",
        ],
      },
      {
        heading: "Starfish",
        items: [
          "Best for: teams that are doing fine and want to fine-tune.",
          "Five areas: keep doing, more of, less of, stop doing, start doing.",
        ],
      },
      {
        heading: "Timeline",
        items: [
          "Best for: long sprints or incidents, where order matters.",
          "Everyone adds events to a shared timeline, then marks high and low points.",
          "Tip: look for the moment the mood changed. That's usually the real topic.",
        ],
      },
    ],
  },
  {
    slug: "icebreakers",
    title: "20 icebreakers for remote teams",
    summary: "Two minutes at the start of a meeting that get everyone talking.",
    sections: [
      {
        heading: "One word or one number",
        items: [
          "Describe the sprint in one word.",
          "Rate your energy from 1 to 5, and say why in one sentence.",
          "Pick a weather forecast that matches your week.",
          "Which emoji sums up your last sprint?",
          "Name one thing you're proud of from this sprint.",
        ],
      },
      {
        heading: "Quick stories",
        items: [
          "What's the best tip you learned this month?",
          "What's on your desk right now that has a story behind it?",
          "What did you want to be when you were ten?",
          "What's a small thing that made your week better?",
          "Which tool would you not give up at work?",
        ],
      },
      {
        heading: "Team building",
        items: [
          "Share a photo of your view right now.",
          "Which teammate helped you this sprint, and how?",
          "If our team were a band, what kind of music would we play?",
          "What's one skill you'd like to learn from someone here?",
          "What would make next sprint feel easier?",
        ],
      },
      {
        heading: "Light and fast",
        items: [
          "Coffee, tea or something else?",
          "Morning person or night owl?",
          "What's the last thing you watched that you'd recommend?",
          "Best snack for a long meeting?",
          "If you had a free afternoon tomorrow, how would you spend it?",
        ],
      },
    ],
  },
  {
    slug: "estimation-cheat-sheet",
    title: "Story point estimation cheat sheet",
    summary: "The rules that keep planning poker fast and useful.",
    sections: [
      {
        heading: "What a story point measures",
        items: [
          "Effort, complexity and uncertainty together, compared with other stories. Not hours.",
          "Pick a small, well-understood reference story and call it a 2 or a 3. Size everything else against it.",
          "Points are for the team's own forecasting. Never compare velocity between teams.",
        ],
      },
      {
        heading: "Running a round",
        items: [
          "Read the story and acceptance criteria aloud. Answer questions before anyone votes.",
          "Everyone picks a card privately, then all cards are revealed at once. That stops anchoring on the first number said aloud.",
          "If the votes spread widely, ask the highest and lowest voters to explain, then vote again.",
          "Two rounds without agreement? Take the higher number, or split the story.",
        ],
      },
      {
        heading: "Special cards",
        items: [
          "?: not enough information to estimate. Clarify the story first.",
          "Coffee: the team needs a break.",
          "Very large numbers (21, 40, 100): a signal to split the story, not a real estimate.",
        ],
      },
      {
        heading: "Signs a story should be split",
        items: [
          "It won't fit comfortably in one sprint.",
          "The acceptance criteria cover several separate user goals.",
          "Votes keep landing far apart because people picture different work.",
          "Good stories follow INVEST: Independent, Negotiable, Valuable, Estimable, Small and Testable.",
        ],
      },
    ],
  },
  {
    slug: "ready-and-done",
    title: "Definition of Ready and Definition of Done checklists",
    summary: "Starting templates. Adapt them with your team in a retro.",
    sections: [
      {
        heading: "Definition of Ready (before the sprint)",
        items: [
          "The story states who it's for and what value it brings.",
          "Acceptance criteria are written and agreed with the Product Owner.",
          "Dependencies are known, and none block the start.",
          "The team has estimated it, and it fits in one sprint.",
          "Designs, data or access the team needs are available.",
        ],
      },
      {
        heading: "Definition of Done (before it counts as finished)",
        items: [
          "Code is reviewed and merged.",
          "Automated tests are written and passing.",
          "Acceptance criteria are met and checked by someone other than the author.",
          "Documentation and release notes are updated where users will notice.",
          "It's deployed to the agreed environment with no known critical defects.",
        ],
      },
    ],
  },
  {
    slug: "facilitator-checklist",
    title: "Retro facilitator checklist",
    summary: "Before, during and after: what good facilitators do every time.",
    sections: [
      {
        heading: "Before",
        items: [
          "Pick a format that fits the sprint (see Six retro formats).",
          "Re-read last retro's action items and check which ones got done.",
          "Create the QuickPoker board and share the link in the meeting invite.",
        ],
      },
      {
        heading: "During",
        items: [
          "Open with a two-minute icebreaker.",
          "Review last retro's action items first.",
          "Time-box writing (5 to 7 minutes) with the board timer, then reveal.",
          "Group similar cards, then dot-vote so the team picks the topics.",
          "Discuss the top two or three topics. Each one should end with an action item and an owner.",
        ],
      },
      {
        heading: "After",
        items: [
          "Email or print the board before it's deleted (24 hours after last use).",
          "Put the action items where the team will see them daily, like the sprint board.",
          "Limit yourself to three action items. Finishing a few beats starting many.",
        ],
      },
    ],
  },
];

export const PRO_PACK = {
  name: "Facilitator Pro Pack",
  price: "$19",
  items: [
    "30 retro formats with step-by-step facilitation scripts",
    "PI planning and sprint planning agendas",
    "Team health check survey and scoring sheet",
    "Printable planning poker cards and retro posters",
    "Templates for working agreements and team charters",
  ],
};
