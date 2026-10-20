// Free practice quizzes. Questions are original and follow the 2020 Scrum Guide.

export interface Question {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export interface Quiz {
  slug: string;
  title: string;
  summary: string;
  questions: Question[];
}

export const QUIZZES: Quiz[] = [
  {
    slug: "scrum-fundamentals",
    title: "Scrum fundamentals",
    summary: "12 questions on roles, events and artifacts, based on the 2020 Scrum Guide. A good warm-up before a Scrum Master exam.",
    questions: [
      {
        q: "Which three accountabilities make up a Scrum Team?",
        options: ["Product Owner, Scrum Master, Developers", "Product Owner, Project Manager, Developers", "Scrum Master, Tech Lead, Testers", "Product Manager, Scrum Master, Stakeholders"],
        answer: 0,
        why: "The 2020 Scrum Guide names three accountabilities: the Product Owner, the Scrum Master and the Developers.",
      },
      {
        q: "What is the longest a Sprint can be?",
        options: ["Two weeks", "One month", "Six weeks", "As long as the work needs"],
        answer: 1,
        why: "Sprints are one month or less, so that inspection and adaptation happen at least monthly.",
      },
      {
        q: "Who is accountable for ordering the Product Backlog?",
        options: ["The Scrum Master", "The Developers", "The Product Owner", "The stakeholders, by vote"],
        answer: 2,
        why: "The Product Owner is accountable for the Product Backlog, including ordering it. Others can help, but the Product Owner stays accountable.",
      },
      {
        q: "What is the time-box for the Daily Scrum?",
        options: ["15 minutes", "30 minutes", "One hour", "No limit"],
        answer: 0,
        why: "The Daily Scrum is a 15-minute event for the Developers, held at the same time and place each working day.",
      },
      {
        q: "Which commitment belongs to the Increment?",
        options: ["The Sprint Goal", "The Product Goal", "The Definition of Done", "The Definition of Ready"],
        answer: 2,
        why: "Each artifact has a commitment: the Product Backlog has the Product Goal, the Sprint Backlog has the Sprint Goal, and the Increment has the Definition of Done.",
      },
      {
        q: "Who can cancel a Sprint?",
        options: ["The Scrum Master", "Only the Product Owner", "Any member of the Scrum Team", "Senior management"],
        answer: 1,
        why: "Only the Product Owner has the authority to cancel a Sprint, and only if the Sprint Goal becomes obsolete.",
      },
      {
        q: "Who creates the plan for delivering the Sprint's work?",
        options: ["The Product Owner", "The Scrum Master", "The Developers", "The project sponsor"],
        answer: 2,
        why: "The Developers decide how to turn the selected Product Backlog items into a Done Increment. That plan is part of the Sprint Backlog.",
      },
      {
        q: "What happens to work that doesn't meet the Definition of Done by the end of the Sprint?",
        options: ["It's shown at the Sprint Review as partly done", "It's released with a known-issues note", "It goes back to the Product Backlog for future consideration", "The Sprint is extended until it's done"],
        answer: 2,
        why: "Work that doesn't meet the Definition of Done can't be released or presented at the Sprint Review. It returns to the Product Backlog.",
      },
      {
        q: "What are the three pillars of Scrum's empiricism?",
        options: ["Planning, execution, review", "Transparency, inspection, adaptation", "Commitment, focus, courage", "Speed, quality, cost"],
        answer: 1,
        why: "Scrum is built on empiricism, which rests on transparency, inspection and adaptation.",
      },
      {
        q: "What is the time-box for the Sprint Retrospective in a one-month Sprint?",
        options: ["One hour", "Two hours", "Three hours", "Four hours"],
        answer: 2,
        why: "The Sprint Retrospective is at most three hours for a one-month Sprint, and usually shorter for shorter Sprints.",
      },
      {
        q: "How big is a Scrum Team, typically?",
        options: ["10 or fewer people", "Exactly 7 people", "Up to 20 people", "As many as the project needs"],
        answer: 0,
        why: "The Scrum Guide says a Scrum Team is typically 10 or fewer people. Larger groups should reorganize into several Scrum Teams.",
      },
      {
        q: "Which of these is one of the five Scrum values?",
        options: ["Speed", "Courage", "Hierarchy", "Predictability"],
        answer: 1,
        why: "The five Scrum values are commitment, focus, openness, respect and courage.",
      },
    ],
  },
  {
    slug: "agile-estimation",
    title: "Agile estimation and planning poker",
    summary: "10 questions on story points, planning poker and velocity. Useful for any team member.",
    questions: [
      {
        q: "What do story points measure?",
        options: ["Hours of work", "The relative size of a story: effort, complexity and uncertainty", "How valuable a story is to the business", "How many people a story needs"],
        answer: 1,
        why: "Story points compare stories with each other, combining effort, complexity and uncertainty. They aren't a unit of time.",
      },
      {
        q: "Why do players reveal their planning poker cards at the same time?",
        options: ["It's faster", "So the facilitator can count votes", "To avoid anchoring on the first number someone says", "It's required by the Scrum Guide"],
        answer: 2,
        why: "If people hear an estimate first, they tend to anchor on it. A simultaneous reveal captures everyone's independent view.",
      },
      {
        q: "Why do estimation decks often use a Fibonacci-like sequence (1, 2, 3, 5, 8, 13...)?",
        options: ["The gaps grow with size, reflecting more uncertainty in bigger work", "It's easier to add up", "It matches hours in a working day", "It was required by early agile tools"],
        answer: 0,
        why: "Bigger work is harder to size precisely, so the gaps between values grow. That stops debates over 14 versus 15.",
      },
      {
        q: "After a reveal, votes range from 2 to 13. What should the team do next?",
        options: ["Take the average", "Let the most senior person decide", "Ask the highest and lowest voters to explain, then vote again", "Skip the story"],
        answer: 2,
        why: "A wide spread usually means people picture different work. Hearing both extremes surfaces hidden risks or shortcuts.",
      },
      {
        q: "What is velocity best used for?",
        options: ["Comparing teams' performance", "Forecasting how much the same team can take on in future sprints", "Setting individual targets", "Calculating budgets in hours"],
        answer: 1,
        why: "Velocity is a planning aid for one team. Comparing teams is misleading, because each team's point scale is its own.",
      },
      {
        q: "What does the '?' card usually mean?",
        options: ["The story is very large", "I don't have enough information to estimate", "I want to skip my turn", "The story is already done"],
        answer: 1,
        why: "'?' signals missing information. The team should clarify the story before estimating.",
      },
      {
        q: "A story is estimated at 40 points, and the team usually finishes 30 per sprint. What's the best move?",
        options: ["Start it and carry it over", "Split it into smaller stories that each deliver value", "Re-estimate it at 30", "Assign it to the fastest person"],
        answer: 1,
        why: "A story bigger than a sprint should be split into smaller, valuable pieces that can each be finished.",
      },
      {
        q: "Who should estimate a story?",
        options: ["The Product Owner", "The manager", "The people who will do the work", "An outside expert"],
        answer: 2,
        why: "The people doing the work understand its effort and risks best, so their estimates are the most useful.",
      },
      {
        q: "In INVEST, what does the 'E' stand for?",
        options: ["Efficient", "Estimable", "Essential", "Expected"],
        answer: 1,
        why: "INVEST: Independent, Negotiable, Valuable, Estimable, Small and Testable. If a story isn't estimable, it usually needs clarifying or splitting.",
      },
      {
        q: "What is a reference story?",
        options: ["A story copied from another team", "A well-understood story the team uses as a baseline for sizing others", "The first story in the backlog", "A story with no acceptance criteria"],
        answer: 1,
        why: "A reference story gives everyone the same starting point, so a '5' means roughly the same thing to the whole team.",
      },
    ],
  },
];
