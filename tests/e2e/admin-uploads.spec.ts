import AxeBuilder from "@axe-core/playwright";
import { del, head, put } from "@vercel/blob";
import { getPayloadFromClientToken } from "@vercel/blob/client";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { e2eBlobHost, e2eBlobToken, hasRealBlobStore } from "./constants";
import { loginAsAdmin, sql, visitorPage } from "./helpers";

// SPEC §15 Phase 5 / §10 / §12.7 / §16.2 #3 and #5, against the TEST database.
//
// Most tests need no Blob store: authorization, Origin check, token constraints and the client-side
// file checks. The ones that really upload (cover, gallery, résumé, avatar, OG, deleting files) use
// the TEST Blob store and run only when BLOB_READ_WRITE_TOKEN_TEST is set (SPEC §16.2: never the
// production store). Without it they are reported as skipped.
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "admin flows are viewport-independent");

const stamp = Date.now();
const MB = 1024 * 1024;

// A valid 1×1 PNG and a minimal PDF: tiny, so real uploads stay fast.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const pdf = (label: string) =>
  Buffer.from(
    `%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n% ${label}\n%%EOF\n`,
  );
const png = (name: string) => ({
  name,
  mimeType: "image/png",
  buffer: PNG,
});

const blobOptions = () => ({ token: e2eBlobToken() });

async function exists(url: string) {
  try {
    await head(url, blobOptions());
    return true;
  } catch {
    return false;
  }
}

/** Asks `/api/upload` for a token exactly as the browser's `upload()` does. */
function tokenRequest(
  request: APIRequestContext,
  pathname: string,
  kind: unknown,
  origin = "http://localhost:3100",
) {
  return request.post("/api/upload", {
    headers: { origin },
    data: {
      type: "blob.generate-client-token",
      payload: {
        pathname,
        multipart: false,
        clientPayload: JSON.stringify({ kind }),
      },
    },
  });
}

function fileInput(page: Page, group: string | RegExp) {
  return page.getByRole("group", { name: group }).locator("input[type=file]");
}

test.describe("upload token route (/api/upload)", () => {
  test("without a session → 401", async ({ request }) => {
    const res = await tokenRequest(request, "images/a.png", "image");
    expect(res.status()).toBe(401);
    // …and an empty body makes no difference: the session is checked first
    expect((await request.post("/api/upload", { data: {} })).status()).toBe(
      401,
    );
  });

  test("signed in, but from another origin → 403", async ({ page }) => {
    await loginAsAdmin(page);
    const foreign = await tokenRequest(
      page.request,
      "images/a.png",
      "image",
      "https://evil.example",
    );
    expect(foreign.status()).toBe(403);
    const none = await page.request.post("/api/upload", {
      data: { type: "blob.generate-client-token" },
    });
    expect(none.status()).toBe(403);
  });

  test("the token carries the server-side rules for each kind", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const decode = async (pathname: string, kind: string) => {
      const res = await tokenRequest(page.request, pathname, kind);
      expect(res.status(), `${kind} ${pathname}`).toBe(200);
      const body = (await res.json()) as { clientToken: string };
      return getPayloadFromClientToken(body.clientToken);
    };

    const image = await decode("images/a.png", "image");
    expect(image.allowedContentTypes).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ]);
    expect(image.maximumSizeInBytes).toBe(5 * MB);
    expect(image.addRandomSuffix).toBe(true);
    expect(image.pathname).toBe("images/a.png");

    const resume = await decode("resume/cv.pdf", "resume");
    expect(resume.allowedContentTypes).toEqual(["application/pdf"]);
    expect(resume.maximumSizeInBytes).toBe(5 * MB);

    const og = await decode("og/card.png", "og");
    expect(og.allowedContentTypes).toEqual(["image/png", "image/jpeg"]);
    expect(og.maximumSizeInBytes).toBe(2 * MB);
  });

  test("a bad kind, a wrong or nested folder, or an odd name is refused", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    for (const [pathname, kind] of [
      ["images/a.png", "avatar"],
      ["images/a.png", undefined],
      ["resume/a.png", "image"],
      ["images/a.pdf", "resume"],
      ["a.png", "image"],
      ["images/nested/a.png", "image"],
      ["images/../resume/a.pdf", "image"],
      ["images/A B.png", "image"],
    ] as const) {
      const res = await tokenRequest(page.request, pathname, kind);
      expect(res.status(), `${kind} ${pathname}`).toBe(400);
    }
  });
});

