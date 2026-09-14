import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

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

// Transcribed verbatim (paraphrased for brevity) from docs/compliance-matrix.md §1, which
// itself transcribes the circular's 20 required content categories. This is the fixed
// checklist every affiliated college is measured against — seeding it is system taxonomy,
// not invented college data (same rationale as ROLES above).
const COMPLIANCE_REQUIREMENTS: Array<{
  itemNumber: number;
  title: string;
  description: string;
}> = [
  { itemNumber: 1, title: "College profile", description: "College Profile, history, vision/mission, objectives." },
  { itemNumber: 2, title: "Day-to-day activities", description: "Day-to-day academic/admin activities (notices, events, seminars, workshops)." },
  { itemNumber: 3, title: "Physical infrastructure", description: "Physical infrastructure of the college." },
  { itemNumber: 4, title: "Faculty details", description: "Faculty details, per department." },
  { itemNumber: 5, title: "Non-teaching staff details", description: "Non-teaching staff details." },
  { itemNumber: 6, title: "Programs and affiliation", description: "Programs/degrees offered plus affiliation/approval status." },
  { itemNumber: 7, title: "Timetable and academic calendar", description: "Class/program-wise timetable and academic calendar." },
  { itemNumber: 8, title: "Admission information", description: "Admission info: notices, eligibility, fees, schedule." },
  { itemNumber: 9, title: "Enrollment statistics", description: "Total enrollment/admissions, program- and session-wise." },
  { itemNumber: 10, title: "Examination and results info", description: "Examination/academic info: notices, results, announcements." },
  { itemNumber: 11, title: "Contact details", description: "Contact details for the college." },
  { itemNumber: 12, title: "Location", description: "Complete location and a map link." },
  { itemNumber: 13, title: "Regulatory/affiliation status", description: "Regulatory/affiliation status of the college and its programs." },
  { itemNumber: 14, title: "Co-curricular activities", description: "Co-curricular/extra-curricular activities." },
  { itemNumber: 15, title: "Notifications and announcements", description: "General notifications and announcements." },
  { itemNumber: 16, title: "Photo gallery", description: "Photo gallery of the college." },
  { itemNumber: 17, title: "Scholarships and student support", description: "Scholarships, financial assistance, and student support services." },
  { itemNumber: 18, title: "Rules, regulations, policies", description: "Rules, regulations, and policies governing the college." },
  { itemNumber: 19, title: "Grievance mechanism", description: "A reachable, confidential grievance mechanism for students/stakeholders." },
  { itemNumber: 20, title: "Other required information", description: "Any other information required by the affiliating university/regulator." },
];

