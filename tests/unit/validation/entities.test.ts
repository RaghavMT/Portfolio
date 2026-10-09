import { describe, expect, it } from "vitest";
import { certificationSchema } from "@/lib/validation/certification";
import { educationSchema } from "@/lib/validation/education";
import { experienceSchema } from "@/lib/validation/experience";
import { messageSchema } from "@/lib/validation/message";
import { skillGroupSchema, skillSchema } from "@/lib/validation/skill";
import { socialLinkSchema } from "@/lib/validation/social-link";
import { errorPaths } from "./helpers";

describe("socialLinkSchema", () => {
  const github = { platform: "github", url: "https://github.com/example" };

  it("accepts an https link and defaults visible to true", () => {
    expect(socialLinkSchema.parse(github)).toMatchObject({
      visible: true,
      label: null,
    });
  });

  it("requires a label for platform 'other'", () => {
    expect(
      errorPaths(socialLinkSchema, {
        platform: "other",
        url: "https://x.example",
      }),
    ).toEqual(["label"]);
    expect(
      errorPaths(socialLinkSchema, {
        platform: "other",
        url: "https://x.example",
        label: "Blog",
      }),
    ).toEqual([]);
  });

  it("requires mailto: for email and https for everything else", () => {
    expect(
      errorPaths(socialLinkSchema, {
        platform: "email",
        url: "mailto:me@example.com",
      }),
    ).toEqual([]);
    expect(
      errorPaths(socialLinkSchema, {
        platform: "email",
        url: "https://example.com",
      }),
    ).toEqual(["url"]);
    expect(
      errorPaths(socialLinkSchema, {
        platform: "github",
        url: "mailto:me@example.com",
      }),
    ).toEqual(["url"]);
    expect(
      errorPaths(socialLinkSchema, {
        platform: "github",
        url: "http://github.com/x",
      }),
    ).toEqual(["url"]);
  });

  it("rejects unknown platforms and long labels", () => {
    expect(
      errorPaths(socialLinkSchema, { ...github, platform: "myspace" }),
    ).toEqual(["platform"]);
    expect(
      errorPaths(socialLinkSchema, { ...github, label: "a".repeat(41) }),
    ).toEqual(["label"]);
  });
});

describe("experienceSchema", () => {
  const valid = {
    company: "Acme",
    title: "Software Engineering Intern",
    employmentType: "internship",
    startOn: "2025-05",
  };

  it("accepts minimal input; empty end means Present", () => {
    expect(experienceSchema.parse({ ...valid, endOn: "" })).toMatchObject({
      startOn: "2025-05-01",
      endOn: null,
      highlights: [],
      tech: [],
      summaryMd: "",
      visible: true,
    });
  });

  it("requires the end date to be on or after the start", () => {
    expect(
      errorPaths(experienceSchema, { ...valid, endOn: "2025-04" }),
    ).toEqual(["endOn"]);
  });

  it("limits highlights to 8 bullets of 200 chars and tech to 15 tags", () => {
    expect(
      errorPaths(experienceSchema, {
        ...valid,
        highlights: Array(9).fill("Did a thing"),
      }),
    ).toEqual(["highlights"]);
    expect(
      errorPaths(experienceSchema, { ...valid, highlights: ["a".repeat(201)] }),
    ).toEqual(["highlights.0"]);
    const tech = Array.from({ length: 16 }, (_, i) => `t${i}`);
    expect(errorPaths(experienceSchema, { ...valid, tech })).toEqual(["tech"]);
  });

  it.each([
    ["company", 100],
    ["title", 100],
    ["location", 80],
    ["summaryMd", 1500],
  ])("limits %s to %i characters", (field, max) => {
    expect(
      errorPaths(experienceSchema, { ...valid, [field]: "a".repeat(max + 1) }),
    ).toEqual([field]);
  });

  it("rejects unknown employment types and non-https company URLs", () => {
    expect(
      errorPaths(experienceSchema, { ...valid, employmentType: "gig" }),
    ).toEqual(["employmentType"]);
    expect(
      errorPaths(experienceSchema, { ...valid, companyUrl: "http://acme.com" }),
    ).toEqual(["companyUrl"]);
  });

  it("requires a start date", () => {
    expect(
      errorPaths(experienceSchema, { ...valid, startOn: undefined }),
    ).toEqual(["startOn"]);
  });
});

