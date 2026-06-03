// Frontend profile map — rich person info for the Roster info-cards.
// Keyed by exact employee name (matches /api/employees). Anyone not hand-filled
// gets a deterministic, plausible profile via profileFor() so every card is rich.
//
// This is the user-chosen approach (no DB columns): edit freely here.

import { seedFrom } from '@/lib/empire-data'

export interface PersonProfile {
  country: string
  city: string
  timezone: string
  languages: string[]
  skills: string[]
  bio: string
  funFact: string
}

/* ---------------- Hand-filled core team ---------------- */

const PROFILES: Record<string, PersonProfile> = {
  Joud: { country: 'Netherlands', city: 'Amsterdam', timezone: 'CET (UTC+1)',
    languages: ['Arabic', 'English', 'Dutch'],
    skills: ['Solution Architecture', 'AI Systems', 'Product Strategy', 'Serverless / AWS', 'Full-stack'],
    bio: 'Founder & CEO of Cregen. Architects the empire end-to-end — from serverless infrastructure to AI agent orchestration — and sets the vision every department rallies behind.',
    funFact: 'Runs the whole company as a fleet of microservices — including this dashboard.',
  },
  Rade: { country: 'Serbia', city: 'Belgrade', timezone: 'CET (UTC+1)',
    languages: ['Serbian', 'English'],
    skills: ['System Design', 'TypeScript', 'Team Leadership', 'Code Review', 'DevOps'],
    bio: 'Tech Lead and the founder\'s right hand. Turns strategy into shipped systems and keeps engineering velocity high without sacrificing quality.',
    funFact: 'Has reviewed more pull requests than anyone else in the empire.',
  },
  Hamza: { country: 'Morocco', city: 'Casablanca', timezone: 'WET (UTC+0)',
    languages: ['Arabic', 'French', 'English'],
    skills: ['Backend', 'Node.js', 'PostgreSQL', 'API Design'],
    bio: 'Software Engineer focused on backend services and data integrity. Builds the reliable plumbing the product runs on.',
    funFact: 'Can debug a race condition faster than the kettle boils.',
  },
  Steve: { country: 'United Kingdom', city: 'Manchester', timezone: 'GMT (UTC+0)',
    languages: ['English'],
    skills: ['Frontend', 'React', 'TypeScript', 'Testing'],
    bio: 'Software Engineer with an eye for clean interfaces and well-tested code. Bridges design intent and working software.',
    funFact: 'Refuses to merge anything without a green test suite.',
  },
  Daniel: { country: 'Germany', city: 'Berlin', timezone: 'CET (UTC+1)',
    languages: ['German', 'English'],
    skills: ['Full-stack', 'Performance', 'GraphQL', 'CI/CD'],
    bio: 'Software Engineer who lives in the performance budget. Squeezes latency out of every layer of the stack.',
    funFact: 'Keeps a personal leaderboard of his own p95 improvements.',
  },
  Yahya: { country: 'Egypt', city: 'Cairo', timezone: 'EET (UTC+2)',
    languages: ['Arabic', 'English'],
    skills: ['Machine Learning', 'LLMs', 'Python', 'Agent Orchestration', 'RAG'],
    bio: 'AI Engineer building the intelligence layer — model pipelines, agents, and the systems that make the product feel smart.',
    funFact: 'Has fine-tuned more models than he\'s had hot dinners.',
  },
  Gayth: { country: 'Tunisia', city: 'Tunis', timezone: 'CET (UTC+1)',
    languages: ['Arabic', 'French', 'English'],
    skills: ['DevSecOps', 'Docker', 'Kubernetes', 'CI/CD', 'Cloud Security'],
    bio: 'DevSecOps engineer who makes deploys boring and pipelines bulletproof. Owns the road from commit to production.',
    funFact: 'Automates anything he has to do more than twice.',
  },
  Abdulrahman: { country: 'Saudi Arabia', city: 'Riyadh', timezone: 'AST (UTC+3)',
    languages: ['Arabic', 'English'],
    skills: ['Security', 'Threat Modeling', 'Pen Testing', 'Compliance', 'IAM'],
    bio: 'Security Specialist guarding the empire\'s walls — threat modeling, audits, and hardening across every service.',
    funFact: 'Thinks like an attacker so the rest of us don\'t have to.',
  },
  'Maximilian Vogel': { country: 'Germany', city: 'Munich', timezone: 'CET (UTC+1)',
    languages: ['German', 'English'],
    skills: ['Art Direction', 'Brand', 'Visual Design', 'Motion', 'Storytelling'],
    bio: 'Creative Director shaping the visual language of the empire — brand, story, and the look that makes the product unmistakable.',
    funFact: 'Believes every pixel should earn its place.',
  },
  Alaa: { country: 'Syria', city: 'Aleppo', timezone: 'EET (UTC+2)',
    languages: ['Arabic', 'English'],
    skills: ['UI/UX', 'Figma', 'Design Systems', 'Prototyping', 'Accessibility'],
    bio: 'UI/UX Specialist turning complex flows into interfaces that feel effortless. Owns the design system and the details.',
    funFact: 'Can spot a 1px misalignment from across the room.',
  },
  'Sarah Alsaidy': { country: 'Syria', city: 'Damascus', timezone: 'EET (UTC+2)',
    languages: ['Arabic', 'English'],
    skills: ['Growth', 'Content', 'Paid Ads', 'SEO/AEO', 'Analytics'],
    bio: 'Marketing Strategist driving demand and brand reach — owns the top of the funnel from first impression to qualified lead.',
    funFact: 'Has a sixth sense for which hook will go viral.',
  },
  Issam: { country: 'Lebanon', city: 'Beirut', timezone: 'EET (UTC+2)',
    languages: ['Arabic', 'French', 'English'],
    skills: ['Partnerships', 'Sales', 'Negotiation', 'Channel', 'Relationships'],
    bio: 'Head of Partnerships building the alliances that compound. Works on commission and closes the deals that move the needle.',
    funFact: 'Never met a room he couldn\'t work.',
  },
  Kinda: { country: 'Jordan', city: 'Amman', timezone: 'EET (UTC+2)',
    languages: ['Arabic', 'English'],
    skills: ['Client Success', 'Onboarding', 'Retention', 'Support', 'Account Growth'],
    bio: 'Client Success Manager keeping every client a champion — onboarding, retention, and expansion are her domain.',
    funFact: 'Turns at-risk accounts into the loudest advocates.',
  },
  'Dr. Eyad Al-Shammari': { country: 'Kuwait', city: 'Kuwait City', timezone: 'AST (UTC+3)',
    languages: ['Arabic', 'English'],
    skills: ['Strategy', 'Academia', 'Governance', 'Mentorship', 'Research'],
    bio: 'Advisory Board Chair and strategic advisor — a Kuwaiti academic holding three PhDs. Brings outside counsel and deep rigor to the empire\'s biggest decisions.',
    funFact: 'Holds three doctorates — and isn\'t done yet.',
  },
  'Lukas Beckers': { country: 'Belgium', city: 'Brussels', timezone: 'CET (UTC+1)',
    languages: ['Dutch', 'French', 'English'],
    skills: ['HR Ops', 'Finance Ops', 'Legal Ops', 'Approvals', 'Mentorship'],
    bio: 'Composite AI operator agent running HR, Finance, and Legal day-to-day. A mentor brain distilled from the greats — every consequential action is gated by Joud\'s approval.',
    funFact: 'Never sleeps, never forgets, and always asks before it acts.',
  },
}

