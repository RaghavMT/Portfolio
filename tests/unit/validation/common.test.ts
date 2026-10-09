import { describe, expect, it } from "vitest";
import {
  emailAddress,
  httpsUrl,
  mailtoUrl,
  markdown,
  monthDate,
  optionalHttpsUrl,
  optionalMonthDate,
  optionalText,
  requiredText,
  tagList,
  textList,
} from "@/lib/validation/common";

describe("requiredText", () => {
  const schema = requiredText(5);

  it("trims and accepts up to the limit", () => {
    expect(schema.parse("  abcde ")).toBe("abcde");
  });

  it("rejects blank and over-limit values", () => {
    expect(schema.safeParse("   ").success).toBe(false);
    expect(schema.safeParse("abcdef").success).toBe(false);
  });
});

describe("optionalText", () => {
  const schema = optionalText(5);

  it("turns empty, blank, null and missing into null", () => {
    for (const value of ["", "   ", null, undefined])
      expect(schema.parse(value)).toBeNull();
  });

  it("enforces the limit on real values", () => {
    expect(schema.parse(" abc ")).toBe("abc");
    expect(schema.safeParse("abcdef").success).toBe(false);
  });
});

describe("markdown", () => {
  const schema = markdown(10);

  it("defaults to an empty string", () => {
    expect(schema.parse(undefined)).toBe("");
  });

  it("enforces the character limit", () => {
    expect(schema.safeParse("a".repeat(10)).success).toBe(true);
    expect(schema.safeParse("a".repeat(11)).success).toBe(false);
  });
});

describe("httpsUrl", () => {
  it("accepts https URLs (trimmed)", () => {
    expect(httpsUrl.parse("  https://example.com/a?b=1 ")).toBe(
      "https://example.com/a?b=1",
    );
  });

  it.each([
    "http://example.com",
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "mailto:me@example.com",
    "ftp://example.com",
    "example.com",
    "https://",
    "",
  ])("rejects %j", (value) => {
    expect(httpsUrl.safeParse(value).success).toBe(false);
  });

  it("rejects absurdly long URLs", () => {
    expect(
      httpsUrl.safeParse(`https://example.com/${"a".repeat(2048)}`).success,
    ).toBe(false);
  });
});

describe("optionalHttpsUrl", () => {
  it("turns empty values into null but still rejects http", () => {
    expect(optionalHttpsUrl.parse("")).toBeNull();
    expect(optionalHttpsUrl.parse(undefined)).toBeNull();
    expect(optionalHttpsUrl.safeParse("http://example.com").success).toBe(
      false,
    );
  });
});

describe("mailtoUrl", () => {
  it("accepts mailto with a valid address", () => {
    expect(mailtoUrl.parse("mailto:me@example.com")).toBe(
      "mailto:me@example.com",
    );
  });

  it.each(["mailto:not-an-email", "https://example.com", "me@example.com"])(
    "rejects %j",
    (value) => {
      expect(mailtoUrl.safeParse(value).success).toBe(false);
    },
  );
});

describe("emailAddress", () => {
  it("accepts valid addresses up to 254 chars", () => {
    const address = (lastLabel: number) =>
      `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(lastLabel)}.com`;
    expect(address(57)).toHaveLength(254);
    expect(emailAddress.parse(" me@example.com ")).toBe("me@example.com");
    expect(emailAddress.safeParse(address(57)).success).toBe(true);
    expect(emailAddress.safeParse(address(58)).success).toBe(false);
  });

  it("rejects invalid addresses", () => {
    expect(emailAddress.safeParse("nope").success).toBe(false);
  });
});

describe("monthDate", () => {
  it("normalises YYYY-MM and YYYY-MM-DD to the 1st of the month", () => {
    expect(monthDate.parse("2025-06")).toBe("2025-06-01");
    expect(monthDate.parse("2025-06-15")).toBe("2025-06-01");
  });

  it.each(["2025-13", "2025-00", "June 2025", "", "1899-01"])(
    "rejects %j",
    (value) => {
      expect(monthDate.safeParse(value).success).toBe(false);
    },
  );

  it("optional variant turns empty into null", () => {
    expect(optionalMonthDate.parse("")).toBeNull();
    expect(optionalMonthDate.parse(null)).toBeNull();
    expect(optionalMonthDate.parse("2024-02")).toBe("2024-02-01");
  });
});

describe("tagList", () => {
  const schema = tagList(20, 30);

  it("trims, drops empties and de-duplicates case-insensitively (first wins)", () => {
    expect(
      schema.parse(["React", " react ", "", "Next.js", "NEXT.JS"]),
    ).toEqual(["React", "Next.js"]);
  });

  it("defaults to an empty list", () => {
    expect(schema.parse(undefined)).toEqual([]);
  });

  it("enforces the count limit after de-duplication", () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `t${i}`);
    expect(schema.safeParse([...twenty, "T0"]).success).toBe(true);
    expect(schema.safeParse([...twenty, "t20"]).success).toBe(false);
  });

  it("enforces the per-tag length limit", () => {
    expect(schema.safeParse(["a".repeat(30)]).success).toBe(true);
    expect(schema.safeParse(["a".repeat(31)]).success).toBe(false);
  });
});

describe("textList", () => {
  const schema = textList(2, 5);

  it("trims and drops empties but keeps duplicates", () => {
    expect(schema.parse([" a ", "", "a"])).toEqual(["a", "a"]);
  });

  it("enforces count and length limits", () => {
    expect(schema.safeParse(["a", "b", "c"]).success).toBe(false);
    expect(schema.safeParse(["abcdef"]).success).toBe(false);
  });
});
