import type { IconName } from '@/components/atoms/EmpireIcon'

export type Microservice = {
  slug: string;
  name: string;
  // EmpireIcon glyph name (NO emoji). Render via <EmpireIcon name={icon} /> or,
  // preferably, resolve from the slug with deptIcon(slug).
  icon: IconName;
  accent: string;
  blurb: string;
};

// Static fallback roster of ALL microservices (territories). The dashboard merges
// this with GET /api/departments (deduped by slug) so every microservice is
// always reachable from the launcher, even if the API list is short.
export const MICROSERVICES: Microservice[] = [
  {
    slug: "finance",
    name: "Finance",
    icon: "finance",
    accent: "#c9a233",
    blurb: "Treasury, runway, payroll and the empire's ledger of record.",
  },
  {
    slug: "tech",
    name: "Engineering",
    icon: "engineering",
    accent: "#3b82f6",
    blurb: "Ships the product — platform, infrastructure and shipping velocity.",
  },
  {
    slug: "marketing",
    name: "Marketing",
    icon: "marketing",
    accent: "#22c55e",
    blurb: "Demand generation, brand reach and the top of the funnel.",
  },
  {
    slug: "partnerships",
    name: "Partnerships",
    icon: "partnerships",
    accent: "#06b6d4",
    blurb: "Alliances, integrations and channel deals that compound.",
  },
  {
    slug: "client-success",
    name: "Client Success",
    icon: "client-success",
    accent: "#10b981",
    blurb: "Retention, expansion and keeping every client a champion.",
  },
  {
    slug: "creative",
    name: "Creative",
    icon: "creative",
    accent: "#e8b4b8",
    blurb: "Design, story and the visual language of the empire.",
  },
  {
    slug: "hr",
    name: "People & HR",
    icon: "hr",
    accent: "#a78bfa",
    blurb: "Hiring, culture and the wellbeing of every operator.",
  },
  {
    slug: "legal",
    name: "Legal",
    icon: "legal",
    accent: "#94a3b8",
    blurb: "Contracts, compliance and the empire's risk shield.",
  },
  {
    slug: "operations",
    name: "Operations",
    icon: "operations",
    accent: "#8b5cf6",
    blurb: "Process automation, tooling and the machine that runs the machine.",
  },
  {
    slug: "executive",
    name: "Executive",
    icon: "executive",
    accent: "#e8c14f",
    blurb: "Strategy, vision and the throne room of decision-making.",
  },
  {
    slug: "advisory",
    name: "Advisory",
    icon: "advisory",
    accent: "#f59e0b",
    blurb: "Outside counsel, mentors and the empire's brain trust.",
  },
];
