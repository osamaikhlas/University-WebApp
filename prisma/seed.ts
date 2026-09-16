import { createCipheriv, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import {
  PERMISSIONS,
  ROLE_DESCRIPTIONS,
  ROLE_NAMES,
  ROLE_PERMISSIONS,
} from "../src/lib/auth/permissions";

/**
 * A standalone copy of `src/lib/security/crypto.ts`'s `encryptSecret` (same algorithm/format),
 * not an import of it: that module starts with `import "server-only"`, which throws when
 * loaded outside Next's server module graph — as this plain `tsx`-run script is. Duplicated
 * rather than stripping the guard from the real module, since that guard is exactly what
 * should keep `GRIEVANCE_ENCRYPTION_KEY` out of any accidental client bundle in the app itself.
 */
function seedEncryptSecret(plainText: string): string {
  const key = Buffer.from(process.env.GRIEVANCE_ENCRYPTION_KEY ?? "", "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * A standalone copy of `src/lib/security/upload-storage.ts`'s storage layout (same reasoning
 * as `seedEncryptSecret` above — that module is `import "server-only"`-guarded). Writes a
 * tiny real placeholder file so the seeded Document/Media rows work end-to-end through the
 * actual file-serving routes (src/app/api/files/*), not just as inert database rows.
 */
const UPLOAD_STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

async function seedWritePlaceholderFile(
  kind: "document" | "media",
  entityId: string,
  fileName: string,
  contents: Buffer,
): Promise<string> {
  const directory = path.join(UPLOAD_STORAGE_ROOT, kind, entityId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, fileName), contents);
  return path.join(kind, entityId, fileName);
}

// A minimal valid 1x1 transparent PNG.
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

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

  // Demo dataset supplied by the user 2026-09-16 for exercising the CMS end-to-end — NOT a
  // verified official college record (CLAUDE.md rule 1). `.example` (RFC 2606) email/website
  // values and the "[PLACEHOLDER]"-prefixed name plus `isPlaceholder: true` keep this from ever
  // being mistaken for real institutional data (rule 14); it must go through the normal
  // draft -> review -> publish workflow like any other content before appearing publicly, and
  // real verified data must replace it before go-live (rule 1).
  const DEMO_COLLEGE_NAME =
    "[PLACEHOLDER] Government College of Education, Khairpur (GCE Khairpur) — demo data, not a verified official record";

  await prisma.college.upsert({
    where: { id: PLACEHOLDER_COLLEGE_ID },
    update: {
      name: DEMO_COLLEGE_NAME,
      type: "EDUCATION",
      isPlaceholder: true,
    },
    create: {
      id: PLACEHOLDER_COLLEGE_ID,
      name: DEMO_COLLEGE_NAME,
      type: "EDUCATION",
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
  // Richer demo profile content supplied by the user 2026-09-16, explicitly flagged by them
  // as dummy/fictional data (see their "DEMO DATA ONLY" / "fictional demonstration
  // institution" annotations) — same isPlaceholder: true treatment as everything else here,
  // never entered as verified official content (CLAUDE.md rule 1).
  const DEMO_PROFILE_FIELDS = {
    overview:
      "[PLACEHOLDER] Government College of Education, Khairpur (short name: GCE Khairpur) is a fictional demonstration institution created for development and testing of the university-affiliated college web application. It is presented as an Education College. Objectives (demo data): provide quality teacher education programs; develop professional teaching competencies; promote educational research and innovation; encourage technology-supported teaching and learning; support community engagement and lifelong learning; develop leadership and communication skills among future educators.",
    missionStatement:
      "[PLACEHOLDER] To prepare competent, ethical, reflective, and technologically capable educators through quality teacher education, practical training, research, and continuous professional development.",
    visionStatement:
      "[PLACEHOLDER] To become a leading center for teacher education, professional development, innovation, and community engagement.",
    history:
      "[PLACEHOLDER] Demo data: established 1998. Replace with real, verified college history.",
    principalName: "[PLACEHOLDER] Dr. Ayesha Rahman (demo data, not verified)",
    principalMessage:
      "[PLACEHOLDER] Welcome to the official demonstration website of Government College of Education, Khairpur. Our goal is to provide an accessible and reliable digital platform through which students, parents, faculty members, staff, regulatory authorities, and the general public can access important institutional information. The college is committed to quality teacher education, professional development, academic integrity, innovation, and responsible use of technology. This website is designed to make academic information, admissions, notices, events, faculty information, student support services, policies, and other official information easy to access. We believe that effective education depends on competent teachers, supportive learning environments, continuous improvement, and meaningful engagement with the wider community. — Dr. Ayesha Rahman, Principal, Government College of Education, Khairpur (DEMO DATA ONLY)",
  };
  await prisma.collegeProfile.upsert({
    where: { collegeId: PLACEHOLDER_COLLEGE_ID },
    update: {
      ...DEMO_PROFILE_FIELDS,
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      collegeId: PLACEHOLDER_COLLEGE_ID,
      ...DEMO_PROFILE_FIELDS,
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
  // Dummy departments supplied by the user 2026-09-16 for GCE Khairpur (demo college) — same
  // isPlaceholder: true treatment as the rest of this file (CLAUDE.md rule 1/14). The schema
  // has no dedicated `code` column on Department, so each department's code is folded into
  // its name (matching how a real college's own naming would typically present it).
  const DEMO_DEPARTMENTS: Array<{ id: string; name: string; description: string }> = [
    {
      id: "dev-seed-department",
      name: "[PLACEHOLDER] Department of Elementary Education (DEE)",
      description:
        "[PLACEHOLDER] Provides teacher education and professional preparation for elementary-level teaching. (demo data)",
    },
    {
      id: "dev-seed-department-dse",
      name: "[PLACEHOLDER] Department of Secondary Education (DSE)",
      description:
        "[PLACEHOLDER] Focuses on secondary-level teaching methods, pedagogy, curriculum, and assessment. (demo data)",
    },
    {
      id: "dev-seed-department-dep",
      name: "[PLACEHOLDER] Department of Educational Psychology (DEP)",
      description:
        "[PLACEHOLDER] Covers educational psychology, learning theories, student development, and guidance. (demo data)",
    },
    {
      id: "dev-seed-department-dci",
      name: "[PLACEHOLDER] Department of Curriculum and Instruction (DCI)",
      description:
        "[PLACEHOLDER] Focuses on curriculum development, instructional design, and classroom practices. (demo data)",
    },
    {
      id: "dev-seed-department-det",
      name: "[PLACEHOLDER] Department of Educational Technology (DET)",
      description:
        "[PLACEHOLDER] Promotes digital learning, educational technology, ICT integration, and online teaching. (demo data)",
    },
  ];

  let department: Awaited<ReturnType<typeof prisma.department.upsert>> | undefined;
  for (const dept of DEMO_DEPARTMENTS) {
    const upserted = await prisma.department.upsert({
      where: { id: dept.id },
      update: {
        name: dept.name,
        description: dept.description,
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: dept.id,
        collegeId: PLACEHOLDER_COLLEGE_ID,
        name: dept.name,
        description: dept.description,
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
    // dev-seed-department (Elementary Education) stays the one wired into the
    // program/course/faculty/etc. seed data below, so those records don't need touching.
    if (dept.id === "dev-seed-department") department = upserted;
  }
  if (!department) throw new Error("dev-seed-department was not seeded");

  // Dummy programs supplied by the user 2026-09-16 for GCE Khairpur (demo college) — same
  // isPlaceholder: true treatment as the rest of this file (CLAUDE.md rule 1/14). The schema
  // has no `mode`, program-active `status`, or `affiliationStatus` columns (ContentStatus is
  // the draft/publish workflow status, not an "Active"/"Inactive" offering flag), and
  // `durationYears` is an Int, so all of that — plus the exact "1.5 Years" duration, which an
  // Int can't represent — is folded into `description`, with the closest whole-year value
  // used for `durationYears` itself. None of the source departments map obviously onto these
  // general teacher-education programs, so all four are linked to the existing wired
  // department (Elementary Education) rather than guessing a split.
  const DEMO_PROGRAMS: Array<{
    id: string;
    name: string;
    level: "UNDERGRADUATE" | "GRADUATE";
    durationYears: number;
    description: string;
  }> = [
    {
      id: "dev-seed-program",
      name: "[PLACEHOLDER] Bachelor of Education (B.Ed.)",
      level: "UNDERGRADUATE",
      durationYears: 4,
      description:
        "[PLACEHOLDER] 4-year undergraduate program. Mode: Regular. Program status: Active. Affiliation status: Demo affiliation record. (demo data)",
    },
    {
      id: "dev-seed-program-ade",
      name: "[PLACEHOLDER] Associate Degree in Education (ADE)",
      level: "UNDERGRADUATE",
      durationYears: 2,
      description:
        "[PLACEHOLDER] 2-year undergraduate program. Mode: Regular. Program status: Active. Affiliation status: Demo affiliation record. (demo data)",
    },
    {
      id: "dev-seed-program-bed-1-5",
      name: "[PLACEHOLDER] B.Ed. (1.5 Year)",
      level: "UNDERGRADUATE",
      durationYears: 2,
      description:
        "[PLACEHOLDER] Undergraduate/Professional program — exact duration is 1.5 years (durationYears stores the rounded whole-year value 2, since the field is an integer). Mode: Regular. Program status: Active. Affiliation status: Demo affiliation record. (demo data)",
    },
    {
      id: "dev-seed-program-med",
      name: "[PLACEHOLDER] Master of Education (M.Ed.)",
      level: "GRADUATE",
      durationYears: 2,
      description:
        "[PLACEHOLDER] 2-year graduate program. Mode: Regular. Program status: Active. Affiliation status: Demo affiliation record. (demo data)",
    },
  ];

  let program: Awaited<ReturnType<typeof prisma.program.upsert>> | undefined;
  for (const prog of DEMO_PROGRAMS) {
    const upserted = await prisma.program.upsert({
      where: { id: prog.id },
      update: {
        name: prog.name,
        level: prog.level,
        durationYears: prog.durationYears,
        description: prog.description,
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: prog.id,
        collegeId: PLACEHOLDER_COLLEGE_ID,
        departmentId: department.id,
        name: prog.name,
        level: prog.level,
        durationYears: prog.durationYears,
        description: prog.description,
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
    // dev-seed-program (B.Ed.) stays the one wired into the course/affiliation/admission/
    // fee/enrollment/timetable/exam/result seed data below, so those records don't need
    // touching.
    if (prog.id === "dev-seed-program") program = upserted;
  }
  if (!program) throw new Error("dev-seed-program was not seeded");

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

  // universityName below is the real university this circular is from (docs/requirements.md) —
  // not fabricated — but the affiliation record itself (number, regulatory body, validity
  // dates, and the claim that this specific demo college holds it) is unverified demo data, so
  // it stays isPlaceholder: true until a competent authority confirms it (CLAUDE.md rule 1/7).
  await prisma.affiliation.upsert({
    where: { id: "dev-seed-affiliation" },
    update: {
      universityName: "Shah Abdul Latif University, Khairpur",
      affiliationNumber: "[PLACEHOLDER] AFF-0000 (demo data, not verified)",
      regulatoryBody: "[PLACEHOLDER] Demo recognition record for development and testing only",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-affiliation",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      universityName: "Shah Abdul Latif University, Khairpur",
      affiliationNumber: "[PLACEHOLDER] AFF-0000 (demo data, not verified)",
      regulatoryBody: "[PLACEHOLDER] Demo recognition record for development and testing only",
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
  // Dummy faculty supplied by the user 2026-09-16 for GCE Khairpur (demo college) — same
  // isPlaceholder: true treatment as the rest of this file (CLAUDE.md rule 1/14). Departments
  // are matched by name to the DEMO_DEPARTMENTS seeded above; "Dr. Ayesha Rahman" reuses the
  // same demo name already used for the college's placeholder Principal (CollegeProfile
  // above) since the user's own data names her as both Principal and a faculty member here.
  const DEMO_FACULTY: Array<{
    id: string;
    name: string;
    designation: string;
    qualifications: string;
    departmentId: string;
    subjectsTaught: string[];
  }> = [
    {
      id: "dev-seed-faculty",
      name: "[PLACEHOLDER] Dr. Ayesha Rahman (demo data, not verified)",
      designation: "[PLACEHOLDER] Principal / Professor",
      qualifications: "[PLACEHOLDER] Ph.D. in Education",
      departmentId: "dev-seed-department-dci",
      subjectsTaught: ["[PLACEHOLDER] Educational Leadership", "[PLACEHOLDER] Curriculum Studies"],
    },
    {
      id: "dev-seed-faculty-salman-ahmed",
      name: "[PLACEHOLDER] Dr. Salman Ahmed (demo data)",
      designation: "[PLACEHOLDER] Associate Professor",
      qualifications: "[PLACEHOLDER] Ph.D. in Educational Psychology",
      departmentId: "dev-seed-department-dep",
      subjectsTaught: [
        "[PLACEHOLDER] Educational Psychology",
        "[PLACEHOLDER] Child Development",
        "[PLACEHOLDER] Guidance and Counseling",
      ],
    },
    {
      id: "dev-seed-faculty-nadia-hussain",
      name: "[PLACEHOLDER] Ms. Nadia Hussain (demo data)",
      designation: "[PLACEHOLDER] Assistant Professor",
      qualifications: "[PLACEHOLDER] M.Phil. Education",
      departmentId: "dev-seed-department",
      subjectsTaught: [
        "[PLACEHOLDER] Elementary Teaching Methods",
        "[PLACEHOLDER] Assessment and Evaluation",
      ],
    },
    {
      id: "dev-seed-faculty-imran-ali",
      name: "[PLACEHOLDER] Mr. Imran Ali (demo data)",
      designation: "[PLACEHOLDER] Lecturer",
      qualifications: "[PLACEHOLDER] M.Phil. Education",
      departmentId: "dev-seed-department-dse",
      subjectsTaught: [
        "[PLACEHOLDER] Secondary Teaching Methods",
        "[PLACEHOLDER] Classroom Management",
      ],
    },
    {
      id: "dev-seed-faculty-sana-malik",
      name: "[PLACEHOLDER] Ms. Sana Malik (demo data)",
      designation: "[PLACEHOLDER] Lecturer",
      qualifications: "[PLACEHOLDER] MS Educational Technology",
      departmentId: "dev-seed-department-det",
      subjectsTaught: ["[PLACEHOLDER] ICT in Education", "[PLACEHOLDER] Digital Learning"],
    },
  ];

  let faculty: Awaited<ReturnType<typeof prisma.faculty.upsert>> | undefined;
  for (const member of DEMO_FACULTY) {
    const upserted = await prisma.faculty.upsert({
      where: { id: member.id },
      update: {
        name: member.name,
        designation: member.designation,
        qualifications: member.qualifications,
        departmentId: member.departmentId,
        subjectsTaught: member.subjectsTaught,
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: member.id,
        collegeId: PLACEHOLDER_COLLEGE_ID,
        departmentId: member.departmentId,
        name: member.name,
        designation: member.designation,
        qualifications: member.qualifications,
        subjectsTaught: member.subjectsTaught,
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
    // dev-seed-faculty (Dr. Ayesha Rahman) stays the one wired into the Club advisor seed
    // data below, so that record doesn't need touching.
    if (member.id === "dev-seed-faculty") faculty = upserted;
  }
  if (!faculty) throw new Error("dev-seed-faculty was not seeded");

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
  // Dummy infrastructure supplied by the user 2026-09-16 for GCE Khairpur (demo college) —
  // same isPlaceholder: true treatment as the rest of this file (CLAUDE.md rule 1/14). The
  // schema's InfrastructureCategory enum has no "Building"/"Hall" values, so those two map to
  // OTHER, with the source type preserved in the description; "Laboratory" items map to
  // COMPUTER_LAB or LAB depending on whether they're specifically computer/ICT-focused.
  const DEMO_INFRASTRUCTURE: Array<{
    id: string;
    category:
      | "CLASSROOM"
      | "LAB"
      | "LIBRARY"
      | "COMPUTER_LAB"
      | "MOOT_COURT"
      | "OFFICE"
      | "SPORTS"
      | "OTHER";
    name: string;
    description: string;
  }> = [
    {
      id: "dev-seed-infrastructure-main-block",
      category: "OTHER",
      name: "[PLACEHOLDER] Main Academic Block",
      description:
        "[PLACEHOLDER] Main teaching and administrative building. Type: Building. (demo data)",
    },
    {
      id: "dev-seed-infrastructure",
      category: "LIBRARY",
      name: "[PLACEHOLDER] Central Library",
      description:
        "[PLACEHOLDER] Academic library with printed and digital educational resources. Type: Library. (demo data)",
    },
    {
      id: "dev-seed-infrastructure-computer-lab",
      category: "COMPUTER_LAB",
      name: "[PLACEHOLDER] Computer Laboratory",
      description:
        "[PLACEHOLDER] Computer lab for ICT and digital-learning activities. Type: Laboratory. (demo data)",
    },
    {
      id: "dev-seed-infrastructure-edtech-lab",
      category: "COMPUTER_LAB",
      name: "[PLACEHOLDER] Educational Technology Lab",
      description:
        "[PLACEHOLDER] Lab for multimedia-based teaching and educational technology demonstrations. Type: Laboratory. (demo data)",
    },
    {
      id: "dev-seed-infrastructure-science-lab",
      category: "LAB",
      name: "[PLACEHOLDER] Science Laboratory",
      description:
        "[PLACEHOLDER] General science laboratory for practical teacher-training activities. Type: Laboratory. (demo data)",
    },
    {
      id: "dev-seed-infrastructure-seminar-hall",
      category: "OTHER",
      name: "[PLACEHOLDER] Seminar Hall",
      description:
        "[PLACEHOLDER] Venue for seminars, workshops, conferences, and institutional events. Type: Hall. (demo data)",
    },
    {
      id: "dev-seed-infrastructure-sports-ground",
      category: "SPORTS",
      name: "[PLACEHOLDER] Sports Ground",
      description:
        "[PLACEHOLDER] Outdoor facility for student sports and recreational activities. Type: Sports. (demo data)",
    },
  ];

  for (const item of DEMO_INFRASTRUCTURE) {
    await prisma.infrastructure.upsert({
      where: { id: item.id },
      update: {
        category: item.category,
        name: item.name,
        description: item.description,
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: item.id,
        collegeId: PLACEHOLDER_COLLEGE_ID,
        category: item.category,
        name: item.name,
        description: item.description,
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

  // --- Communications ---------------------------------------------------------------------
  // Demo notices supplied by the user 2026-09-16 for GCE Khairpur (demo college) — same
  // isPlaceholder: true treatment as the rest of this file (CLAUDE.md rule 1/14). Notice has
  // no `priority` column, so each notice's priority is folded into `body`.
  const DEMO_NOTICES: Array<{ id: string; title: string; category: string; body: string }> = [
    {
      id: "dev-seed-notice",
      title: "[PLACEHOLDER] Admissions Open for Academic Year 2026-27",
      category: "Admissions",
      body:
        "[PLACEHOLDER] Applications are invited for selected teacher-education programs for the 2026-27 academic year. Priority: High. (demo data)",
    },
    {
      id: "dev-seed-notice-orientation",
      title: "[PLACEHOLDER] Orientation Program for New Students",
      category: "Academic",
      body:
        "[PLACEHOLDER] An orientation session has been scheduled for newly admitted students. Priority: Normal. (demo data)",
    },
    {
      id: "dev-seed-notice-faculty-workshop",
      title: "[PLACEHOLDER] Faculty Development Workshop",
      category: "Workshop",
      body:
        "[PLACEHOLDER] A professional development workshop on technology-supported teaching will be conducted. Priority: Normal. (demo data)",
    },
  ];

  let notice: Awaited<ReturnType<typeof prisma.notice.upsert>> | undefined;
  for (const item of DEMO_NOTICES) {
    const upserted = await prisma.notice.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        body: item.body,
        category: item.category,
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: item.id,
        collegeId: PLACEHOLDER_COLLEGE_ID,
        title: item.title,
        body: item.body,
        category: item.category,
        publishDate: new Date(),
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
    // dev-seed-notice (Admissions Open) stays the one wired into the Examination/audit-log
    // seed data below, so those records don't need touching.
    if (item.id === "dev-seed-notice") notice = upserted;
  }
  if (!notice) throw new Error("dev-seed-notice was not seeded");

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

  // Demo events supplied by the user 2026-09-16 for GCE Khairpur (demo college) — same
  // isPlaceholder: true treatment as the rest of this file (CLAUDE.md rule 1/14), using the
  // fixed 2026 dates given (consistent with the rest of this fictional Fall 2026 semester's
  // demo data — academic calendar, admission cycle, etc.).
  //
  // Trade-off vs. the previous single dev-seed-event: that row deliberately used a
  // `Date.now() + 30 days` startDate, re-set on every seed run, so it always satisfied
  // getUpcomingEvents()'s `startDate >= now` filter and the homepage's "Upcoming events"
  // section was never empty regardless of when the seed last ran. These three events have
  // fixed dates instead, so once 2026-11-02 passes, none of them will show as upcoming until
  // this block's dates are refreshed to a later semester.
  const DEMO_EVENTS: Array<{
    id: string;
    title: string;
    startDate: string;
    location: string;
    description: string;
  }> = [
    {
      id: "dev-seed-event",
      title: "[PLACEHOLDER] Teacher Education Seminar 2026",
      startDate: "2026-09-25",
      location: "Seminar Hall",
      description:
        "[PLACEHOLDER] A demonstration seminar focusing on contemporary issues in teacher education. (demo data)",
    },
    {
      id: "dev-seed-event-edtech-workshop",
      title: "[PLACEHOLDER] Educational Technology Workshop",
      startDate: "2026-10-08",
      location: "Educational Technology Lab",
      description:
        "[PLACEHOLDER] Hands-on workshop on digital tools for classroom teaching. (demo data)",
    },
    {
      id: "dev-seed-event-sports-week",
      title: "[PLACEHOLDER] Annual Sports Week",
      startDate: "2026-11-02",
      location: "College Sports Ground",
      description: "[PLACEHOLDER] Annual student sports and recreational activities. (demo data)",
    },
  ];

  for (const item of DEMO_EVENTS) {
    await prisma.event.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        startDate: new Date(item.startDate),
        location: item.location,
        description: item.description,
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: item.id,
        collegeId: PLACEHOLDER_COLLEGE_ID,
        title: item.title,
        startDate: new Date(item.startDate),
        location: item.location,
        description: item.description,
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

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
  // Demo academic calendar supplied by the user 2026-09-16 for GCE Khairpur (demo college) —
  // same isPlaceholder: true treatment as the rest of this file (CLAUDE.md rule 1/14).
  const DEMO_CALENDAR_ENTRIES: Array<{
    id: string;
    title: string;
    startDate: string;
    endDate: string;
  }> = [
    {
      id: "dev-seed-calendar-entry",
      title: "[PLACEHOLDER] Orientation Week",
      startDate: "2026-08-10",
      endDate: "2026-08-14",
    },
    {
      id: "dev-seed-calendar-entry-fall-semester",
      title: "[PLACEHOLDER] Fall Semester",
      startDate: "2026-08-17",
      endDate: "2026-12-18",
    },
    {
      id: "dev-seed-calendar-entry-midterms",
      title: "[PLACEHOLDER] Mid-Term Examinations",
      startDate: "2026-10-19",
      endDate: "2026-10-24",
    },
    {
      id: "dev-seed-calendar-entry-finals",
      title: "[PLACEHOLDER] Final Examinations",
      startDate: "2026-12-07",
      endDate: "2026-12-18",
    },
    {
      id: "dev-seed-calendar-entry-winter-break",
      title: "[PLACEHOLDER] Winter Break",
      startDate: "2026-12-21",
      endDate: "2027-01-08",
    },
  ];

  for (const entry of DEMO_CALENDAR_ENTRIES) {
    await prisma.academicCalendar.upsert({
      where: { id: entry.id },
      update: {
        title: entry.title,
        startDate: new Date(entry.startDate),
        endDate: new Date(entry.endDate),
        academicYear: "2026-27",
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: entry.id,
        collegeId: PLACEHOLDER_COLLEGE_ID,
        title: entry.title,
        startDate: new Date(entry.startDate),
        endDate: new Date(entry.endDate),
        academicYear: "2026-27",
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

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
  // Demo admission info supplied by the user 2026-09-16 for GCE Khairpur (demo college) —
  // same isPlaceholder: true treatment as the rest of this file (CLAUDE.md rule 1/14). The
  // schema has no `classesStart`/`requiredDocuments` columns on Admission — only a single
  // free-text `eligibilityCriteria` field alongside the application window dates — so those,
  // plus the eligibility list, are folded into `eligibilityCriteria` as labeled sections.
  // Rendered inline in a table cell on the public Admissions page (normal HTML whitespace
  // collapsing applies), so this stays one flowing, semicolon-separated paragraph rather than
  // newline-separated bullets.
  const DEMO_ADMISSION_ELIGIBILITY =
    "[PLACEHOLDER] Eligibility (demo data): applicants must satisfy the eligibility requirements of the relevant program; applicants must submit the required academic documents; admission is subject to available seats and applicable institutional rules. " +
    "Required documents (demo data): CNIC/B-Form copy, recent photographs, previous academic certificates, domicile, character certificate. " +
    "Classes start (demo data): 2026-08-17.";

  const admission = await prisma.admission.upsert({
    where: { id: "dev-seed-admission" },
    update: {
      academicYear: "2026-27",
      eligibilityCriteria: DEMO_ADMISSION_ELIGIBILITY,
      applicationStartDate: new Date("2026-06-01"),
      applicationEndDate: new Date("2026-07-15"),
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-admission",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      academicYear: "2026-27",
      eligibilityCriteria: DEMO_ADMISSION_ELIGIBILITY,
      applicationStartDate: new Date("2026-06-01"),
      applicationEndDate: new Date("2026-07-15"),
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // Demo fee structure supplied by the user 2026-09-16 for GCE Khairpur (demo college) — same
  // isPlaceholder: true treatment as the rest of this file (CLAUDE.md rule 1/14).
  // FeeStructure is one row per fee type (not one row with multiple fee columns), so each
  // program's admission/tuition/exam/other charges become 4 separate rows. Only the B.Ed.
  // program (dev-seed-program) has an admission cycle seeded above, so only its rows link
  // admissionId; ADE has no seeded Admission record to link to.
  const DEMO_FEE_STRUCTURES: Array<{
    id: string;
    programId: string;
    admissionId: string | null;
    feeType: string;
    amount: string;
  }> = [
    {
      id: "dev-seed-fee-structure",
      programId: "dev-seed-program",
      admissionId: admission.id,
      feeType: "[PLACEHOLDER] Admission Fee",
      amount: "5000.00",
    },
    {
      id: "dev-seed-fee-structure-bed-tuition",
      programId: "dev-seed-program",
      admissionId: admission.id,
      feeType: "[PLACEHOLDER] Tuition (per semester)",
      amount: "25000.00",
    },
    {
      id: "dev-seed-fee-structure-bed-exam",
      programId: "dev-seed-program",
      admissionId: admission.id,
      feeType: "[PLACEHOLDER] Examination Fee",
      amount: "3000.00",
    },
    {
      id: "dev-seed-fee-structure-bed-other",
      programId: "dev-seed-program",
      admissionId: admission.id,
      feeType: "[PLACEHOLDER] Other Charges",
      amount: "2000.00",
    },
    {
      id: "dev-seed-fee-structure-ade-admission",
      programId: "dev-seed-program-ade",
      admissionId: null,
      feeType: "[PLACEHOLDER] Admission Fee",
      amount: "4000.00",
    },
    {
      id: "dev-seed-fee-structure-ade-tuition",
      programId: "dev-seed-program-ade",
      admissionId: null,
      feeType: "[PLACEHOLDER] Tuition (per semester)",
      amount: "18000.00",
    },
    {
      id: "dev-seed-fee-structure-ade-exam",
      programId: "dev-seed-program-ade",
      admissionId: null,
      feeType: "[PLACEHOLDER] Examination Fee",
      amount: "2500.00",
    },
    {
      id: "dev-seed-fee-structure-ade-other",
      programId: "dev-seed-program-ade",
      admissionId: null,
      feeType: "[PLACEHOLDER] Other Charges",
      amount: "1500.00",
    },
  ];

  for (const fee of DEMO_FEE_STRUCTURES) {
    await prisma.feeStructure.upsert({
      where: { id: fee.id },
      update: {
        programId: fee.programId,
        admissionId: fee.admissionId,
        academicYear: "2026-27",
        feeType: fee.feeType,
        amount: fee.amount,
        currency: "PKR",
        status: "PUBLISHED",
        isPlaceholder: true,
      },
      create: {
        id: fee.id,
        collegeId: PLACEHOLDER_COLLEGE_ID,
        programId: fee.programId,
        admissionId: fee.admissionId,
        academicYear: "2026-27",
        feeType: fee.feeType,
        amount: fee.amount,
        currency: "PKR",
        status: "PUBLISHED",
        isPlaceholder: true,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

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
  // Demo contact points supplied by the user 2026-09-16 (see the College block above for why
  // these are isPlaceholder despite looking realistic — RFC 2606 .example addresses, not real
  // reachable contacts).
  const demoContacts: Array<{ id: string; type: "EMAIL" | "PHONE" | "OTHER"; value: string; label: string }> = [
    {
      id: "dev-seed-contact",
      type: "EMAIL",
      value: "info@gce-khairpur.example",
      label: "[PLACEHOLDER] General Enquiries (demo data)",
    },
    {
      id: "dev-seed-contact-phone",
      type: "PHONE",
      value: "+92 243 000000",
      label: "[PLACEHOLDER] College Phone (demo data)",
    },
    {
      id: "dev-seed-contact-principal-email",
      type: "EMAIL",
      value: "principal@gce-khairpur.example",
      label: "[PLACEHOLDER] Principal's Office (demo data)",
    },
    {
      id: "dev-seed-contact-website",
      type: "OTHER",
      value: "https://gce-khairpur.example",
      label: "[PLACEHOLDER] College Website (demo data)",
    },
    {
      id: "dev-seed-contact-alt-phone",
      type: "PHONE",
      value: "+92 300 0000000",
      label: "[PLACEHOLDER] Alternate Phone (demo data)",
    },
    {
      id: "dev-seed-contact-admissions-email",
      type: "EMAIL",
      value: "admissions@gce-khairpur.example",
      label: "[PLACEHOLDER] Admissions Office (demo data)",
    },
    {
      id: "dev-seed-contact-exams-email",
      type: "EMAIL",
      value: "exams@gce-khairpur.example",
      label: "[PLACEHOLDER] Examinations Office (demo data)",
    },
    {
      id: "dev-seed-contact-office-hours",
      type: "OTHER",
      value: "Monday to Friday, 08:00–16:00",
      label: "[PLACEHOLDER] Office Hours (demo data)",
    },
  ];
  for (const contact of demoContacts) {
    await prisma.contact.upsert({
      where: { id: contact.id },
      update: {
        type: contact.type,
        value: contact.value,
        label: contact.label,
        status: "PUBLISHED",
        isPlaceholder: true,
      },
      create: {
        id: contact.id,
        collegeId: PLACEHOLDER_COLLEGE_ID,
        type: contact.type,
        value: contact.value,
        label: contact.label,
        status: "PUBLISHED",
        isPlaceholder: true,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

  const DEMO_ADDRESS =
    "[PLACEHOLDER] College Road, Education District, Khairpur, Sindh, Pakistan — 66020 (demo data)";
  await prisma.location.upsert({
    where: { id: "dev-seed-location" },
    update: {
      address: DEMO_ADDRESS,
      status: "PUBLISHED",
      isPlaceholder: true,
    },
    create: {
      id: "dev-seed-location",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      address: DEMO_ADDRESS,
      status: "PUBLISHED",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Gallery -------------------------------------------------------------------------
  const mediaStoredPath = await seedWritePlaceholderFile(
    "media",
    "dev-seed-media",
    "placeholder.png",
    PLACEHOLDER_PNG,
  );
  const media = await prisma.media.upsert({
    where: { id: "dev-seed-media" },
    update: {
      isPlaceholder: true,
    },
    create: {
      id: "dev-seed-media",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      storedPath: mediaStoredPath,
      mimeType: "image/png",
      altText: "[PLACEHOLDER] Sample image — replace with a real, described photo.",
      category: "General",
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
  // Demo scholarships supplied by the user 2026-09-16 for GCE Khairpur (demo college) — same
  // isPlaceholder: true treatment as the rest of this file (CLAUDE.md rule 1/14). The
  // schema's `status` is the draft/publish workflow ContentStatus, not an active/inactive
  // offering flag, so the source "Active" status maps to PUBLISHED (this file's convention
  // for every demo record) rather than a separate field.
  const DEMO_SCHOLARSHIPS: Array<{
    id: string;
    name: string;
    description: string;
    eligibility: string;
  }> = [
    {
      id: "dev-seed-scholarship",
      name: "[PLACEHOLDER] Merit Scholarship",
      description: "[PLACEHOLDER] Demonstration scholarship for high-performing students. (demo data)",
      eligibility: "[PLACEHOLDER] Students meeting the defined academic merit threshold.",
    },
    {
      id: "dev-seed-scholarship-need-based",
      name: "[PLACEHOLDER] Need-Based Assistance",
      description:
        "[PLACEHOLDER] Demonstration financial support program for eligible students. (demo data)",
      eligibility: "[PLACEHOLDER] Students demonstrating qualifying financial need.",
    },
  ];

  for (const item of DEMO_SCHOLARSHIPS) {
    await prisma.scholarship.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        description: item.description,
        eligibility: item.eligibility,
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: item.id,
        collegeId: PLACEHOLDER_COLLEGE_ID,
        name: item.name,
        description: item.description,
        eligibility: item.eligibility,
        status: "PUBLISHED",
        isPlaceholder: true,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

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

  // Demo student rules supplied by the user 2026-09-16 for GCE Khairpur (demo college) —
  // same isPlaceholder: true treatment as the rest of this file (CLAUDE.md rule 1/14). The
  // 8 rules were given as a flat list with no individual titles, so they're bundled into one
  // Regulation ("Student Code of Conduct") with a numbered `body`, rather than forced into 8
  // title-less records.
  const DEMO_STUDENT_RULES = [
    "Students must attend classes regularly.",
    "Students must comply with the academic calendar.",
    "Students must maintain respectful conduct.",
    "Institutional property must be used responsibly.",
    "Examination rules must be followed.",
    "Identification documents must be carried when required.",
    "Students must comply with approved college policies.",
    "Complaints and grievances should be submitted through the official mechanism.",
  ];
  const DEMO_REGULATION_BODY =
    "[PLACEHOLDER] (demo data)\n" +
    DEMO_STUDENT_RULES.map((rule, index) => `${index + 1}. ${rule}`).join("\n");

  await prisma.regulation.upsert({
    where: { id: "dev-seed-regulation" },
    update: {
      title: "[PLACEHOLDER] Student Code of Conduct",
      body: DEMO_REGULATION_BODY,
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-regulation",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Student Code of Conduct",
      body: DEMO_REGULATION_BODY,
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
      status: "ASSIGNED",
      isPlaceholder: true,
    },
    create: {
      id: "dev-seed-grievance",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      referenceNumber: "GRV-DEVSEED-000001",
      submitterName: "[DEV SEED] Test Submitter",
      submitterEmail: seedEncryptSecret("dev-seed-submitter@example.invalid"),
      category: "general",
      subject: "[DEV SEED] Sample grievance subject",
      description: "[DEV SEED] Sample grievance description for local development only.",
      status: "ASSIGNED",
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

  // Dummy grievance supplied by the user 2026-09-16 for GCE Khairpur (demo college) — same
  // isPlaceholder: true / [PLACEHOLDER] treatment as the rest of this file (CLAUDE.md rule
  // 1/14), on top of the confidentiality handling every grievance already gets regardless of
  // placeholder status (CLAUDE.md rule 6): submitterEmail/submitterPhone are encrypted at
  // rest via seedEncryptSecret, never stored as plaintext. `category: "Technical Issue"` is
  // not one of GRIEVANCE_CATEGORIES (src/lib/grievance-categories.ts — the fixed list backing
  // the public form and admin filter), matching how the other dev-seed grievance above
  // already uses an off-list "general" category; it just won't appear when filtering the
  // admin UI by one of the 7 listed categories.
  await prisma.grievance.upsert({
    where: { id: "dev-seed-grievance-demo-0001" },
    update: {
      status: "UNDER_REVIEW",
      isPlaceholder: true,
    },
    create: {
      id: "dev-seed-grievance-demo-0001",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      referenceNumber: "GRV-DEMO-0001",
      submitterName: "[PLACEHOLDER] Demo Student (demo data)",
      submitterEmail: seedEncryptSecret("student@example.com"),
      submitterPhone: seedEncryptSecret("+92 300 1111111"),
      category: "Technical Issue",
      subject: "[PLACEHOLDER] Unable to download demonstration timetable",
      description:
        "[PLACEHOLDER] This is a fictional grievance record used for testing the grievance workflow. (demo data)",
      status: "UNDER_REVIEW",
      isPlaceholder: true,
      updatedBy: devUser.id,
    },
  });

  // --- Documents -----------------------------------------------------------------------
  const documentStoredPath = await seedWritePlaceholderFile(
    "document",
    "dev-seed-document",
    "placeholder.txt",
    Buffer.from("[PLACEHOLDER] Sample document content for local development only.\n", "utf8"),
  );
  await prisma.document.upsert({
    where: { id: "dev-seed-document" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      approvedById: devUser.id,
      approvedAt: new Date(),
    },
    create: {
      id: "dev-seed-document",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      entityType: "Notice",
      entityId: notice.id,
      category: "attachment",
      title: "[PLACEHOLDER] Sample Attachment",
      description: "[PLACEHOLDER] Sample document description for local development only.",
      storedPath: documentStoredPath,
      fileName: "placeholder.txt",
      mimeType: "text/plain",
      uploadedById: devUser.id,
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      approvedById: devUser.id,
      approvedAt: new Date(),
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
      note: "[DEV SEED] Example verification note only — not a real compliance decision.",
    },
  });

  await prisma.complianceRequirement.update({
    where: { id: facultyRequirement.id },
    data: { status: "VERIFIED" },
  });

  // Dummy compliance dashboard statuses supplied by the user 2026-09-16, "especially useful
  // for testing your dashboard" — same NOT-a-real-verification treatment as the
  // Faculty/item-4 example directly above (CLAUDE.md rule 7: only the `verify` action, by an
  // authorized human holding compliance:verify, may really reach VERIFIED; this seed script
  // is neither). Item 4 (Faculty) is already handled above and skipped here.
  //
  // The user's data included a per-item "completeness" percentage (e.g. 90, 60), but
  // ComplianceRequirement has no completeness column — src/lib/compliance.ts computes it live
  // from how much real content actually exists for that item (`getComplianceOverview`), so it
  // can't be set directly. It isn't reproduced here; whatever the dashboard shows for each
  // item's completeness reflects the real demo content already seeded above (departments,
  // faculty, programs, notices, etc.), not this list's numbers.
  const DEMO_COMPLIANCE_STATUSES: Array<{
    itemNumber: number;
    status: "VERIFIED" | "READY_FOR_REVIEW" | "IN_PROGRESS";
  }> = [
    { itemNumber: 1, status: "VERIFIED" },
    { itemNumber: 2, status: "VERIFIED" },
    { itemNumber: 3, status: "VERIFIED" },
    // itemNumber 4 (Faculty) — already set VERIFIED above via the worked evidence example.
    { itemNumber: 5, status: "VERIFIED" },
    { itemNumber: 6, status: "VERIFIED" },
    { itemNumber: 7, status: "READY_FOR_REVIEW" },
    { itemNumber: 8, status: "READY_FOR_REVIEW" },
    { itemNumber: 9, status: "IN_PROGRESS" },
    { itemNumber: 10, status: "IN_PROGRESS" },
    { itemNumber: 11, status: "VERIFIED" },
    { itemNumber: 12, status: "VERIFIED" },
    { itemNumber: 13, status: "READY_FOR_REVIEW" },
    { itemNumber: 14, status: "VERIFIED" },
    { itemNumber: 15, status: "VERIFIED" },
    { itemNumber: 16, status: "VERIFIED" },
    { itemNumber: 17, status: "READY_FOR_REVIEW" },
    { itemNumber: 18, status: "VERIFIED" },
    { itemNumber: 19, status: "VERIFIED" },
    { itemNumber: 20, status: "IN_PROGRESS" },
  ];

  for (const item of DEMO_COMPLIANCE_STATUSES) {
    const requirement = await prisma.complianceRequirement.findUniqueOrThrow({
      where: { collegeId_itemNumber: { collegeId: PLACEHOLDER_COLLEGE_ID, itemNumber: item.itemNumber } },
    });

    await prisma.complianceRequirement.update({
      where: { id: requirement.id },
      data: { status: item.status },
    });

    if (item.status === "VERIFIED") {
      await prisma.complianceVerification.upsert({
        where: { id: `dev-seed-compliance-verification-item-${item.itemNumber}` },
        update: {},
        create: {
          id: `dev-seed-compliance-verification-item-${item.itemNumber}`,
          requirementId: requirement.id,
          decision: "VERIFIED",
          verifiedById: devUser.id,
          note: "[DEV SEED] Example verification note only — not a real compliance decision.",
        },
      });
    }

    await prisma.auditLog.upsert({
      where: { id: `dev-seed-compliance-audit-item-${item.itemNumber}` },
      update: {},
      create: {
        id: `dev-seed-compliance-audit-item-${item.itemNumber}`,
        actorId: item.status === "IN_PROGRESS" ? null : devUser.id,
        action: item.status === "VERIFIED" ? "COMPLIANCE_VERIFY" : "UPDATE",
        entityType: "ComplianceRequirement",
        entityId: requirement.id,
        comment: "[DEV SEED] Demo compliance status for dashboard testing — not a real decision.",
        beforeSnapshot: { status: "NOT_STARTED" },
        afterSnapshot: { status: item.status },
        metadata: item.status === "IN_PROGRESS" ? { automatic: true, demo: true } : { demo: true },
      },
    });
  }

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
