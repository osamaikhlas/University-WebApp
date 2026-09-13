import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Baseline system roles from docs/database-design.md §1. These are generic role
 * definitions the system ships with — not institutional/college-specific data (CLAUDE.md
 * rule 1) — so seeding them is not "inventing" official college information.
 */
const ROLES = [
  {
    name: "super_admin",
    description: "Full system access across all modules.",
  },
  {
    name: "principal",
    description:
      "Personally accountable for the college website; can verify compliance items.",
  },
  {
    name: "content_editor",
    description: "Can create and edit draft content across content modules.",
  },
  {
    name: "approver",
    description: "Can approve or reject content submitted for review.",
  },
  {
    name: "compliance_officer",
    description: "Can verify compliance items against the circular requirements.",
  },
  {
    name: "grievance_officer",
    description: "Can view and manage grievance submissions.",
  },
  {
    name: "auditor",
    description: "Read-only access to audit logs.",
  },
];

const PLACEHOLDER_COLLEGE_ID = "placeholder-college";

async function main() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  // A single clearly-marked placeholder college so local development has something to
  // point foreign keys at. Must be replaced with a real college record before launch
  // (CLAUDE.md rules 1, 13, 14).
  await prisma.college.upsert({
    where: { id: PLACEHOLDER_COLLEGE_ID },
    update: {},
    create: {
      id: PLACEHOLDER_COLLEGE_ID,
      name: "[PLACEHOLDER] Sample Affiliated College — replace with real college record",
      type: "GOVT_DEGREE",
      isPlaceholder: true,
    },
  });

  console.log("Seed complete: baseline roles + one placeholder college.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
