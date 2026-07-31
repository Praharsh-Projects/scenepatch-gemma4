# Security snapshot

Snapshot date: **31 July 2026**.

`npm audit --omit=dev` reports six high-severity transitive advisories:

- `adm-zip` through `@huggingface/transformers` → `onnxruntime-node` (no fix
  available in the current dependency line);
- `sharp` through Transformers.js/Next.js (no compatible fixed release reported);
- the PostCSS version bundled by Next.js (the audit's suggested force action
  would install an older breaking Next.js line).

The public release is a pre-rendered GitHub Pages artifact. It does not execute
the Next.js server, `onnxruntime-node`, ZIP extraction, or Sharp at runtime;
browser inference code uses ONNX Runtime Web. This reduces exposure for the
deployed replay but does **not** make the dependency audit clean. Do not run this
repository as an untrusted multi-user build or upload service without a new
review. Re-run both `npm audit` and the full QA suite immediately before tagging
or submission, and upgrade when compatible fixes exist.

No secrets belong in the repository. Human fixture media stays in the ignored
`fixtures/private/` directory until explicitly approved for publication. Please
report a suspected vulnerability privately to the repository owner rather than
including private media or credentials in a public issue.
