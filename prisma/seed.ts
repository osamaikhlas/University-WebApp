import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import {
  PERMISSIONS,
  ROLE_DESCRIPTIONS,
  ROLE_NAMES,
  ROLE_PERMISSIONS,
} from "../src/lib/auth/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Everything in this file is either:
 *  (a) generic system taxonomy the application ships with (roles, permissions, the 20
 *      compliance requirements transcribed from the circular itself), which is not
 *      "inventing official college information" (CLAUDE.md rule 1), or
 *  (b) obviously-marked development/demo data (`isPlaceholder: true`, `[DEV SEED]` /
 *      `[PLACEHOLDER]` name prefixes, `.invalid` email addresses) that can never be
 *      mistaken for verified institutional content (CLAUDE.md rules 13, 14).
 *
 * No real college data (names, people, fees, dates, etc.) is used anywhere below.
 */

const PLACEHOLDER_COLLEGE_ID = "placeholder-college";
const DEV_SEED_USER_ID = "dev-seed-admin";
const CIRCULAR_REFERENCE = "I.C/SALU/KHP/-662, 04.09.2026";

// A dev-only login password for the 8 per-role test accounts seeded below (never a real
// college user's credential — CLAUDE.md rules 13/14). Overridable via env for CI, but
// gated so it can never be seeded into a production database (see `main()` below).
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

// Transcribed verbatim (paraphrased for brevity) from docs/compliance-matrix.md §1, which
// itself transcribes the circular's 20 required content categories. This is the fixed
// checklist every affiliated college is measured against — seeding it is system taxonomy,
// not invented college data (same rationale as ROLES above).
const COMPLIANCE_REQUIREMENTS: Array<{
  itemNumber: number;
  title: string;
  description: string;
}> = [
  {
    itemNumber: 1,
    title: "College profile",
    description: "College Profile, history, vision/mission, objectives.",
  },
  {
    itemNumber: 2,
    title: "Day-to-day activities",
    description: "Day-to-day academic/admin activities (notices, events, seminars, workshops).",
  },
  {
    itemNumber: 3,
    title: "Physical infrastructure",
    description: "Physical infrastructure of the college.",
  },
  { itemNumber: 4, title: "Faculty details", description: "Faculty details, per department." },
  {
    itemNumber: 5,
    title: "Non-teaching staff details",
    description: "Non-teaching staff details.",
  },
  {
    itemNumber: 6,
    title: "Programs and affiliation",
    description: "Programs/degrees offered plus affiliation/approval status.",
  },
  {
    itemNumber: 7,
    title: "Timetable and academic calendar",
    description: "Class/program-wise timetable and academic calendar.",
  },
  {
    itemNumber: 8,
    title: "Admission information",
    description: "Admission info: notices, eligibility, fees, schedule.",
  },
  {
    itemNumber: 9,
    title: "Enrollment statistics",
    description: "Total enrollment/admissions, program- and session-wise.",
  },
  {
    itemNumber: 10,
    title: "Examination and results info",
    description: "Examination/academic info: notices, results, announcements.",
  },
  { itemNumber: 11, title: "Contact details", description: "Contact details for the college." },
  { itemNumber: 12, title: "Location", description: "Complete location and a map link." },
  {
    itemNumber: 13,
    title: "Regulatory/affiliation status",
    description: "Regulatory/affiliation status of the college and its programs.",
  },
  {
    itemNumber: 14,
    title: "Co-curricular activities",
    description: "Co-curricular/extra-curricular activities.",
  },
  {
    itemNumber: 15,
    title: "Notifications and announcements",
    description: "General notifications and announcements.",
  },
  { itemNumber: 16, title: "Photo gallery", description: "Photo gallery of the college." },
  {
    itemNumber: 17,
    title: "Scholarships and student support",
    description: "Scholarships, financial assistance, and student support services.",
  },
  {
    itemNumber: 18,
    title: "Rules, regulations, policies",
    description: "Rules, regulations, and policies governing the college.",
  },
  {
    itemNumber: 19,
    title: "Grievance mechanism",
    description: "A reachable, confidential grievance mechanism for students/stakeholders.",
  },
  {
    itemNumber: 20,
    title: "Other required information",
    description: "Any other information required by the affiliating university/regulator.",
  },
];