/* ---------------- Deterministic fallback ---------------- */

const POOL: Array<{ country: string; city: string; tz: string; langs: string[] }> = [
  { country: 'UAE', city: 'Dubai', tz: 'GST (UTC+4)', langs: ['Arabic', 'English'] },
  { country: 'Spain', city: 'Barcelona', tz: 'CET (UTC+1)', langs: ['Spanish', 'English'] },
  { country: 'India', city: 'Bengaluru', tz: 'IST (UTC+5:30)', langs: ['Hindi', 'English'] },
  { country: 'Brazil', city: 'São Paulo', tz: 'BRT (UTC-3)', langs: ['Portuguese', 'English'] },
  { country: 'Poland', city: 'Kraków', tz: 'CET (UTC+1)', langs: ['Polish', 'English'] },
  { country: 'United States', city: 'Austin', tz: 'CST (UTC-6)', langs: ['English'] },
]

const GENERIC_SKILLS = ['Execution', 'Collaboration', 'Problem Solving', 'Communication', 'Ownership']

export function profileFor(name: string, role = 'Operator'): PersonProfile {
  const hit = PROFILES[name]
  if (hit) return hit
  const r = seedFrom(name)
  const p = POOL[r % POOL.length]
  return {
    country: p.country, city: p.city, timezone: p.tz,
    languages: p.langs,
    skills: GENERIC_SKILLS,
    bio: `${role} in the empire — contributes across the department and keeps the machine moving.`,
    funFact: 'A quiet force multiplier on the team.',
  }
}