test.describe("client-side file checks", () => {
  test("a 6 MB image and an SVG are rejected before anything is sent", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const sent: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/upload")) sent.push(r.url());
    });

    await page.goto("/admin/projects/new");
    const cover = fileInput(page, "Cover image");
    await cover.setInputFiles({
      name: "big.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(6 * MB),
    });
    await expect(page.getByText("too large. The limit is 5 MB")).toBeVisible();

    await cover.setInputFiles({
      name: "logo.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    });
    await expect(
      page.getByText("That file type isn't allowed").first(),
    ).toBeVisible();

    await fileInput(page, /^Gallery/).setInputFiles({
      name: "logo.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
    await expect(
      page.getByText("That file type isn't allowed").first(),
    ).toBeVisible();

    expect(sent).toEqual([]);
    // nothing was added to the form
    await expect(page.getByLabel("Describe the image")).toHaveCount(0);
  });

  test("a PNG is not a résumé, and a 6 MB PDF is too large", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const sent: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/upload")) sent.push(r.url());
    });
    await page.goto("/admin/profile");
    const resume = fileInput(page, /^Résumé/);
    await resume.setInputFiles(png("me.png"));
    await expect(page.getByText("Choose a PDF.")).toBeVisible();
    await resume.setInputFiles({
      name: "big.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(6 * MB),
    });
    await expect(page.getByText("too large. The limit is 5 MB")).toBeVisible();
    expect(sent).toEqual([]);
  });
});