async function main() {
  // --- Tenancy / RBAC (unchanged from Phase 1) -----------------------------------------
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

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

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: "super_admin" } });
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

  // --- College profile -------------------------------------------------------------------
  await prisma.collegeProfile.upsert({
    where: { collegeId: PLACEHOLDER_COLLEGE_ID },
    update: {},
    create: {
      collegeId: PLACEHOLDER_COLLEGE_ID,
      overview: "[PLACEHOLDER] Sample overview text — replace with real college profile copy.",
      missionStatement: "[PLACEHOLDER] Sample mission statement.",
      visionStatement: "[PLACEHOLDER] Sample vision statement.",
      history: "[PLACEHOLDER] Sample history text.",
      principalName: "[PLACEHOLDER] Principal Name",
      principalMessage: "[PLACEHOLDER] Sample principal's message.",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Academic structure ------------------------------------------------------------------
  const department = await prisma.department.upsert({
    where: { id: "dev-seed-department" },
    update: {},
    create: {
      id: "dev-seed-department",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      name: "[PLACEHOLDER] Department of Sample Studies",
      description: "[PLACEHOLDER] Sample department for local development only.",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  const program = await prisma.program.upsert({
    where: { id: "dev-seed-program" },
    update: {},
    create: {
      id: "dev-seed-program",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      departmentId: department.id,
      name: "[PLACEHOLDER] BS Sample Studies",
      level: "UNDERGRADUATE",
      durationYears: 4,
      description: "[PLACEHOLDER] Sample program for local development only.",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.course.upsert({
    where: { programId_code: { programId: program.id, code: "SAMP-101" } },
    update: {},
    create: {
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      code: "SAMP-101",
      title: "[PLACEHOLDER] Introduction to Sample Studies",
      creditHours: 3,
      semester: 1,
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.affiliation.upsert({
    where: { id: "dev-seed-affiliation" },
    update: {},
    create: {
      id: "dev-seed-affiliation",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      universityName: "[PLACEHOLDER] Sample Affiliating University",
      affiliationNumber: "[PLACEHOLDER] AFF-0000",
      regulatoryBody: "[PLACEHOLDER] Sample Regulatory Body",
      validFrom: new Date("2026-01-01"),
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- People --------------------------------------------------------------------------
  const faculty = await prisma.faculty.upsert({
    where: { id: "dev-seed-faculty" },
    update: {},
    create: {
      id: "dev-seed-faculty",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      departmentId: department.id,
      name: "[PLACEHOLDER] Dr. Sample Faculty",
      designation: "[PLACEHOLDER] Assistant Professor",
      subjectsTaught: ["[PLACEHOLDER] Sample Subject"],
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.staff.upsert({
    where: { id: "dev-seed-staff" },
    update: {},
    create: {
      id: "dev-seed-staff",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      name: "[PLACEHOLDER] Sample Staff Member",
      designation: "[PLACEHOLDER] Office Assistant",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.club.upsert({
    where: { id: "dev-seed-club" },
    update: {},
    create: {
      id: "dev-seed-club",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      name: "[PLACEHOLDER] Sample Student Club",
      facultyAdvisorId: faculty.id,
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Infrastructure --------------------------------------------------------------------
  await prisma.infrastructure.upsert({
    where: { id: "dev-seed-infrastructure" },
    update: {},
    create: {
      id: "dev-seed-infrastructure",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      category: "LIBRARY",
      name: "[PLACEHOLDER] Sample Library",
      description: "[PLACEHOLDER] Sample infrastructure record.",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Communications ---------------------------------------------------------------------
  const notice = await prisma.notice.upsert({
    where: { id: "dev-seed-notice" },
    update: {},
    create: {
      id: "dev-seed-notice",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Sample Notice",
      body: "[PLACEHOLDER] Sample notice body text.",
      category: "general",
      publishDate: new Date(),
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.event.upsert({
    where: { id: "dev-seed-event" },
    update: {},
    create: {
      id: "dev-seed-event",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Sample Event",
      startDate: new Date(),
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.seminar.upsert({
    where: { id: "dev-seed-seminar" },
    update: {},
    create: {
      id: "dev-seed-seminar",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      departmentId: department.id,
      title: "[PLACEHOLDER] Sample Seminar",
      speaker: "[PLACEHOLDER] Sample Speaker",
      startDate: new Date(),
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.workshop.upsert({
    where: { id: "dev-seed-workshop" },
    update: {},
    create: {
      id: "dev-seed-workshop",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      departmentId: department.id,
      title: "[PLACEHOLDER] Sample Workshop",
      facilitator: "[PLACEHOLDER] Sample Facilitator",
      startDate: new Date(),
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.activity.upsert({
    where: { id: "dev-seed-activity" },
    update: {},
    create: {
      id: "dev-seed-activity",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Sample Co-curricular Activity",
      category: "co-curricular",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Calendar & scheduling ---------------------------------------------------------------
  await prisma.academicCalendar.upsert({
    where: { id: "dev-seed-calendar-entry" },
    update: {},
    create: {
      id: "dev-seed-calendar-entry",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Sample Semester Start",
      startDate: new Date("2026-09-01"),
      academicYear: "2026-2027",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.timetable.upsert({
    where: { id: "dev-seed-timetable" },
    update: {},
    create: {
      id: "dev-seed-timetable",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      classGroup: "[PLACEHOLDER] Semester 1 - Section A",
      effectiveFrom: new Date("2026-09-01"),
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Admissions & enrollment -------------------------------------------------------------
  const admission = await prisma.admission.upsert({
    where: { id: "dev-seed-admission" },
    update: {},
    create: {
      id: "dev-seed-admission",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      academicYear: "2026-2027",
      eligibilityCriteria: "[PLACEHOLDER] Sample eligibility criteria.",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.feeStructure.upsert({
    where: { id: "dev-seed-fee-structure" },
    update: {},
    create: {
      id: "dev-seed-fee-structure",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      admissionId: admission.id,
      academicYear: "2026-2027",
      feeType: "tuition",
      amount: "0.00",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.enrollmentStatistic.upsert({
    where: { id: "dev-seed-enrollment-stat" },
    update: {},
    create: {
      id: "dev-seed-enrollment-stat",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      academicYear: "2026-2027",
      sessionType: "morning",
      totalEnrolled: 0,
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Examinations & results --------------------------------------------------------------
  const examination = await prisma.examination.upsert({
    where: { id: "dev-seed-examination" },
    update: {},
    create: {
      id: "dev-seed-examination",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      examType: "[PLACEHOLDER] Mid-term",
      academicYear: "2026-2027",
      noticeId: notice.id,
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.result.upsert({
    where: { id: "dev-seed-result" },
    update: {},
    create: {
      id: "dev-seed-result",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      programId: program.id,
      examinationId: examination.id,
      isPublic: false,
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Contact & location ------------------------------------------------------------------
  await prisma.contact.upsert({
    where: { id: "dev-seed-contact" },
    update: {},
    create: {
      id: "dev-seed-contact",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      type: "EMAIL",
      value: "info@example.invalid",
      label: "[PLACEHOLDER] General Enquiries",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.location.upsert({
    where: { id: "dev-seed-location" },
    update: {},
    create: {
      id: "dev-seed-location",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      address: "[PLACEHOLDER] Sample Address, Sample City",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Gallery -------------------------------------------------------------------------
  const media = await prisma.media.upsert({
    where: { id: "dev-seed-media" },
    update: {},
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
    update: {},
    create: {
      id: "dev-seed-gallery-album",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Sample Gallery Album",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.galleryItem.upsert({
    where: { id: "dev-seed-gallery-item" },
    update: {},
    create: {
      id: "dev-seed-gallery-item",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      albumId: album.id,
      mediaId: media.id,
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Student support ---------------------------------------------------------------------
  await prisma.scholarship.upsert({
    where: { id: "dev-seed-scholarship" },
    update: {},
    create: {
      id: "dev-seed-scholarship",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      name: "[PLACEHOLDER] Sample Scholarship",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.studentSupport.upsert({
    where: { id: "dev-seed-student-support" },
    update: {},
    create: {
      id: "dev-seed-student-support",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      name: "[PLACEHOLDER] Sample Student Support Service",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Policies -------------------------------------------------------------------------
  await prisma.policy.upsert({
    where: { id: "dev-seed-policy" },
    update: {},
    create: {
      id: "dev-seed-policy",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Sample Policy",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  await prisma.regulation.upsert({
    where: { id: "dev-seed-regulation" },
    update: {},
    create: {
      id: "dev-seed-regulation",
      collegeId: PLACEHOLDER_COLLEGE_ID,
      title: "[PLACEHOLDER] Sample Regulation",
      isPlaceholder: true,
      createdBy: devUser.id,
      updatedBy: devUser.id,
    },
  });

  // --- Grievance (dev/demo submission only — never real, never public) ---------------------
  const grievance = await prisma.grievance.upsert({
    where: { id: "dev-seed-grievance" },
    update: {},
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
    update: {},
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
      isPlaceholder: true,
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
