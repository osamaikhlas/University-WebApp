import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    collegeProfile: { findFirst: vi.fn() },
    notice: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
    infrastructure: { findMany: vi.fn() },
    faculty: { findMany: vi.fn() },
    department: { count: vi.fn() },
    staff: { findMany: vi.fn() },
    program: { findMany: vi.fn(), count: vi.fn() },
    affiliation: { findMany: vi.fn() },
    timetable: { findMany: vi.fn() },
    academicCalendar: { findMany: vi.fn() },
    admission: { findMany: vi.fn() },
    feeStructure: { count: vi.fn() },
    enrollmentStatistic: { findMany: vi.fn() },
    examination: { findMany: vi.fn() },
    result: { findMany: vi.fn() },
    contact: { findMany: vi.fn() },
    location: { findFirst: vi.fn() },
    activity: { findMany: vi.fn() },
    galleryAlbum: { count: vi.fn() },
    galleryItem: { findMany: vi.fn() },
    scholarship: { findMany: vi.fn() },
    studentSupport: { findMany: vi.fn() },
    policy: { findMany: vi.fn() },
    regulation: { findMany: vi.fn() },
    userRole: { count: vi.fn() },
    document: { count: vi.fn() },
    complianceEvidence: { findMany: vi.fn() },
    complianceRequirement: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    complianceVerification: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/content", () => ({
  getPrimaryCollege: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import {
  COMPLIANCE_RULES,
  getComplianceOverview,
  getComplianceRequirementDetail,
} from "@/lib/compliance";

const COLLEGE_ID = "college-1";
const REQUIREMENT_ID = "req-1";
const ctx = { collegeId: COLLEGE_ID, requirementId: REQUIREMENT_ID };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.complianceEvidence.findMany).mockResolvedValue([]);
  vi.mocked(prisma.document.count).mockResolvedValue(0);
});

describe("COMPLIANCE_RULES: explicit metadata for all 20 requirements", () => {
  it("defines required records, required fields, a responsible role, a responsible module, and a check for every item 1-20", () => {
    for (let itemNumber = 1; itemNumber <= 20; itemNumber++) {
      const rule = COMPLIANCE_RULES[itemNumber];
      expect(rule, `item ${itemNumber}`).toBeDefined();
      expect(rule.itemNumber).toBe(itemNumber);
      expect(rule.requiredRecords.length).toBeGreaterThan(0);
      expect(rule.requiredFields.length).toBeGreaterThan(0);
      expect(rule.responsibleRole.length).toBeGreaterThan(0);
      expect(rule.responsibleModule.label.length).toBeGreaterThan(0);
      expect(rule.responsibleModule.adminPath.startsWith("/admin")).toBe(true);
      expect(typeof rule.check).toBe("function");
    }
  });

  it("item 20 (any other information) has no fixed public route — reviewed case by case", () => {
    expect(COMPLIANCE_RULES[20].publicRoute).toBeNull();
  });

  it("items 8, 10, 13, and 18 declare a required supporting document; the rest don't", () => {
    for (const itemNumber of [8, 10, 13, 18]) {
      expect(COMPLIANCE_RULES[itemNumber].requiredDocuments).not.toBeNull();
    }
    for (const itemNumber of [1, 2, 3, 4, 5, 6, 7, 9, 11, 12, 14, 15, 16, 17, 19]) {
      expect(COMPLIANCE_RULES[itemNumber].requiredDocuments).toBeNull();
    }
  });
});

describe("item 1: College profile", () => {
  const check = COMPLIANCE_RULES[1].check;

  it("is 0% when no profile record exists at all", async () => {
    vi.mocked(prisma.collegeProfile.findFirst).mockResolvedValue(null);
    const result = await check(ctx);
    expect(result.percent).toBe(0);
  });

  it("is not 100% when the record exists but required fields are missing (not a page-exists check)", async () => {
    vi.mocked(prisma.collegeProfile.findFirst).mockResolvedValue({
      status: "PUBLISHED",
      overview: "Overview text",
      missionStatement: "",
      visionStatement: null,
      history: "History text",
      principalMessage: null,
    } as never);
    const result = await check(ctx);
    expect(result.percent).toBeLessThan(100);
    expect(result.checks.find((c) => c.label.includes("Mission"))?.met).toBe(false);
    expect(result.checks.find((c) => c.label.includes("Principal"))?.met).toBe(false);
  });

  it("is 100% once published with every required field populated", async () => {
    vi.mocked(prisma.collegeProfile.findFirst).mockResolvedValue({
      status: "PUBLISHED",
      overview: "Overview text",
      missionStatement: "Mission text",
      visionStatement: "Vision text",
      history: "History text",
      principalMessage: "Message text",
    } as never);
    const result = await check(ctx);
    expect(result.percent).toBe(100);
  });
});

