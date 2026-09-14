import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_SITE_URL: "https://www.example-college.edu.pk" },
}));

import { buildCollegeJsonLd, serializeJsonLd } from "@/lib/seo";

describe("buildCollegeJsonLd", () => {
  it("returns null when there is no college yet", () => {
    expect(buildCollegeJsonLd(null, [], null)).toBeNull();
  });

  it("returns null while the college itself is still placeholder data", () => {
    const result = buildCollegeJsonLd({ name: "Demo College", isPlaceholder: true }, [], null);
    expect(result).toBeNull();
  });

  it("publishes the real college name once it is no longer a placeholder", () => {
    const result = buildCollegeJsonLd({ name: "Real College", isPlaceholder: false }, [], null);
    expect(result).toMatchObject({
      "@type": "CollegeOrUniversity",
      name: "Real College",
      url: "https://www.example-college.edu.pk",
    });
  });

  it("omits contact/address fields that are still placeholder data even once the college is real", () => {
    const result = buildCollegeJsonLd(
      { name: "Real College", isPlaceholder: false },
      [
        { type: "EMAIL", value: "demo@example.invalid", isPlaceholder: true },
        { type: "PHONE", value: "+92-000-0000000", isPlaceholder: true },
      ],
      { address: "Demo Address", isPlaceholder: true },
    );
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("telephone");
    expect(result).not.toHaveProperty("address");
  });

  it("includes contact/address fields once they are real, independently of each other", () => {
    const result = buildCollegeJsonLd(
      { name: "Real College", isPlaceholder: false },
      [
        { type: "EMAIL", value: "info@realcollege.edu.pk", isPlaceholder: false },
        { type: "PHONE", value: "+92-300-1234567", isPlaceholder: true },
      ],
      { address: "123 Real Street", isPlaceholder: false },
    );
    expect(result).toMatchObject({
      email: "info@realcollege.edu.pk",
      address: { "@type": "PostalAddress", streetAddress: "123 Real Street" },
    });
    expect(result).not.toHaveProperty("telephone");
  });
});

describe("serializeJsonLd", () => {
  it("escapes '<' so a value can't break out of the script tag", () => {
    const serialized = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    // Escaping every "<" is sufficient — a bare ">" can't open or close a tag on its own.
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script>");
  });

  it("produces valid JSON once unescaped", () => {
    const data = { "@type": "CollegeOrUniversity", name: "Test" };
    const serialized = serializeJsonLd(data);
    expect(JSON.parse(serialized.replace(/\\u003c/g, "<"))).toEqual(data);
  });
});
