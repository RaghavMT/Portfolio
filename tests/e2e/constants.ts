import { blobHostFromToken } from "../../src/lib/upload-rules";

// Throwaway credential for the E2E server only; the real admin password never reaches tests.
export const E2E_PASSWORD = "e2e-test-password";

/**
 * The E2E server never uses the real `BLOB_READ_WRITE_TOKEN` (SPEC §16.2: tests must not touch the
 * production Blob store). Without a test-store token it gets this well-formed fake one, which is
 * enough for everything that doesn't upload a file (the store host is derived from the token).
 * Specs that really upload need `BLOB_READ_WRITE_TOKEN_TEST` and are skipped without it.
 * These are functions because `.env.local` is loaded after this module is first imported.
 */
const FAKE_BLOB_TOKEN = "vercel_blob_rw_e2estore_fakesecret000000000000";
export const e2eBlobToken = () =>
  process.env.BLOB_READ_WRITE_TOKEN_TEST || FAKE_BLOB_TOKEN;
export const hasRealBlobStore = () => !!process.env.BLOB_READ_WRITE_TOKEN_TEST;
export const e2eBlobHost = () => blobHostFromToken(e2eBlobToken())!;