describe("item 2: Day-to-day activities", () => {
  const check = COMPLIANCE_RULES[2].check;

  it("is 0% with no published notices or events", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([]);
    vi.mocked(prisma.event.findMany).mockResolvedValue([]);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("penalizes a notice missing its category even though at least one notice/event exists", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([{ category: null }] as never);
    vi.mocked(prisma.event.findMany).mockResolvedValue([{ description: "Details" }] as never);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("category"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("is 100% when notices and events all carry their descriptive fields", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([{ category: "general" }] as never);
    vi.mocked(prisma.event.findMany).mockResolvedValue([{ description: "Details" }] as never);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 3: Physical infrastructure", () => {
  const check = COMPLIANCE_RULES[3].check;

  it("is 0% with no published infrastructure", async () => {
    vi.mocked(prisma.infrastructure.findMany).mockResolvedValue([]);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("flags a single category and a missing description even though a record exists", async () => {
    vi.mocked(prisma.infrastructure.findMany).mockResolvedValue([
      { category: "LIBRARY", description: null },
    ] as never);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("More than one"))?.met).toBe(false);
    expect(result.checks.find((c) => c.label.includes("description"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("is 100% with multiple categories, all described", async () => {
    vi.mocked(prisma.infrastructure.findMany).mockResolvedValue([
      { category: "LIBRARY", description: "The main library" },
      { category: "LAB", description: "The computer lab" },
    ] as never);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 4: Faculty details", () => {
  const check = COMPLIANCE_RULES[4].check;

  it("is 0% with no published faculty and no published departments", async () => {
    vi.mocked(prisma.faculty.findMany).mockResolvedValue([]);
    vi.mocked(prisma.department.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    const result = await check(ctx);
    expect(result.percent).toBe(0);
  });

  it("faculty existing with missing qualifications/contact info is not treated as compliant", async () => {
    vi.mocked(prisma.faculty.findMany).mockResolvedValue([
      { designation: "Lecturer", qualifications: null, subjectsTaught: [], email: null, phone: null },
    ] as never);
    vi.mocked(prisma.department.count).mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("qualifications"))?.met).toBe(false);
    expect(result.checks.find((c) => c.label.includes("subjects taught"))?.met).toBe(false);
    expect(result.checks.find((c) => c.label.includes("email or phone"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("is 100% when every published department has a fully-described faculty member", async () => {
    vi.mocked(prisma.faculty.findMany).mockResolvedValue([
      {
        designation: "Assistant Professor",
        qualifications: "PhD",
        subjectsTaught: ["Mathematics"],
        email: "faculty@example.invalid",
        phone: null,
      },
    ] as never);
    vi.mocked(prisma.department.count).mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    expect((await check(ctx)).percent).toBe(100);
  });

  it("is not 100% when only some published departments have a published faculty member", async () => {
    vi.mocked(prisma.faculty.findMany).mockResolvedValue([
      {
        designation: "Assistant Professor",
        qualifications: "PhD",
        subjectsTaught: ["Mathematics"],
        email: "faculty@example.invalid",
        phone: null,
      },
    ] as never);
    vi.mocked(prisma.department.count).mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("Every published department"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });
});

describe("item 5: Non-teaching staff", () => {
  const check = COMPLIANCE_RULES[5].check;

  it("is 0% with no published staff", async () => {
    vi.mocked(prisma.staff.findMany).mockResolvedValue([]);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("a staff record with no department is not fully compliant", async () => {
    vi.mocked(prisma.staff.findMany).mockResolvedValue([
      { designation: "Office Assistant", department: null },
    ] as never);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("department"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("is 100% when every staff record has a designation and a department", async () => {
    vi.mocked(prisma.staff.findMany).mockResolvedValue([
      { designation: "Office Assistant", department: "Administration" },
    ] as never);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 6: Programs and affiliation", () => {
  const check = COMPLIANCE_RULES[6].check;

  it("is 0% with no published programs", async () => {
    vi.mocked(prisma.program.findMany).mockResolvedValue([]);
    vi.mocked(prisma.program.count).mockResolvedValue(0);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("a program lacking a linked affiliation is not fully compliant", async () => {
    vi.mocked(prisma.program.findMany).mockResolvedValue([
      { durationYears: 4, description: "BS program" },
    ] as never);
    vi.mocked(prisma.program.count).mockResolvedValue(0);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("linked affiliation"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("is 100% when every published program has a description, a duration, and an affiliation", async () => {
    vi.mocked(prisma.program.findMany).mockResolvedValue([
      { durationYears: 4, description: "BS program" },
    ] as never);
    vi.mocked(prisma.program.count).mockResolvedValue(1);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 7: Timetable and academic calendar", () => {
  const check = COMPLIANCE_RULES[7].check;

  it("is 0% with no published timetables or calendar entries", async () => {
    vi.mocked(prisma.timetable.findMany).mockResolvedValue([]);
    vi.mocked(prisma.academicCalendar.findMany).mockResolvedValue([]);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("a timetable missing its structured schedule is not fully compliant", async () => {
    vi.mocked(prisma.timetable.findMany).mockResolvedValue([{ structuredSchedule: null }] as never);
    vi.mocked(prisma.academicCalendar.findMany).mockResolvedValue([
      { category: "semester", academicYear: "2026-2027" },
    ] as never);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("structured schedule"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("is 100% when timetables and calendar entries all carry their required fields", async () => {
    vi.mocked(prisma.timetable.findMany).mockResolvedValue([
      { structuredSchedule: { monday: [] } },
    ] as never);
    vi.mocked(prisma.academicCalendar.findMany).mockResolvedValue([
      { category: "semester", academicYear: "2026-2027" },
    ] as never);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 8: Admission information", () => {
  const check = COMPLIANCE_RULES[8].check;

  it("is 0% with no published admissions, fee structures, or document evidence", async () => {
    vi.mocked(prisma.admission.findMany).mockResolvedValue([]);
    vi.mocked(prisma.feeStructure.count).mockResolvedValue(0);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("current admission info missing eligibility/dates is not fully compliant even with a fee structure", async () => {
    vi.mocked(prisma.admission.findMany).mockResolvedValue([
      { eligibilityCriteria: null, applicationStartDate: null, applicationEndDate: null },
    ] as never);
    vi.mocked(prisma.feeStructure.count).mockResolvedValue(1);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("eligibility"))?.met).toBe(false);
    expect(result.checks.find((c) => c.label.includes("start date"))?.met).toBe(false);
    expect(result.checks.find((c) => c.label.includes("end date"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("requires an attached, published document as evidence to be fully compliant", async () => {
    vi.mocked(prisma.admission.findMany).mockResolvedValue([
      {
        eligibilityCriteria: "Criteria",
        applicationStartDate: new Date(),
        applicationEndDate: new Date(),
      },
    ] as never);
    vi.mocked(prisma.feeStructure.count).mockResolvedValue(1);
    vi.mocked(prisma.complianceEvidence.findMany).mockResolvedValue([]);

    let result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("prospectus"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);

    vi.mocked(prisma.complianceEvidence.findMany).mockResolvedValue([
      { entityId: "doc-1" },
    ] as never);
    vi.mocked(prisma.document.count).mockResolvedValue(1);
    result = await check(ctx);
    expect(result.percent).toBe(100);
  });
});

describe("item 9: Enrollment statistics", () => {
  const check = COMPLIANCE_RULES[9].check;

  it("is 0% with no published enrollment statistics", async () => {
    vi.mocked(prisma.enrollmentStatistic.findMany).mockResolvedValue([]);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("a statistic missing its session type is not fully compliant", async () => {
    vi.mocked(prisma.enrollmentStatistic.findMany).mockResolvedValue([
      { sessionType: null, academicYear: "2026-2027" },
    ] as never);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("session type"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("is 100% when every statistic has a session type and academic year", async () => {
    vi.mocked(prisma.enrollmentStatistic.findMany).mockResolvedValue([
      { sessionType: "morning", academicYear: "2026-2027" },
    ] as never);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 10: Examination and results info", () => {
  const check = COMPLIANCE_RULES[10].check;

  it("is 0% with no published examinations, results, or evidence", async () => {
    vi.mocked(prisma.examination.findMany).mockResolvedValue([]);
    vi.mocked(prisma.result.findMany).mockResolvedValue([]);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("an examination without a scheduled date is not fully compliant even if results exist", async () => {
    vi.mocked(prisma.examination.findMany).mockResolvedValue([{ scheduleStartDate: null }] as never);
    vi.mocked(prisma.result.findMany).mockResolvedValue([{ publishDate: new Date() }] as never);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("scheduled start date"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("is 100% once examinations/results carry their fields and a gazette document is attached", async () => {
    vi.mocked(prisma.examination.findMany).mockResolvedValue([
      { scheduleStartDate: new Date() },
    ] as never);
    vi.mocked(prisma.result.findMany).mockResolvedValue([{ publishDate: new Date() }] as never);
    vi.mocked(prisma.complianceEvidence.findMany).mockResolvedValue([{ entityId: "doc-1" }] as never);
    vi.mocked(prisma.document.count).mockResolvedValue(1);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 11: Contact details", () => {
  const check = COMPLIANCE_RULES[11].check;

  it("is 0% with no published contacts", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([]);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("requires both a phone and an email contact, each labeled", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([
      { type: "EMAIL", label: "General enquiries" },
    ] as never);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("phone"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("is 100% with a labeled phone and a labeled email contact", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([
      { type: "EMAIL", label: "General enquiries" },
      { type: "PHONE", label: "Front desk" },
    ] as never);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 12: Location", () => {
  const check = COMPLIANCE_RULES[12].check;

  it("is 0% with no published location record", async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue(null);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("an address without a map link is not fully compliant", async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue({
      address: "123 Main St",
      mapEmbedUrl: null,
    } as never);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("Map link"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("is 100% with both an address and a map link", async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue({
      address: "123 Main St",
      mapEmbedUrl: "https://maps.example.invalid/embed",
    } as never);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 13: Regulatory/affiliation status", () => {
  const check = COMPLIANCE_RULES[13].check;

  it("is 0% with no published affiliation and no document evidence", async () => {
    vi.mocked(prisma.affiliation.findMany).mockResolvedValue([]);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("an affiliation missing its registration number is not fully compliant", async () => {
    vi.mocked(prisma.affiliation.findMany).mockResolvedValue([
      { affiliationNumber: null, regulatoryBody: "HEC", validFrom: new Date() },
    ] as never);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("registration number"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("requires an attached approval certificate document to be fully compliant", async () => {
    vi.mocked(prisma.affiliation.findMany).mockResolvedValue([
      { affiliationNumber: "AFF-001", regulatoryBody: "HEC", validFrom: new Date() },
    ] as never);
    vi.mocked(prisma.complianceEvidence.findMany).mockResolvedValue([{ entityId: "doc-1" }] as never);
    vi.mocked(prisma.document.count).mockResolvedValue(1);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 14: Co-curricular activities", () => {
  const check = COMPLIANCE_RULES[14].check;

  it("is 0% with no published activities", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("an activity missing a category is not fully compliant", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([
      { description: "Annual sports day", category: null },
    ] as never);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("category"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("is 100% when every activity has a description and a category", async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([
      { description: "Annual sports day", category: "sports" },
    ] as never);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 15: Notifications and announcements", () => {
  const check = COMPLIANCE_RULES[15].check;

  it("is 0% with no published notices", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([]);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("a notice without a publish date is not fully compliant", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([{ publishDate: null }] as never);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("publish date"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("is 100% when every notice has a publish date", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([{ publishDate: new Date() }] as never);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 16: Photo gallery", () => {
  const check = COMPLIANCE_RULES[16].check;

  it("is 0% with no published album containing a published photo", async () => {
    vi.mocked(prisma.galleryAlbum.count).mockResolvedValue(0);
    vi.mocked(prisma.galleryItem.findMany).mockResolvedValue([]);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("a photo missing a caption is not fully compliant even if the album qualifies", async () => {
    vi.mocked(prisma.galleryAlbum.count).mockResolvedValue(1);
    vi.mocked(prisma.galleryItem.findMany).mockResolvedValue([{ caption: null }] as never);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("caption"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("is 100% when the album qualifies and every photo has a caption", async () => {
    vi.mocked(prisma.galleryAlbum.count).mockResolvedValue(1);
    vi.mocked(prisma.galleryItem.findMany).mockResolvedValue([{ caption: "Graduation day" }] as never);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 17: Scholarships and student support", () => {
  const check = COMPLIANCE_RULES[17].check;

  it("is 0% with no published scholarships or support services", async () => {
    vi.mocked(prisma.scholarship.findMany).mockResolvedValue([]);
    vi.mocked(prisma.studentSupport.findMany).mockResolvedValue([]);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("a scholarship missing eligibility criteria is not fully compliant", async () => {
    vi.mocked(prisma.scholarship.findMany).mockResolvedValue([{ eligibility: null }] as never);
    vi.mocked(prisma.studentSupport.findMany).mockResolvedValue([{ contactInfo: "support@example.invalid" }] as never);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("eligibility"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("is 100% when scholarships and support services both carry their fields", async () => {
    vi.mocked(prisma.scholarship.findMany).mockResolvedValue([{ eligibility: "Merit-based" }] as never);
    vi.mocked(prisma.studentSupport.findMany).mockResolvedValue([
      { contactInfo: "support@example.invalid" },
    ] as never);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 18: Rules, regulations, policies", () => {
  const check = COMPLIANCE_RULES[18].check;

  it("is 0% with no published policies, regulations, or document evidence", async () => {
    vi.mocked(prisma.policy.findMany).mockResolvedValue([]);
    vi.mocked(prisma.regulation.findMany).mockResolvedValue([]);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("a regulation missing its regulating body is not fully compliant", async () => {
    vi.mocked(prisma.policy.findMany).mockResolvedValue([{ body: "Policy text" }] as never);
    vi.mocked(prisma.regulation.findMany).mockResolvedValue([
      { body: "Regulation text", regulatingBody: null },
    ] as never);
    const result = await check(ctx);
    expect(result.checks.find((c) => c.label.includes("regulating body"))?.met).toBe(false);
    expect(result.percent).toBeLessThan(100);
  });

  it("requires an attached policy/regulation document to be fully compliant", async () => {
    vi.mocked(prisma.policy.findMany).mockResolvedValue([{ body: "Policy text" }] as never);
    vi.mocked(prisma.regulation.findMany).mockResolvedValue([
      { body: "Regulation text", regulatingBody: "HEC" },
    ] as never);
    vi.mocked(prisma.complianceEvidence.findMany).mockResolvedValue([{ entityId: "doc-1" }] as never);
    vi.mocked(prisma.document.count).mockResolvedValue(1);
    expect((await check(ctx)).percent).toBe(100);
  });
});

describe("item 19: Grievance mechanism", () => {
  const check = COMPLIANCE_RULES[19].check;

  it("is 0% (not working) when nobody is assigned to handle grievances", async () => {
    vi.mocked(prisma.userRole.count).mockResolvedValue(0);
    expect((await check(ctx)).percent).toBe(0);
  });

  it("is 100% once a Principal/Administrator/Super Admin is assigned", async () => {
    vi.mocked(prisma.userRole.count).mockResolvedValue(1);
    expect((await check(ctx)).percent).toBe(100);
  });

  it("queries for exactly the accountable roles, scoped to this college", async () => {
    vi.mocked(prisma.userRole.count).mockResolvedValue(1);
    await check(ctx);
    expect(prisma.userRole.count).toHaveBeenCalledWith({
      where: {
        collegeId: COLLEGE_ID,
        role: { name: { in: ["PRINCIPAL", "ADMINISTRATOR", "SUPER_ADMIN"] } },
      },
    });
  });
});

describe("item 20: Any other required information", () => {
  const check = COMPLIANCE_RULES[20].check;

  it("has no fixed data source and is never automatically complete, regardless of college", async () => {
    const result = await check(ctx);
    expect(result.percent).toBe(0);
    expect(result.checks[0]?.met).toBe(false);
  });
});

describe("getComplianceOverview", () => {
  it("returns no rows when there is no college yet", async () => {
    vi.mocked(getPrimaryCollege).mockResolvedValue(null);
    const rows = await getComplianceOverview();
    expect(rows).toEqual([]);
    expect(prisma.complianceRequirement.findMany).not.toHaveBeenCalled();
  });

  it("attaches each row's explicit rule and computed completeness", async () => {
    vi.mocked(getPrimaryCollege).mockResolvedValue({ id: COLLEGE_ID } as never);
    vi.mocked(prisma.complianceRequirement.findMany).mockResolvedValue([
      {
        id: "req-20",
        itemNumber: 20,
        title: "Other required information",
        description: "desc",
        circularReference: "ref",
        status: "NOT_STARTED",
        ownerId: null,
        updatedAt: new Date("2026-01-01"),
        _count: { evidence: 0 },
        verifications: [],
      },
    ] as never);

    const rows = await getComplianceOverview();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "req-20", itemNumber: 20, status: "NOT_STARTED" });
    expect(rows[0]!.rule).toBe(COMPLIANCE_RULES[20]);
    expect(rows[0]!.completeness.percent).toBe(0);
    expect(prisma.complianceRequirement.update).not.toHaveBeenCalled();
  });

  it("automatically promotes NOT_STARTED to IN_PROGRESS when evidence exists", async () => {
    vi.mocked(getPrimaryCollege).mockResolvedValue({ id: COLLEGE_ID } as never);
    vi.mocked(prisma.complianceRequirement.findMany).mockResolvedValue([
      {
        id: "req-20",
        itemNumber: 20,
        title: "Other required information",
        description: "desc",
        circularReference: "ref",
        status: "NOT_STARTED",
        ownerId: null,
        updatedAt: new Date("2026-01-01"),
        _count: { evidence: 1 },
        verifications: [],
      },
    ] as never);

    const rows = await getComplianceOverview();

    expect(rows[0]!.status).toBe("IN_PROGRESS");
    expect(prisma.complianceRequirement.update).toHaveBeenCalledWith({
      where: { id: "req-20" },
      data: { status: "IN_PROGRESS" },
    });
  });

  it("never lets automatic sync override a VERIFIED requirement, and surfaces the last verification", async () => {
    vi.mocked(getPrimaryCollege).mockResolvedValue({ id: COLLEGE_ID } as never);
    vi.mocked(prisma.complianceRequirement.findMany).mockResolvedValue([
      {
        id: "req-20",
        itemNumber: 20,
        title: "Other required information",
        description: "desc",
        circularReference: "ref",
        status: "VERIFIED",
        ownerId: null,
        updatedAt: new Date("2026-01-01"),
        _count: { evidence: 0 },
        verifications: [
          {
            id: "v1",
            decision: "VERIFIED",
            verifiedAt: new Date("2026-02-01"),
            note: "Looks good.",
            verifiedBy: { name: "Reviewer One" },
          },
        ],
      },
    ] as never);

    const rows = await getComplianceOverview();

    expect(rows[0]!.status).toBe("VERIFIED");
    expect(prisma.complianceRequirement.update).not.toHaveBeenCalled();
    expect(rows[0]!.lastVerification).toMatchObject({
      decision: "VERIFIED",
      verifiedByName: "Reviewer One",
      note: "Looks good.",
    });
  });
});

describe("getComplianceRequirementDetail", () => {
  it("returns null when the requirement doesn't exist", async () => {
    vi.mocked(prisma.complianceRequirement.findUnique).mockResolvedValue(null);
    expect(await getComplianceRequirementDetail("missing")).toBeNull();
  });

  it("includes the rule, full evidence list, and verification history", async () => {
    vi.mocked(prisma.complianceRequirement.findUnique).mockResolvedValue({
      id: "req-20",
      itemNumber: 20,
      title: "Other required information",
      description: "desc",
      circularReference: "ref",
      status: "NOT_APPLICABLE",
      ownerId: "user-1",
      owner: { name: "Owner Person" },
      collegeId: COLLEGE_ID,
      updatedAt: new Date("2026-01-01"),
      evidence: [
        {
          id: "ev-1",
          entityType: "Notice",
          entityId: "n1",
          note: "linked",
          createdAt: new Date("2026-01-02"),
          addedBy: { name: "Adder Person" },
        },
      ],
      verifications: [
        {
          id: "v1",
          decision: "NEEDS_UPDATE",
          verifiedAt: new Date("2026-01-03"),
          note: "Not applicable to this college.",
          verifiedBy: { name: "Reviewer Person" },
        },
      ],
    } as never);

    const detail = await getComplianceRequirementDetail("req-20");

    expect(detail).not.toBeNull();
    expect(detail!.rule).toBe(COMPLIANCE_RULES[20]);
    expect(detail!.ownerName).toBe("Owner Person");
    expect(detail!.evidence).toEqual([
      {
        id: "ev-1",
        entityType: "Notice",
        entityId: "n1",
        note: "linked",
        addedByName: "Adder Person",
        createdAt: new Date("2026-01-02"),
      },
    ]);
    expect(detail!.verificationHistory).toEqual([
      {
        id: "v1",
        decision: "NEEDS_UPDATE",
        verifiedAt: new Date("2026-01-03"),
        verifiedByName: "Reviewer Person",
        note: "Not applicable to this college.",
      },
    ]);
    // NOT_APPLICABLE is a human-gated status — automatic sync must not touch it.
    expect(prisma.complianceRequirement.update).not.toHaveBeenCalled();
  });
});
