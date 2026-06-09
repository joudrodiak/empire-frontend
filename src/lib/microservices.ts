import type { IconName } from '@/components/atoms/EmpireIcon'
import { DEPARTMENT_ACCENT } from '@/lib/theme'

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
    accent: DEPARTMENT_ACCENT,
    blurb: "Treasury, runway, payroll and the empire's ledger of record.",
  },
  {
    slug: "tech",
    name: "Engineering",
    icon: "engineering",
    accent: DEPARTMENT_ACCENT,
    blurb: "Ships the product — platform, infrastructure and shipping velocity.",
  },
  {
    slug: "marketing",
    name: "Marketing",
    icon: "marketing",
    accent: DEPARTMENT_ACCENT,
    blurb: "Demand generation, brand reach and the top of the funnel.",
  },
  {
    slug: "partnerships",
    name: "Partnerships",
    icon: "partnerships",
    accent: DEPARTMENT_ACCENT,
    blurb: "Alliances, integrations and channel deals that compound.",
  },
  {
    slug: "client-success",
    name: "Client Success",
    icon: "client-success",
    accent: DEPARTMENT_ACCENT,
    blurb: "Retention, expansion and keeping every client a champion.",
  },
  {
    slug: "creative",
    name: "Creative",
    icon: "creative",
    accent: DEPARTMENT_ACCENT,
    blurb: "Design, story and the visual language of the empire.",
  },
  {
    slug: "hr",
    name: "People & HR",
    icon: "hr",
    accent: DEPARTMENT_ACCENT,
    blurb: "Hiring, culture and the wellbeing of every operator.",
  },
  {
    slug: "legal",
    name: "Legal",
    icon: "legal",
    accent: DEPARTMENT_ACCENT,
    blurb: "Contracts, compliance and the empire's risk shield.",
  },
  {
    slug: "operations",
    name: "Operations",
    icon: "operations",
    accent: DEPARTMENT_ACCENT,
    blurb: "Process automation, tooling and the machine that runs the machine.",
  },
  {
    slug: "executive",
    name: "Executive",
    icon: "executive",
    accent: DEPARTMENT_ACCENT,
    blurb: "Strategy, vision and the throne room of decision-making.",
  },
  {
    slug: "advisory",
    name: "Advisory",
    icon: "advisory",
    accent: DEPARTMENT_ACCENT,
    blurb: "Outside counsel, mentors and the empire's brain trust.",
  },
];