async function main() {
  // --- Tenancy / RBAC (Phase 3: roles/permissions are seeded straight from
  // src/lib/auth/permissions.ts, the single source of truth for the permission matrix, so
  // the database can never drift from what the application enforces at runtime.) ---------
  for (const roleName of ROLE_NAMES) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: { description: ROLE_DESCRIPTIONS[roleName] },
      create: { name: roleName, description: ROLE_DESCRIPTIONS[roleName] },
    });
  }
  // Drop any role from an earlier taxonomy (e.g. Phase 1's lowercase baseline set) that is
  // no longer part of the required role list — this is generic system taxonomy, not real
  // college data, so reseeding it away is safe (CLAUDE.md rule 1 does not apply).
  await prisma.role.deleteMany({ where: { name: { notIn: [...ROLE_NAMES] } } });

  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }
  await prisma.permission.deleteMany({ where: { key: { notIn: [...PERMISSIONS] } } });

  for (const roleName of ROLE_NAMES) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    const permissionKeys = ROLE_PERMISSIONS[roleName];
    const permissions = await prisma.permission.findMany({
      where: { key: { in: [...permissionKeys] } },
    });

    // Replace this role's grants wholesale on every seed run, so removing a permission
    // from the matrix actually revokes it in the database, not just adds new ones.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }

  await prisma.college.upsert({
    where: { id: PLACEHOLDER_COLLEGE_ID },
    update: {
      isPlaceholder: true,
    },
    create: {
      id: PLACEHOLDER_COLLEGE_ID,
      name: "[PLACEHOLDER] Sample Affiliated College — replace with real college record",
      type: "GOVT_DEGREE",
      isPlaceholder: true,
    },
  });

  // A single dev-only account so FK fields that require a real user (uploadedBy, addedBy,
  // verifiedBy, ...) have something valid to point at in local development. `.invalid` is
  // the RFC 2606 reserved TLD for addresses that must never resolve to a real mailbox.
  const devUser = await prisma.user.upsert({
    where: { id: DEV_SEED_USER_ID },
    update: {},
    create: {
      id: DEV_SEED_USER_ID,
      collegeId: PLACEHOLDER_COLLEGE_ID,
      name: "[DEV SEED] Placeholder Admin — do not use in production",
      email: "dev-seed-admin@example.invalid",
      passwordHash: "DEV-SEED-NOT-A-REAL-HASH-DO-NOT-USE-IN-PRODUCTION",
    },
  });

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });
  await prisma.userRole.upsert({
    where: {
      userId_roleId_collegeId: {
        userId: devUser.id,
        roleId: superAdminRole.id,
        collegeId: PLACEHOLDER_COLLEGE_ID,
      },
    },
    update: {},
    create: {
      userId: devUser.id,
      roleId: superAdminRole.id,
      collegeId: PLACEHOLDER_COLLEGE_ID,
    },
  });

  // One login-capable [DEV SEED] test account per role, gated to non-production
  // environments only — these exist purely so auth can actually be logged into and
  // e2e-tested (tests/e2e/auth.spec.ts) for every role in the matrix. `devUser` above is a
  // separate, deliberately non-login-capable account used only as a FK filler for
  // createdBy/uploadedBy-style stamps.
  if (process.env.NODE_ENV !== "production") {
    const devLoginPasswordHash = await hashPassword(DEV_LOGIN_PASSWORD);

    for (const roleName of ROLE_NAMES) {
      const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
      const email = `${roleName.toLowerCase().replace(/_/g, "-")}@example.invalid`;

      const roleUser = await prisma.user.upsert({
        where: { email },
        update: { passwordHash: devLoginPasswordHash },
        create: {
          collegeId: PLACEHOLDER_COLLEGE_ID,
          name: `[DEV SEED] ${roleName} Test Account`,
          email,
          passwordHash: devLoginPasswordHash,
        },
      });

      await prisma.userRole.upsert({
        where: {
          userId_roleId_collegeId: {
            userId: roleUser.id,
            roleId: role.id,
            collegeId: PLACEHOLDER_COLLEGE_ID,
          },
        },
        update: {},
        create: { userId: roleUser.id, roleId: role.id, collegeId: PLACEHOLDER_COLLEGE_ID },
      });
    }

    console.log(
      `[DEV SEED] Login test accounts ready for all ${ROLE_NAMES.length} roles ` +
        `(<role-slug>@example.invalid / "${DEV_LOGIN_PASSWORD}"). Never seeded when NODE_ENV=production.`,
    );
  }

  // --- College profile -------------------------------------------------------------------
  await prisma.collegeProfile.upsert({
    where: { collegeId: PLACEHOLDER_COLLEGE_ID },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      collegeId: PLACEHOLDER_COLLEGE_ID,
      overview: "[PLACEHOLDER] Sample overview text — replace with real college profile copy.",
      missionStatement: "[PLACEHOLDER] Sample mission statement.",
      visionStatement: "[PLACEHOLDER] Sample vision statement.",
      history: "[PLACEHOLDER] Sample history text.",
      principalName: "[PLACEHOLDER] Principal Name",
      principalMessage: "[PLACEHOLDER] Sample principal's message.",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Academic structure ------------------------------------------------------------------
  //
  // Every content record below is seeded with `status: "PUBLISHED"` (plus `isPlaceholder:
  // true`) so the Phase 4 public site has something to render through the same publish gate
  // real content will go through (CLAUDE.md rule 4) — never bypassing it. `DemoDataNotice`
  // (src/components/DemoDataNotice.tsx) is what keeps this from being mistaken for verified
  // official content on the rendered page (rule 14).
  const department = await prisma.department.upsert({
    where: { id: "dev-seed-department" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-department",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      name: "[PLACEHOLDER] Department of Sample Studies",
      description: "[PLACEHOLDER] Sample department for local development only.",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  const program = await prisma.program.upsert({
    where: { id: "dev-seed-program" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-program",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      departmentId: department.id,
      name: "[PLACEHOLDER] BS Sample Studies",
      level: "UNDERGRADUATE",
      durationYears: 4,
      description: "[PLACEHOLDER] Sample program for local development only.",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.course.upsert({
    where: { programId_code: { programId: program.id, code: "SAMP-101" } },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
    },
    create: {
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      code: "SAMP-101",
      title: "[PLACEHOLDER] Introduction to Sample Studies",
      creditHours: 3,
      semester: 1,
      status: "PUBLISHED",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.affiliation.upsert({
    where: { id: "dev-seed-affiliation" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-affiliation",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      universityName: "[PLACEHOLDER] Sample Affiliating University",
      affiliationNumber: "[PLACEHOLDER] AFF-0000",
      regulatoryBody: "[PLACEHOLDER] Sample Regulatory Body",
      validFrom: new Date("2026-01-01"),
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- People --------------------------------------------------------------------------
  const faculty = await prisma.faculty.upsert({
    where: { id: "dev-seed-faculty" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-faculty",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      departmentId: department.id,
      name: "[PLACEHOLDER] Dr. Sample Faculty",
      designation: "[PLACEHOLDER] Assistant Professor",
      subjectsTaught: ["[PLACEHOLDER] Sample Subject"],
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.staff.upsert({
    where: { id: "dev-seed-staff" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-staff",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      name: "[PLACEHOLDER] Sample Staff Member",
      designation: "[PLACEHOLDER] Office Assistant",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.club.upsert({
    where: { id: "dev-seed-club" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-club",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      name: "[PLACEHOLDER] Sample Student Club",
      facultyAdvisorId: faculty.id,
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Infrastructure --------------------------------------------------------------------
  await prisma.infrastructure.upsert({
    where: { id: "dev-seed-infrastructure" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-infrastructure",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      category: "LIBRARY",
      name: "[PLACEHOLDER] Sample Library",
      description: "[PLACEHOLDER] Sample infrastructure record.",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Communications ---------------------------------------------------------------------
  const notice = await prisma.notice.upsert({
    where: { id: "dev-seed-notice" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-notice",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Sample Notice",
      body: "[PLACEHOLDER] Sample notice body text.",
      category: "general",
      publishDate: new Date(),
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // A second notice, already expired, purely to demonstrate that the homepage's "Important
  // announcement" banner (getImportantAnnouncement) actually excludes expired notices rather
  // than just showing whatever is newest regardless of validity.
  await prisma.notice.upsert({
    where: { id: "dev-seed-notice-expired" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date("2026-01-02"),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-notice-expired",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Expired Sample Notice",
      body: "[PLACEHOLDER] Sample notice body text for an already-expired notice.",
      category: "general",
      publishDate: new Date("2026-01-01"),
      expiryDate: new Date("2026-01-15"),
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date("2026-01-02"),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.event.upsert({
    where: { id: "dev-seed-event" },
    update: {
      // Also re-set on every seed run (not just at creation) — otherwise this row's
      // startDate freezes at whatever it was the first time this seed ever ran, and
      // eventually drifts into the past, silently breaking getUpcomingEvents()'s
      // `startDate >= now` filter.
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-event",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Sample Event",
      // 30 days out (not `new Date()`) so this row reliably satisfies
      // getUpcomingEvents()'s `startDate >= now` filter regardless of when the seed runs
      // relative to when the homepage is later viewed.
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.seminar.upsert({
    where: { id: "dev-seed-seminar" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-seminar",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      departmentId: department.id,
      title: "[PLACEHOLDER] Sample Seminar",
      speaker: "[PLACEHOLDER] Sample Speaker",
      startDate: new Date(),
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.workshop.upsert({
    where: { id: "dev-seed-workshop" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-workshop",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      departmentId: department.id,
      title: "[PLACEHOLDER] Sample Workshop",
      facilitator: "[PLACEHOLDER] Sample Facilitator",
      startDate: new Date(),
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.activity.upsert({
    where: { id: "dev-seed-activity" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-activity",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Sample Co-curricular Activity",
      category: "co-curricular",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Calendar & scheduling ---------------------------------------------------------------
  await prisma.academicCalendar.upsert({
    where: { id: "dev-seed-calendar-entry" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-calendar-entry",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Sample Semester Start",
      startDate: new Date("2026-09-01"),
      academicYear: "2026-2027",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.timetable.upsert({
    where: { id: "dev-seed-timetable" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-timetable",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      classGroup: "[PLACEHOLDER] Semester 1 - Section A",
      effectiveFrom: new Date("2026-09-01"),
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Admissions & enrollment -------------------------------------------------------------
  const admission = await prisma.admission.upsert({
    where: { id: "dev-seed-admission" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-admission",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      academicYear: "2026-2027",
      eligibilityCriteria: "[PLACEHOLDER] Sample eligibility criteria.",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.feeStructure.upsert({
    where: { id: "dev-seed-fee-structure" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
    },
    create: {
      id: "dev-seed-fee-structure",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      admissionId: admission.id,
      academicYear: "2026-2027",
      feeType: "tuition",
      amount: "0.00",
      status: "PUBLISHED",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.enrollmentStatistic.upsert({
    where: { id: "dev-seed-enrollment-stat" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
    },
    create: {
      id: "dev-seed-enrollment-stat",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      academicYear: "2026-2027",
      sessionType: "morning",
      totalEnrolled: 0,
      status: "PUBLISHED",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Examinations & results --------------------------------------------------------------
  const examination = await prisma.examination.upsert({
    where: { id: "dev-seed-examination" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-examination",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      examType: "[PLACEHOLDER] Mid-term",
      academicYear: "2026-2027",
      noticeId: notice.id,
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.result.upsert({
    where: { id: "dev-seed-result" },
    update: {
      isPublic: true,
      status: "PUBLISHED",
      isPlaceholder: true,
    },
    create: {
      id: "dev-seed-result",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      examinationId: examination.id,
      // Demonstrates the rule-4 gate for real: this row is deliberately public (isPublic +
      // PUBLISHED) so /results can show it, while every other seeded content row keeps its
      // own independent publish state — nothing here is auto-derived.
      isPublic: true,
      status: "PUBLISHED",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Contact & location ------------------------------------------------------------------
  await prisma.contact.upsert({
    where: { id: "dev-seed-contact" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
    },
    create: {
      id: "dev-seed-contact",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      type: "EMAIL",
      value: "info@example.invalid",
      label: "[PLACEHOLDER] General Enquiries",
      status: "PUBLISHED",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.location.upsert({
    where: { id: "dev-seed-location" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
    },
    create: {
      id: "dev-seed-location",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      address: "[PLACEHOLDER] Sample Address, Sample City",
      status: "PUBLISHED",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Gallery -------------------------------------------------------------------------
  const media = await prisma.media.upsert({
    where: { id: "dev-seed-media" },
    update: {
      isPlaceholder: true,
    },
    create: {
      id: "dev-seed-media",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      url: "https://example.invalid/placeholder.jpg",
      altText: "[PLACEHOLDER] Sample image — replace with a real, described photo.",
      uploadedById: devUser.id,
      isPlaceholder: true,
    },
  });

  const album = await prisma.galleryAlbum.upsert({
    where: { id: "dev-seed-gallery-album" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-gallery-album",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Sample Gallery Album",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.galleryItem.upsert({
    where: { id: "dev-seed-gallery-item" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-gallery-item",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      albumId: album.id,
      mediaId: media.id,
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Student support ---------------------------------------------------------------------
  await prisma.scholarship.upsert({
    where: { id: "dev-seed-scholarship" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-scholarship",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      name: "[PLACEHOLDER] Sample Scholarship",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.studentSupport.upsert({
    where: { id: "dev-seed-student-support" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-student-support",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      name: "[PLACEHOLDER] Sample Student Support Service",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Policies -------------------------------------------------------------------------
  await prisma.policy.upsert({
    where: { id: "dev-seed-policy" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-policy",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Sample Policy",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.regulation.upsert({
    where: { id: "dev-seed-regulation" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-regulation",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Sample Regulation",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Grievance (dev/demo submission only — never real, never public) ---------------------
  const grievance = await prisma.grievance.upsert({
    where: { id: "dev-seed-grievance" },
    update: {
      status: "NEW",
      isPlaceholder: true,
    },
    create: {
      id: "dev-seed-grievance",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      submitterName: "[DEV SEED] Anonymous Test Submitter",
      description: "[DEV SEED] Sample grievance description for local development only.",
      category: "general",
      status: "NEW",
      assignedToId: devUser.id,
      isPlaceholder: true,
      updatedBy: devUser.id,
    },
  });

  await prisma.grievanceNote.upsert({
    where: { id: "dev-seed-grievance-note" },
    update: {},
    create: {
      id: "dev-seed-grievance-note",
      grievanceId: grievance.id,
      authorId: devUser.id,
      note: "[DEV SEED] Sample internal case note.",
    },
  });

  // --- Documents -----------------------------------------------------------------------
  await prisma.document.upsert({
    where: { id: "dev-seed-document" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-document",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      entityType: "Notice",
      entityId: notice.id,
      category: "attachment",
      title: "[PLACEHOLDER] Sample Attachment",
      fileUrl: "https://example.invalid/placeholder.pdf",
      mimeType: "application/pdf",
      uploadedById: devUser.id,
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Compliance model ------------------------------------------------------------------
  for (const requirement of COMPLIANCE_REQUIREMENTS) {
    await prisma.complianceRequirement.upsert({
      where: {
        collegeId_itemNumber: {
          collegeId: PLACEHOLDER_COLLEGE_ID,
          itemNumber: requirement.itemNumber,
        },
      },
      update: {},
      create: {
        collegeId: PLACEHOLDER_COLLEGE_ID,
        itemNumber: requirement.itemNumber,
        title: requirement.title,
        description: requirement.description,
        circularReference: CIRCULAR_REFERENCE,
        category: "CONTENT",
        ownerId: devUser.id,
      },
    });
  }

  // One worked example of the evidence -> verification flow, for local development only.
  // This is NOT a real compliance verification — CLAUDE.md rule 7 requires an authorized
  // human decision in the real system; this seed row exists only so the dev environment has
  // one non-empty example of each table to build the Compliance Dashboard UI against.
  const facultyRequirement = await prisma.complianceRequirement.findUniqueOrThrow({
    where: { collegeId_itemNumber: { collegeId: PLACEHOLDER_COLLEGE_ID, itemNumber: 4 } },
  });

  await prisma.complianceEvidence.upsert({
    where: { id: "dev-seed-compliance-evidence" },
    update: {},
    create: {
      id: "dev-seed-compliance-evidence",
      requirementId: facultyRequirement.id,
      entityType: "Faculty",
      entityId: faculty.id,
      note: "[DEV SEED] Example evidence linkage only — not a real compliance submission.",
      addedById: devUser.id,
    },
  });

  await prisma.complianceVerification.upsert({
    where: { id: "dev-seed-compliance-verification" },
    update: {},
    create: {
      id: "dev-seed-compliance-verification",
      requirementId: facultyRequirement.id,
      decision: "VERIFIED",
      verifiedById: devUser.id,
    },
  });

  await prisma.complianceRequirement.update({
    where: { id: facultyRequirement.id },
    data: { status: "VERIFIED" },
  });

  // --- Audit log & notifications -----------------------------------------------------------
  await prisma.auditLog.upsert({
    where: { id: "dev-seed-audit-log" },
    update: {},
    create: {
      id: "dev-seed-audit-log",
      actorId: devUser.id,
      action: "CREATE",
      entityType: "College",
      entityId: PLACEHOLDER_COLLEGE_ID,
      afterSnapshot: { isPlaceholder: true, note: "[DEV SEED] example audit log entry" },
    },
  });

  await prisma.notification.upsert({
    where: { id: "dev-seed-notification" },
    update: {},
    create: {
      id: "dev-seed-notification",
      userId: devUser.id,
      type: "compliance.verified",
      message: "[DEV SEED] Example notification — Faculty compliance item marked verified.",
      relatedEntityType: "ComplianceRequirement",
      relatedEntityId: facultyRequirement.id,
    },
  });

  console.log(
    "Seed complete: baseline roles, one placeholder college, one dev-seed admin user, " +
      "20 compliance requirements (from the circular), and one clearly-marked demo record " +
      "per content module.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
