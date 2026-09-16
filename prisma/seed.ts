import { createCipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
 * real uploaded file (read from `Images/`, the drop folder the college owner supplied — see
 * `.gitignore`) so seeded Document/Media rows work end-to-end through the actual
 * file-serving routes (src/app/api/files/*), not just as inert database rows.
 */
const UPLOAD_STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");
const REAL_IMAGES_DIR = path.join(process.cwd(), "Images");

function guessMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

async function seedWriteRealFile(
  kind: "document" | "media",
  entityId: string,
  sourceFileName: string,
): Promise<{ storedPath: string; mimeType: string; sizeBytes: number; fileName: string }> {
  const bytes = await readFile(path.join(REAL_IMAGES_DIR, sourceFileName));
  const directory = path.join(UPLOAD_STORAGE_ROOT, kind, entityId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, sourceFileName), bytes);
  return {
    storedPath: path.join(kind, entityId, sourceFileName),
    mimeType: guessMimeType(sourceFileName),
    sizeBytes: bytes.length,
    fileName: sourceFileName,
  };
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Everything in this file is either:
 *  (a) generic system taxonomy the application ships with (roles, permissions, the 20
 *      compliance requirements transcribed from the circular itself), which is not
 *      "inventing official college information" (CLAUDE.md rule 1);
 *  (b) obviously-marked development/test infrastructure (`[DEV SEED]` name prefixes,
 *      `.invalid` email addresses, non-login FK-filler accounts) that can never be mistaken
 *      for institutional content (rule 14) and exists purely so auth/audit/compliance-UI
 *      FKs and the e2e suite have something valid to exercise; or
 *  (c) real official content for Sindh Muslim Government Science College, Karachi, supplied
 *      directly by the college's own SUPER_ADMIN/owner (Osama, osama.ikhlas@gmail.com) in the
 *      "COLLEGE CONTENT REGISTER" dated 2026-09-16, plus the photos/affiliation letter they
 *      supplied via the `Images/` folder — this is "College records = actual official
 *      content" per docs/source/README.md, not invented data, so it is seeded with
 *      `isPlaceholder: false` and goes live through the same `status: PUBLISHED` gate any
 *      other content reaches (CLAUDE.md rule 4). Fields the register didn't provide (course
 *      catalogue, fee structures, timetable grid, exam results, seminars/workshops) are left
 *      unseeded rather than invented (rule 1) — real data for those can be added later
 *      through the admin CMS once available.
 */

const COLLEGE_ID = "placeholder-college"; // kept stable across the seed's history — see git log; not shown anywhere in the UI
const DEV_SEED_USER_ID = "dev-seed-admin";
const CIRCULAR_REFERENCE = "I.C/SALU/KHP/-662, 04.09.2026";
const COLLEGE_NAME = "Sindh Muslim Government Science College, Karachi";

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

  // --- Remove the old fictional "GCE Khairpur" demo college content --------------------
  // Upserting the real content below (by new, real-content IDs) does not by itself delete
  // rows this file used to create under the old `dev-seed-*` demo IDs — an upsert never
  // touches an id it doesn't mention. CLAUDE.md's "remove all dummy data" instruction means
  // those old fictional rows must actually be deleted, not just stopped-from-being-recreated,
  // so this runs on every seed (harmless/no-op once already clean) and is ordered
  // children-before-parents to satisfy FK constraints (none of these relations cascade —
  // see the `onDelete` grep above — except Course<-Program and GalleryItem<-GalleryAlbum,
  // which do and are left to cascade). `dev-seed-admin`, `dev-seed-notice-expired`
  // (retitled), and `dev-seed-grievance`/`dev-seed-grievance-note` are dev/test
  // infrastructure, not demo college content, and are deliberately NOT deleted here — see
  // their own create blocks below. `AuditLog` rows are DB-trigger-hardened against
  // delete/update (migration `20260916000000_audit_log_hardening`) so old
  // `dev-seed-*-audit-*` rows are left as an immutable historical record rather than fought.
  // Every FK-bearing delete below is scoped by the actual foreign-key column (`startsWith:
  // "dev-seed-"`), not just the seed script's own known row ids — this dev database has also
  // accumulated rows from e2e test runs that point at these same fixtures (e.g. a Playwright
  // test's own Timetable/Result row referencing dev-seed-program/dev-seed-examination), which
  // would otherwise block the delete with a FK violation.
  const DEV_SEED_PROGRAM_PREFIX = "dev-seed-program";
  const DEV_SEED_DEPARTMENT_PREFIX = "dev-seed-department";
  const DEV_SEED_FACULTY_PREFIX = "dev-seed-faculty";

  await prisma.grievance.deleteMany({ where: { id: "dev-seed-grievance-demo-0001" } });
  await prisma.complianceVerification.deleteMany({ where: { id: { startsWith: "dev-seed-compliance-" } } });
  await prisma.complianceEvidence.deleteMany({ where: { id: { startsWith: "dev-seed-compliance-" } } });
  await prisma.notification.deleteMany({ where: { id: "dev-seed-notification" } });
  await prisma.document.deleteMany({ where: { id: "dev-seed-document" } });
  // GalleryItem has onDelete: Cascade from GalleryAlbum, so deleting the album is enough.
  await prisma.galleryAlbum.deleteMany({ where: { id: "dev-seed-gallery-album" } });
  await prisma.media.deleteMany({ where: { id: "dev-seed-media" } });
  await prisma.result.deleteMany({ where: { examinationId: "dev-seed-examination" } });
  await prisma.examination.deleteMany({
    where: { OR: [{ id: "dev-seed-examination" }, { programId: { startsWith: DEV_SEED_PROGRAM_PREFIX } }] },
  });
  await prisma.feeStructure.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "dev-seed-fee-structure" } },
        { programId: { startsWith: DEV_SEED_PROGRAM_PREFIX } },
        { admissionId: "dev-seed-admission" },
      ],
    },
  });
  await prisma.admission.deleteMany({
    where: { OR: [{ id: "dev-seed-admission" }, { programId: { startsWith: DEV_SEED_PROGRAM_PREFIX } }] },
  });
  await prisma.enrollmentStatistic.deleteMany({
    where: { OR: [{ id: "dev-seed-enrollment-stat" }, { programId: { startsWith: DEV_SEED_PROGRAM_PREFIX } }] },
  });
  await prisma.timetable.deleteMany({
    where: { OR: [{ id: "dev-seed-timetable" }, { programId: { startsWith: DEV_SEED_PROGRAM_PREFIX } }] },
  });
  await prisma.academicCalendar.deleteMany({ where: { id: { startsWith: "dev-seed-calendar-entry" } } });
  await prisma.activity.deleteMany({ where: { id: "dev-seed-activity" } });
  await prisma.workshop.deleteMany({
    where: { OR: [{ id: "dev-seed-workshop" }, { departmentId: { startsWith: DEV_SEED_DEPARTMENT_PREFIX } }] },
  });
  await prisma.seminar.deleteMany({
    where: { OR: [{ id: "dev-seed-seminar" }, { departmentId: { startsWith: DEV_SEED_DEPARTMENT_PREFIX } }] },
  });
  await prisma.event.deleteMany({ where: { id: { startsWith: "dev-seed-event" } } });
  await prisma.notice.deleteMany({
    where: { id: { in: ["dev-seed-notice", "dev-seed-notice-orientation", "dev-seed-notice-faculty-workshop"] } },
  });
  await prisma.contact.deleteMany({ where: { id: { startsWith: "dev-seed-contact" } } });
  await prisma.location.deleteMany({ where: { id: "dev-seed-location" } });
  await prisma.scholarship.deleteMany({ where: { id: { startsWith: "dev-seed-scholarship" } } });
  await prisma.studentSupport.deleteMany({ where: { id: "dev-seed-student-support" } });
  await prisma.policy.deleteMany({ where: { id: "dev-seed-policy" } });
  await prisma.regulation.deleteMany({ where: { id: "dev-seed-regulation" } });
  const staleFaculty = await prisma.faculty.findMany({
    where: {
      OR: [
        { id: { startsWith: DEV_SEED_FACULTY_PREFIX } },
        { departmentId: { startsWith: DEV_SEED_DEPARTMENT_PREFIX } },
      ],
    },
    select: { id: true },
  });
  const staleFacultyIds = staleFaculty.map((f) => f.id);
  await prisma.club.deleteMany({
    where: { OR: [{ id: "dev-seed-club" }, { facultyAdvisorId: { in: staleFacultyIds } }] },
  });
  await prisma.faculty.deleteMany({ where: { id: { in: staleFacultyIds } } });
  await prisma.staff.deleteMany({ where: { id: "dev-seed-staff" } });
  await prisma.infrastructure.deleteMany({ where: { id: { startsWith: "dev-seed-infrastructure" } } });
  await prisma.affiliation.deleteMany({
    where: { OR: [{ id: "dev-seed-affiliation" }, { programId: { startsWith: DEV_SEED_PROGRAM_PREFIX } }] },
  });
  await prisma.program.deleteMany({ where: { id: { startsWith: DEV_SEED_PROGRAM_PREFIX } } });
  await prisma.department.deleteMany({ where: { id: { startsWith: DEV_SEED_DEPARTMENT_PREFIX } } });
  // Undo the old demo data's fake bulk compliance statuses (deleted their
  // ComplianceVerification/Evidence rows above) — CLAUDE.md rule 7 means no status beyond
  // NOT_STARTED/IN_PROGRESS may exist without a real human decision behind it, and none of
  // this real content has actually been reviewed by anyone yet.
  await prisma.complianceRequirement.updateMany({
    where: { collegeId: COLLEGE_ID },
    data: { status: "NOT_STARTED" },
  });

  // --- The real college (content register item 1) ----------------------------------------
  await prisma.college.upsert({
    where: { id: COLLEGE_ID },
    update: { name: COLLEGE_NAME, type: "GOVT_DEGREE", isPlaceholder: false },
    create: { id: COLLEGE_ID, name: COLLEGE_NAME, type: "GOVT_DEGREE", isPlaceholder: false },
  });

  // A single dev-only account so FK fields that require a real user (uploadedBy, addedBy,
  // verifiedBy, ...) have something valid to point at, and so real content seeded below has a
  // createdBy/publishedBy stamp before any real admin (see "Real site administrators" below)
  // has logged in and made their own edit. `.invalid` is the RFC 2606 reserved TLD for
  // addresses that must never resolve to a real mailbox.
  const devUser = await prisma.user.upsert({
    where: { id: DEV_SEED_USER_ID },
    update: {},
    create: {
      id: DEV_SEED_USER_ID,
      collegeId: COLLEGE_ID,
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
        collegeId: COLLEGE_ID,
      },
    },
    update: {},
    create: {
      userId: devUser.id,
      roleId: superAdminRole.id,
      collegeId: COLLEGE_ID,
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
          collegeId: COLLEGE_ID,
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
            collegeId: COLLEGE_ID,
          },
        },
        update: {},
        create: { userId: roleUser.id, roleId: role.id, collegeId: COLLEGE_ID },
      });
    }

    console.log(
      `[DEV SEED] Login test accounts ready for all ${ROLE_NAMES.length} roles ` +
        `(<role-slug>@example.invalid / "${DEV_LOGIN_PASSWORD}"). Never seeded when NODE_ENV=production.`,
    );
  }

  // --- College profile (register item 1) --------------------------------------------------
  const profile = await prisma.collegeProfile.upsert({
    where: { collegeId: COLLEGE_ID },
    update: {
      overview:
        "To provide quality science education and develop students' academic, scientific and critical-thinking abilities.",
      missionStatement:
        "To provide accessible and quality science education and prepare students for higher education and professional life.",
      visionStatement:
        "To become a respected center of science education promoting knowledge, research and responsible citizenship.",
      history:
        "Established in 1943 and associated with Muhammad Ali Jinnah; it has been an important science-education institution in Karachi.",
      principalName: "Najma",
      principalMessage: PRINCIPAL_MESSAGE,
      establishedYear: 1943,
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      collegeId: COLLEGE_ID,
      overview:
        "To provide quality science education and develop students' academic, scientific and critical-thinking abilities.",
      missionStatement:
        "To provide accessible and quality science education and prepare students for higher education and professional life.",
      visionStatement:
        "To become a respected center of science education promoting knowledge, research and responsible citizenship.",
      history:
        "Established in 1943 and associated with Muhammad Ali Jinnah; it has been an important science-education institution in Karachi.",
      principalName: "Najma",
      principalMessage: PRINCIPAL_MESSAGE,
      establishedYear: 1943,
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // Site logo and principal's photo — generic Media rows (schema.prisma §15), resolved by
  // src/lib/content.ts's getCollegeLogo/getPrincipalPhoto and served by
  // src/app/api/files/media/[id]/route.ts. See CollegeProfileForm for the admin-UI path that
  // replaces these later.
  const logoFile = await seedWriteRealFile("media", COLLEGE_ID, "logo.png");
  await prisma.media.upsert({
    where: { id: "media-college-logo" },
    update: { storedPath: logoFile.storedPath, mimeType: logoFile.mimeType },
    create: {
      id: "media-college-logo",
      collegeId: COLLEGE_ID,
      entityType: "College",
      entityId: COLLEGE_ID,
      storedPath: logoFile.storedPath,
      mimeType: logoFile.mimeType,
      altText: `${COLLEGE_NAME} logo`,
      uploadedById: devUser.id,
      isPlaceholder: false,
    },
  });

  const principalPhotoFile = await seedWriteRealFile("media", profile.id, "principal.png");
  await prisma.media.upsert({
    where: { id: "media-principal-photo" },
    update: { storedPath: principalPhotoFile.storedPath, mimeType: principalPhotoFile.mimeType },
    create: {
      id: "media-principal-photo",
      collegeId: COLLEGE_ID,
      entityType: "CollegeProfile",
      entityId: profile.id,
      storedPath: principalPhotoFile.storedPath,
      mimeType: principalPhotoFile.mimeType,
      altText: "Najma, Principal",
      uploadedById: devUser.id,
      isPlaceholder: false,
    },
  });

  // --- Academic structure (register items 4, 6) -------------------------------------------
  // Departments: one per faculty subject area the register gives (item 4), plus "Science" to
  // host the three Science-stream programs (item 6's "Department" column: "Biology / Science"
  // / "Science" / "Science") since Program.departmentId is required and none of the four
  // subject departments is a clean fit for a program-level grouping.
  const DEPARTMENTS: Array<{ id: string; name: string }> = [
    { id: "dept-physics", name: "Physics" },
    { id: "dept-chemistry", name: "Chemistry" },
    { id: "dept-urdu", name: "Urdu" },
    { id: "dept-mathematics", name: "Mathematics" },
    { id: "dept-science", name: "Science" },
  ];
  const departments = new Map<string, Awaited<ReturnType<typeof prisma.department.upsert>>>();
  for (const dept of DEPARTMENTS) {
    const upserted = await prisma.department.upsert({
      where: { id: dept.id },
      update: { name: dept.name, status: "PUBLISHED", isPlaceholder: false, publishedAt: new Date(), publishedBy: devUser.id },
      create: {
        id: dept.id,
        collegeId: COLLEGE_ID,
        name: dept.name,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
    departments.set(dept.id, upserted);
  }

  const PROGRAMS: Array<{
    id: string;
    name: string;
    durationYears: number;
    affiliatingUniversity: string;
    affiliationNumber: string;
  }> = [
    {
      id: "program-fsc-pre-medical",
      name: "F.Sc. Pre-Medical",
      durationYears: 2,
      affiliatingUniversity: "Board of Intermediate Education Karachi",
      affiliationNumber: "BIEK-PM-001",
    },
    {
      id: "program-fsc-pre-engineering",
      name: "F.Sc. Pre-Engineering",
      durationYears: 2,
      affiliatingUniversity: "Board of Intermediate Education Karachi",
      affiliationNumber: "BIEK-PE-002",
    },
    {
      id: "program-general-science",
      name: "General Science",
      durationYears: 2,
      affiliatingUniversity: "Board of Intermediate Education Karachi",
      affiliationNumber: "BIEK-PE-003",
    },
  ];
  const programs = new Map<string, Awaited<ReturnType<typeof prisma.program.upsert>>>();
  for (const prog of PROGRAMS) {
    const upserted = await prisma.program.upsert({
      where: { id: prog.id },
      update: {
        name: prog.name,
        level: "UNDERGRADUATE",
        durationYears: prog.durationYears,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: prog.id,
        collegeId: COLLEGE_ID,
        departmentId: "dept-science",
        name: prog.name,
        level: "UNDERGRADUATE",
        durationYears: prog.durationYears,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
    programs.set(prog.id, upserted);
  }

  // Regulatory/affiliation status (register items 6, 13). One general HEC recognition record
  // (item 13), plus one per program tying it to its affiliating board (item 6).
  const hecAffiliation = await prisma.affiliation.upsert({
    where: { id: "affiliation-hec-recognition" },
    update: {
      universityName: "Higher Education Commission (HEC)",
      regulatoryBody: "Higher Education Commission (HEC)",
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "affiliation-hec-recognition",
      collegeId: COLLEGE_ID,
      universityName: "Higher Education Commission (HEC)",
      regulatoryBody: "Higher Education Commission (HEC)",
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  for (const prog of PROGRAMS) {
    await prisma.affiliation.upsert({
      where: { id: `affiliation-${prog.id}` },
      update: {
        universityName: prog.affiliatingUniversity,
        affiliationNumber: prog.affiliationNumber,
        regulatoryBody: prog.affiliatingUniversity,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: `affiliation-${prog.id}`,
        collegeId: COLLEGE_ID,
        programId: prog.id,
        universityName: prog.affiliatingUniversity,
        affiliationNumber: prog.affiliationNumber,
        regulatoryBody: prog.affiliatingUniversity,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

  // --- People (register items 4, 5, 14) ---------------------------------------------------
  const FACULTY: Array<{
    id: string;
    name: string;
    departmentId: string;
    designation: string;
    qualifications: string;
    subjectsTaught: string[];
    email: string;
    phone: string;
  }> = [
    {
      id: "faculty-ahmed-khan",
      name: "Dr. Muhammad Ahmed Khan",
      departmentId: "dept-physics",
      designation: "Lecturer",
      qualifications: "M.Phil. Physics",
      subjectsTaught: ["Physics"],
      email: "ahmed.khan@smgsc.edu.pk",
      phone: "0300-0000001",
    },
    {
      id: "faculty-ayesha-fatima",
      name: "Ms. Ayesha Fatima",
      departmentId: "dept-chemistry",
      designation: "Lecturer",
      qualifications: "M.Sc. Chemistry",
      subjectsTaught: ["Chemistry"],
      email: "ayesha.fatima@smgsc.edu.pk",
      phone: "0300-0000002",
    },
    {
      id: "faculty-usman-tariq",
      name: "Mr. Usman Tariq",
      departmentId: "dept-urdu",
      designation: "Lecturer",
      qualifications: "M.A. Urdu",
      subjectsTaught: ["Urdu"],
      email: "usman.tariq@smgsc.edu.pk",
      phone: "0300-0000007",
    },
    {
      id: "faculty-sana-raza",
      name: "Ms. Sana Raza",
      departmentId: "dept-mathematics",
      designation: "Lecturer",
      qualifications: "M.Sc. Mathematics",
      subjectsTaught: ["Mathematics"],
      email: "sana.raza@smgsc.edu.pk",
      phone: "0300-0000004",
    },
  ];
  for (const member of FACULTY) {
    await prisma.faculty.upsert({
      where: { id: member.id },
      update: {
        name: member.name,
        designation: member.designation,
        qualifications: member.qualifications,
        departmentId: member.departmentId,
        subjectsTaught: member.subjectsTaught,
        email: member.email,
        phone: member.phone,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: member.id,
        collegeId: COLLEGE_ID,
        departmentId: member.departmentId,
        name: member.name,
        designation: member.designation,
        qualifications: member.qualifications,
        subjectsTaught: member.subjectsTaught,
        email: member.email,
        phone: member.phone,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

  const STAFF: Array<{ id: string; name: string; designation: string; department: string }> = [
    { id: "staff-imran", name: "Muhammad Imran", designation: "Senior Clerk", department: "Administration" },
    { id: "staff-faisal", name: "Faisal Ahmed", designation: "Office Assistant", department: "Administration" },
    { id: "staff-salman", name: "Salman Raza", designation: "Computer Operator", department: "IT / Computer Section" },
  ];
  for (const member of STAFF) {
    await prisma.staff.upsert({
      where: { id: member.id },
      update: {
        name: member.name,
        designation: member.designation,
        department: member.department,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: member.id,
        collegeId: COLLEGE_ID,
        name: member.name,
        designation: member.designation,
        department: member.department,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

  const CLUBS: Array<{ id: string; name: string; facultyAdvisorId: string; description: string }> = [
    {
      id: "club-science",
      name: "Science Club",
      facultyAdvisorId: "faculty-ahmed-khan",
      description: "Science exhibitions, experiments, quizzes, and scientific discussions.",
    },
    {
      id: "club-sports",
      name: "Sports Club",
      facultyAdvisorId: "faculty-usman-tariq",
      description: "Sports competitions, physical activities, and inter-college events.",
    },
  ];
  for (const club of CLUBS) {
    await prisma.club.upsert({
      where: { id: club.id },
      update: {
        name: club.name,
        description: club.description,
        facultyAdvisorId: club.facultyAdvisorId,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: club.id,
        collegeId: COLLEGE_ID,
        name: club.name,
        description: club.description,
        facultyAdvisorId: club.facultyAdvisorId,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

  // src/lib/compliance.ts's item 14 ("Co-curricular activities") completeness check queries
  // the `Activity` model specifically, not `Club` — Club has no dedicated compliance mapping
  // of its own, so the same two real clubs above are also seeded here as Activity rows (same
  // name/description) purely so item 14 reflects this real content rather than staying
  // NOT_STARTED forever despite the register actually providing this data.
  for (const club of CLUBS) {
    await prisma.activity.upsert({
      where: { id: `activity-${club.id}` },
      update: {
        title: club.name,
        description: club.description,
        category: "co-curricular",
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: `activity-${club.id}`,
        collegeId: COLLEGE_ID,
        title: club.name,
        description: club.description,
        category: "co-curricular",
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

  // --- Infrastructure (register item 3) ---------------------------------------------------
  // Categories are transcribed exactly as the register specified them, even where a name and
  // its category look mismatched (e.g. "Administration Office" tagged MOOT_COURT) — see this
  // session's summary to the college owner, who should double check items 5-7 via the admin
  // UI if that wasn't intentional.
  const INFRASTRUCTURE: Array<{
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
    { id: "infra-classrooms", category: "CLASSROOM", name: "General Classrooms", description: "Spacious classrooms for regular teaching and learning activities." },
    { id: "infra-science-labs", category: "LAB", name: "Science Laboratories", description: "Laboratories for practical work in Physics, Chemistry, and Biology." },
    { id: "infra-library", category: "LIBRARY", name: "College Library", description: "Provides textbooks, reference books, and other educational resources." },
    { id: "infra-computer-lab", category: "COMPUTER_LAB", name: "Computer Laboratory", description: "Computers and digital resources for students' academic and practical work." },
    { id: "infra-admin-office", category: "MOOT_COURT", name: "Administration Office", description: "Handles student records, admissions, academic matters, and college administration." },
    { id: "infra-sports", category: "OFFICE", name: "Sports Facilities", description: "Facilities for physical activities and student sports." },
    { id: "infra-auditorium", category: "SPORTS", name: "Auditorium / Event Space", description: "Used for seminars, exhibitions, meetings, and college events." },
  ];
  for (const item of INFRASTRUCTURE) {
    await prisma.infrastructure.upsert({
      where: { id: item.id },
      update: {
        category: item.category,
        name: item.name,
        description: item.description,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: item.id,
        collegeId: COLLEGE_ID,
        category: item.category,
        name: item.name,
        description: item.description,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

  // --- Communications (register items 2, 10, 15) ------------------------------------------
  const NOTICES: Array<{ id: string; title: string; category: string; body: string; publishDate: string }> = [
    {
      id: "notice-academic-activities",
      title: "Academic Activities and Student Discipline",
      category: "Academic",
      body:
        "All students are hereby informed that regular classes and academic activities will continue according to the college timetable. Students are expected to attend their classes regularly, arrive on time, maintain discipline, and follow the instructions of their teachers and college administration. Students are also encouraged to participate positively in academic, scientific, and co-curricular activities organized by the college. All students are requested to cooperate with the administration and maintain a respectful and healthy learning environment on campus.",
      publishDate: "2026-09-18",
    },
    {
      id: "notice-midterm-exam",
      title: "Mid-Term Examination Notice",
      category: "Examinations",
      body: "Students are informed about the schedule, examination rules, and required materials.",
      publishDate: "2026-10-16",
    },
    {
      id: "notice-annual-exam",
      title: "Annual Examination Notice",
      category: "Examinations",
      body: "Annual examinations begin according to the published examination timetable.",
      publishDate: "2026-09-24",
    },
    {
      id: "notice-college-timings",
      title: "College Timings",
      category: "General",
      body: "Updates about opening/closing times or changes during special occasions will be posted here.",
      publishDate: new Date().toISOString().slice(0, 10),
    },
  ];
  for (const item of NOTICES) {
    await prisma.notice.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        body: item.body,
        category: item.category,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: item.id,
        collegeId: COLLEGE_ID,
        title: item.title,
        body: item.body,
        category: item.category,
        publishDate: new Date(item.publishDate),
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

  // Kept as [DEV SEED] test infrastructure (not real college data) — an already-expired
  // notice purely so the homepage's "Important announcement" banner
  // (getImportantAnnouncement) can be regression-tested against actually excluding expired
  // notices rather than just showing whatever is newest (tests/e2e/homepage.spec.ts).
  await prisma.notice.upsert({
    where: { id: "dev-seed-notice-expired" },
    update: {
      title: "[DEV SEED] Expired Test Notice",
      body: "[DEV SEED] Sample notice body text for an already-expired notice — regression fixture only.",
      category: "general",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date("2026-01-02"),
      publishedBy: devUser.id,
    },
    create: {
      id: "dev-seed-notice-expired",
      collegeId: COLLEGE_ID,
      title: "[DEV SEED] Expired Test Notice",
      body: "[DEV SEED] Sample notice body text for an already-expired notice — regression fixture only.",
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
    where: { id: "event-science-exhibition" },
    update: {
      title: "Annual Science Exhibition",
      startDate: new Date("2026-09-30T09:00:00"),
      location: "College Auditorium / Science Block",
      description:
        "Students are invited to participate in the Annual Science Exhibition, where they will present innovative science projects, models, experiments, and research ideas. The event aims to encourage scientific thinking, creativity, teamwork, and practical learning among students. Teachers, students, and invited guests will attend the exhibition. All students are encouraged to participate and make the event successful.",
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "event-science-exhibition",
      collegeId: COLLEGE_ID,
      title: "Annual Science Exhibition",
      startDate: new Date("2026-09-30T09:00:00"),
      location: "College Auditorium / Science Block",
      description:
        "Students are invited to participate in the Annual Science Exhibition, where they will present innovative science projects, models, experiments, and research ideas. The event aims to encourage scientific thinking, creativity, teamwork, and practical learning among students. Teachers, students, and invited guests will attend the exhibition. All students are encouraged to participate and make the event successful.",
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Calendar & scheduling (register item 7) --------------------------------------------
  const CALENDAR_ENTRIES: Array<{ id: string; title: string; startDate: string }> = [
    { id: "calendar-admission-begins", title: "Admission / Enrollment Begins", startDate: "2026-09-01" },
    { id: "calendar-orientation", title: "Orientation / Welcome Session", startDate: "2026-09-24" },
    { id: "calendar-fall-begins", title: "Fall Semester Begins", startDate: "2026-10-01" },
  ];
  for (const entry of CALENDAR_ENTRIES) {
    await prisma.academicCalendar.upsert({
      where: { id: entry.id },
      update: {
        title: entry.title,
        startDate: new Date(entry.startDate),
        academicYear: "2026-27",
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: entry.id,
        collegeId: COLLEGE_ID,
        title: entry.title,
        startDate: new Date(entry.startDate),
        academicYear: "2026-27",
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

  // --- Admissions & enrollment (register items 8, 9) --------------------------------------
  const ADMISSIONS: Array<{ id: string; programId: string; applicationStartDate: string; applicationEndDate: string }> = [
    { id: "admission-fsc-pre-medical", programId: "program-fsc-pre-medical", applicationStartDate: "2026-09-17", applicationEndDate: "2026-09-22" },
    { id: "admission-fsc-pre-engineering", programId: "program-fsc-pre-engineering", applicationStartDate: "2026-09-17", applicationEndDate: "2026-09-25" },
  ];
  const ADMISSION_ELIGIBILITY = "Matriculation / SSC with Science subjects.";
  for (const item of ADMISSIONS) {
    await prisma.admission.upsert({
      where: { id: item.id },
      update: {
        academicYear: "2026-27",
        eligibilityCriteria: ADMISSION_ELIGIBILITY,
        applicationStartDate: new Date(item.applicationStartDate),
        applicationEndDate: new Date(item.applicationEndDate),
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: item.id,
        collegeId: COLLEGE_ID,
        programId: item.programId,
        academicYear: "2026-27",
        eligibilityCriteria: ADMISSION_ELIGIBILITY,
        applicationStartDate: new Date(item.applicationStartDate),
        applicationEndDate: new Date(item.applicationEndDate),
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

  const ENROLLMENT_STATS: Array<{ id: string; programId: string; totalEnrolled: number }> = [
    { id: "enrollment-fsc-pre-medical-2025-26", programId: "program-fsc-pre-medical", totalEnrolled: 120 },
    { id: "enrollment-fsc-pre-engineering-2025-26", programId: "program-fsc-pre-engineering", totalEnrolled: 195 },
  ];
  for (const stat of ENROLLMENT_STATS) {
    await prisma.enrollmentStatistic.upsert({
      where: { id: stat.id },
      update: {
        academicYear: "2025-26",
        sessionType: "1st Year",
        totalEnrolled: stat.totalEnrolled,
        status: "PUBLISHED",
        isPlaceholder: false,
      },
      create: {
        id: stat.id,
        collegeId: COLLEGE_ID,
        programId: stat.programId,
        academicYear: "2025-26",
        sessionType: "1st Year",
        totalEnrolled: stat.totalEnrolled,
        status: "PUBLISHED",
        isPlaceholder: false,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

  // --- Contact & location (register items 11, 12, 19) -------------------------------------
  const CONTACTS: Array<{ id: string; type: "EMAIL" | "PHONE" | "OTHER"; value: string; label: string }> = [
    { id: "contact-queries-phone", type: "PHONE", value: "03120909112", label: "Queries" },
    { id: "contact-grievance-officer-email", type: "EMAIL", value: "mukhtar.ahmed@smgc.com", label: "Grievance Officer — Mukhtar Ahmed" },
    { id: "contact-grievance-officer-phone", type: "PHONE", value: "03122533423", label: "Grievance Officer — Mukhtar Ahmed" },
    { id: "contact-office-hours", type: "OTHER", value: "Monday–Saturday: approximately 7:00 AM–5:00 PM; Sunday: Closed", label: "Office Hours" },
  ];
  for (const contact of CONTACTS) {
    await prisma.contact.upsert({
      where: { id: contact.id },
      update: {
        type: contact.type,
        value: contact.value,
        label: contact.label,
        status: "PUBLISHED",
        isPlaceholder: false,
      },
      create: {
        id: contact.id,
        collegeId: COLLEGE_ID,
        type: contact.type,
        value: contact.value,
        label: contact.label,
        status: "PUBLISHED",
        isPlaceholder: false,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

  const ADDRESS =
    "Sindh Muslim Government Science College, Shahrah-e-Liaquat, Seari Quarters, Karachi, Sindh, Pakistan";
  await prisma.location.upsert({
    where: { id: "location-main" },
    update: { address: ADDRESS, status: "PUBLISHED", isPlaceholder: false },
    create: {
      id: "location-main",
      collegeId: COLLEGE_ID,
      address: ADDRESS,
      status: "PUBLISHED",
      isPlaceholder: false,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Gallery (register item 16) ----------------------------------------------------------
  const album = await prisma.galleryAlbum.upsert({
    where: { id: "gallery-album-campus" },
    update: { title: "Campus Gallery", status: "PUBLISHED", isPlaceholder: false, publishedAt: new Date(), publishedBy: devUser.id },
    create: {
      id: "gallery-album-campus",
      collegeId: COLLEGE_ID,
      title: "Campus Gallery",
      description: "Photos of the college's facilities, faculty, staff, and events.",
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  const GALLERY_PHOTOS: Array<{ id: string; fileName: string; caption: string; altText: string }> = [
    { id: "gallery-computer-lab", fileName: "computer-lab.jpg", caption: "Computer Lab", altText: "Computers and digital resources for students' academic and practical work." },
    { id: "gallery-class-room", fileName: "class-room.jpg", caption: "General Classrooms", altText: "Spacious classrooms for regular teaching and learning activities." },
    { id: "gallery-science-lab", fileName: "science-lab.jpg", caption: "Science Laboratory", altText: "Laboratory for practical work in the sciences." },
    { id: "gallery-chemistry-lab", fileName: "chemistry-lab.jpg", caption: "Chemistry Laboratory", altText: "Laboratory for practical work in Chemistry." },
    { id: "gallery-library", fileName: "library.jpg", caption: "College Library", altText: "Provides textbooks, reference books, and other educational resources." },
    { id: "gallery-admin-office", fileName: "admin-office.jpg", caption: "Administration Office", altText: "Handles student records, admissions, academic matters, and college administration." },
    { id: "gallery-sports", fileName: "sports.jpg", caption: "Sports Facilities", altText: "Facilities for physical activities and student sports." },
    { id: "gallery-auditorium", fileName: "Auditorium.jpg", caption: "Auditorium / Event Space", altText: "Used for seminars, exhibitions, meetings, and college events." },
    { id: "gallery-annual-exhibition", fileName: "annual-exhibition.jpg", caption: "Annual Science Exhibition", altText: "Students presenting projects at the Annual Science Exhibition." },
    { id: "gallery-faculty", fileName: "faculty.jpg", caption: "Faculty", altText: "Members of the college's teaching faculty." },
    { id: "gallery-staff", fileName: "staff.jpg", caption: "Non-teaching Staff", altText: "Members of the college's non-teaching staff." },
    { id: "gallery-clubs", fileName: "club.jpg", caption: "Student Clubs", altText: "Students gathered for a college club event with colorful decorations and a stage." },
  ];

  for (const photo of GALLERY_PHOTOS) {
    const file = await seedWriteRealFile("media", `${photo.id}-media`, photo.fileName);
    const media = await prisma.media.upsert({
      where: { id: `${photo.id}-media` },
      update: { storedPath: file.storedPath, mimeType: file.mimeType, altText: photo.altText },
      create: {
        id: `${photo.id}-media`,
        collegeId: COLLEGE_ID,
        entityType: "GalleryAlbum",
        entityId: album.id,
        storedPath: file.storedPath,
        mimeType: file.mimeType,
        altText: photo.altText,
        category: "Campus",
        mediaType: "IMAGE",
        uploadedById: devUser.id,
        isPlaceholder: false,
      },
    });

    await prisma.galleryItem.upsert({
      where: { id: photo.id },
      update: {
        caption: photo.caption,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
      },
      create: {
        id: photo.id,
        collegeId: COLLEGE_ID,
        albumId: album.id,
        mediaId: media.id,
        caption: photo.caption,
        status: "PUBLISHED",
        isPlaceholder: false,
        publishedAt: new Date(),
        publishedBy: devUser.id,
        createdBy: devUser.id,
        updatedBy: devUser.id,
      },
    });
  }

  // --- Student support (register item 17) --------------------------------------------------
  await prisma.scholarship.upsert({
    where: { id: "scholarship-merit" },
    update: {
      name: "Merit Scholarship",
      description: "For students with strong academic performance, subject to applicable rules.",
      eligibility: "For students with strong academic performance, subject to applicable rules.",
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "scholarship-merit",
      collegeId: COLLEGE_ID,
      name: "Merit Scholarship",
      description: "For students with strong academic performance, subject to applicable rules.",
      eligibility: "For students with strong academic performance, subject to applicable rules.",
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.studentSupport.upsert({
    where: { id: "support-career-guidance" },
    update: {
      name: "Career & Academic Guidance",
      description: "Guidance regarding subject selection, higher education, and career opportunities.",
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "support-career-guidance",
      collegeId: COLLEGE_ID,
      name: "Career & Academic Guidance",
      description: "Guidance regarding subject selection, higher education, and career opportunities.",
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Policies & regulations (register items 18, 19) --------------------------------------
  await prisma.policy.upsert({
    where: { id: "policy-grievance-handling" },
    update: {
      title: "Grievance Handling Procedure",
      category: "Grievance",
      body: GRIEVANCE_PROCEDURE_BODY,
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
    },
    create: {
      id: "policy-grievance-handling",
      collegeId: COLLEGE_ID,
      title: "Grievance Handling Procedure",
      category: "Grievance",
      body: GRIEVANCE_PROCEDURE_BODY,
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.regulation.upsert({
    where: { id: "regulation-student-code-of-conduct" },
    update: { title: "Student Code of Conduct", status: "PUBLISHED", isPlaceholder: false, publishedAt: new Date(), publishedBy: devUser.id },
    create: {
      id: "regulation-student-code-of-conduct",
      collegeId: COLLEGE_ID,
      title: "Student Code of Conduct",
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Grievance ([DEV SEED] test infrastructure only — grievances are never real college
  // content; CLAUDE.md rule 6 keeps them private regardless) ------------------------------
  const grievance = await prisma.grievance.upsert({
    where: { id: "dev-seed-grievance" },
    update: {
      status: "ASSIGNED",
      isPlaceholder: true,
    },
    create: {
      id: "dev-seed-grievance",
      collegeId: COLLEGE_ID,
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

  // --- Documents (register items 13, 20) ---------------------------------------------------
  const affiliationLetter = await seedWriteRealFile("document", hecAffiliation.id, "doc.pdf");
  await prisma.document.upsert({
    where: { id: "document-hec-recognition-letter" },
    update: {
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      approvedById: devUser.id,
      approvedAt: new Date(),
    },
    create: {
      id: "document-hec-recognition-letter",
      collegeId: COLLEGE_ID,
      entityType: "Affiliation",
      entityId: hecAffiliation.id,
      category: "Affiliation & Recognition",
      title: "Affiliation / Recognition Letter — HEC",
      description: "Current affiliation/recognition letter from the relevant authority (content register item 20).",
      storedPath: affiliationLetter.storedPath,
      fileName: affiliationLetter.fileName,
      mimeType: affiliationLetter.mimeType,
      sizeBytes: affiliationLetter.sizeBytes,
      uploadedById: devUser.id,
      status: "PUBLISHED",
      isPlaceholder: false,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      approvedById: devUser.id,
      approvedAt: new Date(),
      updatedBy: devUser.id,
    },
  });

  // --- [DEV SEED] test fixtures for modules the content register gave no real data for -----
  // The register has no exam schedule, results, fee amounts, seminars, or workshops, so those
  // are intentionally left unseeded for the real college (CLAUDE.md rule 1 — never fabricate
  // official content). But the admin list/detail pages for those modules still need to exist
  // and be exercisable — e.g. tests/e2e/accessibility.spec.ts clicks into the first row of
  // every admin list page — so one clearly-marked, isPlaceholder: true fixture per module is
  // kept here (a different id prefix than "dev-seed-department" etc. above, so the
  // fictional-college cleanup block doesn't delete it on the next run).
  await prisma.examination.upsert({
    where: { id: "dev-fixture-examination" },
    update: { status: "PUBLISHED", isPlaceholder: true, publishedAt: new Date(), publishedBy: devUser.id },
    create: {
      id: "dev-fixture-examination",
      collegeId: COLLEGE_ID,
      programId: "program-fsc-pre-medical",
      examType: "[DEV SEED] Sample Exam Type — fixture only",
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.result.upsert({
    where: { id: "dev-fixture-result" },
    update: { status: "PUBLISHED", isPlaceholder: true, isPublic: false },
    create: {
      id: "dev-fixture-result",
      collegeId: COLLEGE_ID,
      programId: "program-fsc-pre-medical",
      examinationId: "dev-fixture-examination",
      isPublic: false,
      status: "PUBLISHED",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.feeStructure.upsert({
    where: { id: "dev-fixture-fee-structure" },
    update: { status: "PUBLISHED", isPlaceholder: true },
    create: {
      id: "dev-fixture-fee-structure",
      collegeId: COLLEGE_ID,
      programId: "program-fsc-pre-medical",
      academicYear: "2026-27",
      feeType: "[DEV SEED] Sample Fee Type — fixture only, not a real fee",
      amount: "0.00",
      currency: "PKR",
      status: "PUBLISHED",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.seminar.upsert({
    where: { id: "dev-fixture-seminar" },
    update: { status: "PUBLISHED", isPlaceholder: true, publishedAt: new Date(), publishedBy: devUser.id },
    create: {
      id: "dev-fixture-seminar",
      collegeId: COLLEGE_ID,
      departmentId: "dept-science",
      title: "[DEV SEED] Sample Seminar — fixture only",
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
    where: { id: "dev-fixture-workshop" },
    update: { status: "PUBLISHED", isPlaceholder: true, publishedAt: new Date(), publishedBy: devUser.id },
    create: {
      id: "dev-fixture-workshop",
      collegeId: COLLEGE_ID,
      departmentId: "dept-science",
      title: "[DEV SEED] Sample Workshop — fixture only",
      startDate: new Date(),
      status: "PUBLISHED",
      isPlaceholder: true,
      publishedAt: new Date(),
      publishedBy: devUser.id,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Compliance model --------------------------------------------------------------------
  for (const requirement of COMPLIANCE_REQUIREMENTS) {
    await prisma.complianceRequirement.upsert({
      where: {
        collegeId_itemNumber: {
          collegeId: COLLEGE_ID,
          itemNumber: requirement.itemNumber,
        },
      },
      update: {},
      create: {
        collegeId: COLLEGE_ID,
        itemNumber: requirement.itemNumber,
        title: requirement.title,
        description: requirement.description,
        circularReference: CIRCULAR_REFERENCE,
        category: "CONTENT",
        ownerId: devUser.id,
      },
    });
  }
  // Deliberately no fake VERIFIED/READY_FOR_REVIEW statuses here (unlike this file's earlier
  // demo-data version) — CLAUDE.md rule 7 requires an authorized human decision for every
  // compliance status beyond NOT_STARTED/IN_PROGRESS, and none of this real content has
  // actually been reviewed by a person yet. Requirements start at their natural,
  // completeness-derived status (src/lib/compliance.ts) and real admins verify them for real
  // through the Compliance Dashboard once they've logged in.

  // --- Real site administrators (content register item 22) --------------------------------
  // The actual people who manage this site — not test/dev fixtures. Each account is only
  // created/updated when its password is supplied via env (never hardcoded here — CLAUDE.md
  // rule 12); anyone not yet configured is skipped with a warning, so this stays safe to
  // leave in place and idempotent — re-run `npm run db:seed` once SEED_PASSWORD_<ROLE> is set.
  // The register also gave each person's phone number, but `User` has no phone column
  // (prisma/schema.prisma) — not stored; add a schema field for it if that's needed later.
  const REAL_ADMINS: ReadonlyArray<{
    role: (typeof ROLE_NAMES)[number];
    name: string;
    email: string;
  }> = [
    { role: "SUPER_ADMIN", name: "Osama", email: "osama.ikhlas@smgc.com" },
    { role: "PRINCIPAL", name: "Zohan", email: "zohan@smgc.com" },
    { role: "ADMINISTRATOR", name: "Sidra", email: "sidra@smgc.com" },
    { role: "EDITOR", name: "Inaya", email: "inaya@smgc.com" },
    { role: "REVIEWER", name: "Ikhlas", email: "ikhlas@smgc.com" },
    { role: "ADMISSION_OFFICER", name: "Samina", email: "samina@smgc.com" },
    { role: "EXAMINATION_OFFICER", name: "Saad", email: "saad@smgc.com" },
    { role: "FACULTY_EDITOR", name: "Taha", email: "hamza@smgc.com" },
  ];

  for (const admin of REAL_ADMINS) {
    const passwordEnvVar = `SEED_PASSWORD_${admin.role}`;
    const password = process.env[passwordEnvVar];
    if (!password) {
      console.warn(
        `[seed] Skipping real admin "${admin.name}" (${admin.role}) — ${passwordEnvVar} not set.`,
      );
      continue;
    }

    const passwordHash = await hashPassword(password);
    const role = await prisma.role.findUniqueOrThrow({ where: { name: admin.role } });

    const user = await prisma.user.upsert({
      where: { email: admin.email },
      update: { name: admin.name, passwordHash },
      create: {
        collegeId: COLLEGE_ID,
        name: admin.name,
        email: admin.email,
        passwordHash,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId_collegeId: { userId: user.id, roleId: role.id, collegeId: COLLEGE_ID },
      },
      update: {},
      create: { userId: user.id, roleId: role.id, collegeId: COLLEGE_ID },
    });

    console.log(`[seed] Real admin ready: ${admin.name} (${admin.role}) <${admin.email}>`);
  }

  console.log(
    "Seed complete: baseline roles, the real college (Sindh Muslim Government Science " +
      "College, Karachi) and its content register, 20 compliance requirements (from the " +
      "circular), and any configured real site administrators.",
  );
}

const PRINCIPAL_MESSAGE =
  "It is my pleasure to welcome all students to Sindh Muslim Government Science College, Karachi, an institution with a long and proud educational history. Since its establishment in 1943, the college has played an important role in providing quality education and developing talented students.\n\n" +
  "Our aim is to provide students with a supportive learning environment where they can develop knowledge, critical thinking, discipline, creativity, and confidence. We encourage our students to work hard, respect others, and use their education for the betterment of society.\n\n" +
  "I believe that education is not only about academic achievement; it is also about developing responsible, ethical, and capable citizens. I encourage every student to make the most of the opportunities available at the college and to pursue their goals with dedication and determination.\n\n" +
  "I wish all our students success in their academic journey and a bright future ahead.";

const GRIEVANCE_PROCEDURE_BODY =
  "Students or stakeholders can submit a complaint to the college administration. The complaint is recorded and referred to the relevant officer/department for review. The administration investigates the matter, communicates with the concerned parties where necessary, and takes appropriate action according to applicable college/government rules. Confidentiality should be maintained, particularly for sensitive complaints.\n\n" +
  "Grievance officer: Mukhtar Ahmed (mukhtar.ahmed@smgc.com, 03122533423).";

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