test("upload fields are axe clean and don't scroll sideways at 375 px", async ({
  page,
}) => {
  await loginAsAdmin(page);
  for (const path of [
    "/admin/profile",
    "/admin/projects/new",
    "/admin/settings",
  ]) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(bad, `${path}: ${JSON.stringify(bad, null, 2)}`).toEqual([]);

    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(path);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test.describe("real uploads (test Blob store)", () => {
  test.skip(
    !hasRealBlobStore(),
    "needs BLOB_READ_WRITE_TOKEN_TEST (the test Blob store)",
  );

  const created: string[] = [];
  test.afterAll(async () => {
    await sql`delete from projects where title like 'E2E-%'`;
    if (created.length) await del(created, blobOptions()).catch(() => {});
  });

  test("the token can't be used to upload an SVG or an oversize file", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const res = await tokenRequest(
      page.request,
      "images/e2e-evil.png",
      "image",
    );
    const { clientToken } = (await res.json()) as { clientToken: string };

    await expect(
      put("images/e2e-evil.png", '<svg xmlns="http://www.w3.org/2000/svg"/>', {
        access: "public",
        token: clientToken,
        contentType: "image/svg+xml",
      }),
    ).rejects.toThrow();
    await expect(
      put("images/e2e-evil.png", Buffer.alloc(6 * MB), {
        access: "public",
        token: clientToken,
        contentType: "image/png",
      }),
    ).rejects.toThrow();
  });

  test("cover + gallery → live on the public card ≤ 5 s → deleting the project deletes its files", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    const title = `E2E-${stamp} Uploads`;
    await loginAsAdmin(page);
    await page.goto("/admin/projects/new");
    await page.locator("#pj-title").fill(title);
    await page.getByLabel("Summary").fill("Has a cover and a gallery");
    await page.locator("#pj-tech").fill("TypeScript");
    await page.locator("#pj-tech").press("Enter");

    await fileInput(page, "Cover image").setInputFiles(png("cover.png"));
    await expect(
      page
        .getByRole("group", { name: "Cover image" })
        .getByRole("button", { name: "Remove image" }),
    ).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Describe the image").fill("E2E cover alt");

    await fileInput(page, /^Gallery/).setInputFiles([
      png("one.png"),
      png("two.png"),
    ]);
    await expect(page.getByLabel(/^Describe image 2/)).toBeVisible({
      timeout: 30_000,
    });
    await page.getByLabel(/^Describe image 1/).fill("E2E first");
    await page.getByLabel(/^Describe image 2/).fill("E2E second");
    await page.getByLabel(/^Caption for image 2/).fill("E2E caption");

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Saved — live on your site")).toBeVisible();

    const [project] = await sql`
      select id, cover_image_url, cover_image_alt from projects where title = ${title}`;
    const gallery = await sql`
      select url, alt, caption from project_images
      where project_id = ${project.id} order by sort_order`;
    const files = [
      project.cover_image_url as string,
      ...gallery.map((g) => g.url as string),
    ];
    created.push(...files);
    expect(gallery.map((g) => g.alt)).toEqual(["E2E first", "E2E second"]);
    expect(gallery[1].caption).toBe("E2E caption");
    for (const url of files) {
      expect(new URL(url).host).toBe(e2eBlobHost());
      expect(url).toMatch(/\/images\//);
      expect(await exists(url)).toBe(true);
    }

    // §16.2 #5: visible on the public card within 5 s
    const visitor = await visitorPage(browser);
    try {
      await expect
        .poll(
          async () => {
            await visitor.page.goto("/projects");
            return visitor.page.getByAltText("E2E cover alt").count();
          },
          { timeout: 5000 },
        )
        .toBeGreaterThan(0);
    } finally {
      await visitor.close();
    }

    // reorder + remove in the form: the dropped file is deleted after the save
    await page.goto(`/admin/projects/${project.id}`);
    await page.getByRole("button", { name: "Move image 1 down" }).click();
    await page.getByRole("button", { name: "Remove image 1" }).click(); // was "second" → now first
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved — live on your site")).toBeVisible();
    await expect.poll(() => exists(gallery[1].url as string)).toBe(false);
    expect(await exists(gallery[0].url as string)).toBe(true);

    // deleting the project removes its cover and remaining gallery files
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const confirm = page.getByRole("alertdialog");
    await confirm.getByLabel(/Type/).fill(title);
    await confirm.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Deleted — gone from your site")).toBeVisible();
    await expect.poll(() => exists(files[0])).toBe(false);
    await expect.poll(() => exists(gallery[0].url as string)).toBe(false);
  });

  test("replacing the résumé deletes the old file and /resume serves the new one", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    const [before] = await sql`
      select resume_url, resume_updated_at from site_settings where id = 1`;
    await loginAsAdmin(page);
    await page.goto("/admin/profile");

    const resumeUrl = async () =>
      (await sql`select resume_url from site_settings where id = 1`)[0]
        .resume_url as string | null;
    const servedUrl = async () =>
      (await request.get("/resume", { maxRedirects: 0 })).headers().location;

    try {
      await fileInput(page, /^Résumé/).setInputFiles({
        name: `e2e-${stamp}-a.pdf`,
        mimeType: "application/pdf",
        buffer: pdf("A"),
      });
      await expect
        .poll(resumeUrl, { timeout: 30_000 })
        .not.toBe(before.resume_url);
      const a = (await resumeUrl())!;
      created.push(a);
      expect(a).toMatch(/\/resume\/e2e-\d+-a-.+\.pdf$/);
      await expect.poll(servedUrl, { timeout: 5000 }).toBe(a);
      expect(await exists(a)).toBe(true);

      await page.reload();
      await expect(page.getByText(`e2e-${stamp}-a`)).toBeVisible();
      await fileInput(page, /^Résumé/).setInputFiles({
        name: `e2e-${stamp}-b.pdf`,
        mimeType: "application/pdf",
        buffer: pdf("B"),
      });
      await expect.poll(resumeUrl, { timeout: 30_000 }).not.toBe(a);
      const b = (await resumeUrl())!;
      created.push(b);
      await expect.poll(servedUrl, { timeout: 5000 }).toBe(b);
      await expect.poll(() => exists(a), { timeout: 15_000 }).toBe(false);
      expect(await exists(b)).toBe(true);

      // removing it hides the button and deletes the file
      await page.reload();
      await page.getByRole("button", { name: "Remove", exact: true }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Remove résumé" })
        .click();
      await expect.poll(resumeUrl, { timeout: 30_000 }).toBeNull();
      await expect.poll(() => exists(b), { timeout: 15_000 }).toBe(false);
    } finally {
      await sql`
        update site_settings
        set resume_url = ${before.resume_url}, resume_updated_at = ${before.resume_updated_at}
        where id = 1`;
    }
  });

  test("avatar and share image: upload, save, remove → files are deleted", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const [before] = await sql`
      select avatar_url, avatar_alt, og_image_url from site_settings where id = 1`;
    await loginAsAdmin(page);
    try {
      // avatar (Profile)
      await page.goto("/admin/profile");
      await fileInput(page, "Photo").setInputFiles(png("me.png"));
      await expect(
        page
          .getByRole("group", { name: "Photo" })
          .getByRole("button", { name: "Remove image" }),
      ).toBeVisible({ timeout: 30_000 });
      await page.getByLabel("Describe the image").fill("E2E avatar alt");
      await page.getByRole("button", { name: "Save profile" }).click();
      await expect(page.getByText("Saved — live on your site")).toBeVisible();
      const [avatar] = await sql`
        select avatar_url, avatar_alt from site_settings where id = 1`;
      created.push(avatar.avatar_url);
      expect(avatar.avatar_alt).toBe("E2E avatar alt");
      expect(await exists(avatar.avatar_url)).toBe(true);

      await page.reload();
      await page.getByRole("button", { name: "Remove image" }).click();
      await page.getByRole("button", { name: "Save profile" }).click();
      await expect
        .poll(
          async () =>
            (await sql`select avatar_url from site_settings where id = 1`)[0]
              .avatar_url,
        )
        .toBeNull();
      await expect.poll(() => exists(avatar.avatar_url)).toBe(false);

      // share image (Settings → SEO)
      await page.goto("/admin/settings");
      await fileInput(page, /^Share image/).setInputFiles(png("og.png"));
      await expect(
        page
          .getByRole("group", { name: /^Share image/ })
          .getByRole("button", { name: "Remove image" }),
      ).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: "Save SEO" }).click();
      await expect(page.getByText("Saved — live on your site")).toBeVisible();
      const [og] =
        await sql`select og_image_url from site_settings where id = 1`;
      created.push(og.og_image_url);
      expect(new URL(og.og_image_url).pathname).toMatch(/^\/og\//);
      expect(await exists(og.og_image_url)).toBe(true);

      await page.reload();
      await page.getByRole("button", { name: "Remove image" }).click();
      await page.getByRole("button", { name: "Save SEO" }).click();
      await expect.poll(() => exists(og.og_image_url)).toBe(false);
    } finally {
      await sql`
        update site_settings
        set avatar_url = ${before.avatar_url}, avatar_alt = ${before.avatar_alt},
            og_image_url = ${before.og_image_url}
        where id = 1`;
    }
  });
});
