# Fixture boundary

## Pages replay

The app's runtime canvas scenes are reproducible scripted replay fixtures. They
exercise the interface but are not evidence that Gemma generated the displayed
decisions.

## Controlled notebook inputs

`generated-v1/` contains the approved public controlled mechanism fixture:

- four deterministic code-generated 640×512 scene PNGs; and
- `intent.wav`, synthesized with CMU Flite `2.3-current`, voice `slt`, from Flite
  commit `6c9f20dc915b17f5619340069889db0aa007fcdc`.

The audio is normalized to signed 16-bit little-endian PCM (`pcm_s16le`), 16 kHz,
mono, lasts `4.755 s`, and has SHA-256
`d99fe8ce17149e9c8bc94e90467a95d3e1f5b98ba67e7fbc7f2c8fe9f201b020`.

These inputs are synthetic: they are not real photographs, natural speech, or
evidence of a physical scene. An executed notebook run can provide evidence only
for the multimodal/tool-calling mechanism on these exact files, not general
real-world accuracy.

## Publication record

At `2026-08-01 22:03:40 CEST (UTC+02:00)`, the owner approved public use of the
exact four PNG hashes and one WAV hash recorded in
`docs/FIXTURE_RIGHTS.md`. `generated-v1/manifest.json` binds those hashes to the
generator and Flite provenance. Any regenerated or edited media file requires a
new hash and new approval.

This approval makes the controlled fixture reproducible; it does not turn a
notebook run into a benchmark. The exact 1:52 release video was separately
watched and approved for public upload at `2026-08-02 10:46:06 CEST (UTC+02:00)`;
its SHA-256 and verbatim approval are recorded in `docs/FIXTURE_RIGHTS.md`.
Kaggle execution remains mechanism evidence rather than a general accuracy gate.