describe("educationSchema", () => {
  const valid = {
    institution: "Some University",
    degree: "B.Tech",
    startOn: "2021-08",
  };

  it("accepts minimal input", () => {
    expect(educationSchema.parse(valid)).toMatchObject({
      endOn: null,
      isExpected: false,
      detailsMd: "",
    });
  });

  it("requires an end date when marked expected", () => {
    expect(errorPaths(educationSchema, { ...valid, isExpected: true })).toEqual(
      ["endOn"],
    );
    expect(
      errorPaths(educationSchema, {
        ...valid,
        isExpected: true,
        endOn: "2027-06",
      }),
    ).toEqual([]);
  });

  it("requires the end date to be on or after the start", () => {
    expect(errorPaths(educationSchema, { ...valid, endOn: "2020-01" })).toEqual(
      ["endOn"],
    );
  });

  it.each([
    ["institution", 120],
    ["degree", 100],
    ["field", 100],
    ["grade", 40],
    ["detailsMd", 1000],
  ])("limits %s to %i characters", (field, max) => {
    expect(
      errorPaths(educationSchema, { ...valid, [field]: "a".repeat(max + 1) }),
    ).toEqual([field]);
  });
});

describe("skill schemas", () => {
  it("limits group and skill names to 40 characters", () => {
    expect(errorPaths(skillGroupSchema, { name: "Languages" })).toEqual([]);
    expect(errorPaths(skillGroupSchema, { name: "a".repeat(41) })).toEqual([
      "name",
    ]);
    expect(errorPaths(skillSchema, { name: "TypeScript" })).toEqual([]);
    expect(errorPaths(skillSchema, { name: "" })).toEqual(["name"]);
    expect(errorPaths(skillSchema, { name: "a".repeat(41) })).toEqual(["name"]);
  });
});

describe("certificationSchema", () => {
  const valid = { kind: "certification", title: "Cloud Practitioner" };

  it("accepts minimal input", () => {
    expect(certificationSchema.parse(valid)).toMatchObject({
      issuer: null,
      issuedOn: null,
      credentialUrl: null,
    });
  });

  it("validates kind, lengths and the credential URL", () => {
    expect(
      errorPaths(certificationSchema, { ...valid, kind: "badge" }),
    ).toEqual(["kind"]);
    expect(
      errorPaths(certificationSchema, { ...valid, title: "a".repeat(141) }),
    ).toEqual(["title"]);
    expect(
      errorPaths(certificationSchema, { ...valid, issuer: "a".repeat(101) }),
    ).toEqual(["issuer"]);
    expect(
      errorPaths(certificationSchema, {
        ...valid,
        description: "a".repeat(301),
      }),
    ).toEqual(["description"]);
    expect(
      errorPaths(certificationSchema, {
        ...valid,
        credentialUrl: "http://x.com",
      }),
    ).toEqual(["credentialUrl"]);
  });
});

describe("messageSchema", () => {
  const valid = {
    name: "Recruiter",
    email: "r@example.com",
    body: "Hello there!",
  };

  it("accepts a valid message", () => {
    expect(messageSchema.parse(valid)).toMatchObject({
      company: null,
      subject: null,
    });
  });

  it("requires a body of 10–5000 characters", () => {
    expect(
      errorPaths(messageSchema, { ...valid, body: "a".repeat(9) }),
    ).toEqual(["body"]);
    expect(
      errorPaths(messageSchema, { ...valid, body: "a".repeat(10) }),
    ).toEqual([]);
    expect(
      errorPaths(messageSchema, { ...valid, body: "a".repeat(5001) }),
    ).toEqual(["body"]);
  });

  it("validates email and field lengths", () => {
    expect(errorPaths(messageSchema, { ...valid, email: "nope" })).toEqual([
      "email",
    ]);
    expect(
      errorPaths(messageSchema, { ...valid, name: "a".repeat(101) }),
    ).toEqual(["name"]);
    expect(
      errorPaths(messageSchema, { ...valid, company: "a".repeat(121) }),
    ).toEqual(["company"]);
    expect(
      errorPaths(messageSchema, { ...valid, subject: "a".repeat(151) }),
    ).toEqual(["subject"]);
  });
});
