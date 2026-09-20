# Portable captured source baselines

These six fixtures contain captured repository source, not localStorage, user data,
browser profiles, credentials, or a reconstructed expectation. Each JSON records
the original capture path, exact byte length, SHA-256 and lossless gzip-base64.
`read.ts` verifies the decoded bytes before returning the original UTF-8 text,
including CRLF. Tests keep their original synthetic module filenames and require
resolution; relocating a capture does not relocate its component imports.

The original output captures remain untouched. No output directory is required
for the regular component tests or the optional visit baseline mode. The latter
is a historical RED reproduction, not a current product PASS assertion.

Native recovery producers are separately preserved in
`lib/flow/integrated-poc/native-creator-vendor/recovery-test-manifest.json`.
Only storage.ts and service-state.ts were missing from the existing vendor;
their 25 transitive dependencies already matched the source bytes exactly.
The existing pure-runtime vendor manifest is unchanged: the added writer is
called only with in-memory storage in regression fixtures, not by the app.
