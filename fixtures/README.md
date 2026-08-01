# Fixture boundary

## Pages replay

The app's runtime canvas scenes are reproducible scripted replay fixtures. They
exercise the interface but are not evidence that Gemma generated the displayed
decisions.

## Controlled notebook inputs

`private/generated-v1/` contains the current controlled mechanism fixture:

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

## Publication gate

The `private/` directory is ignored by Git. Do not copy this bundle into a public
fixture set, Kaggle dataset/notebook, or video until `docs/FIXTURE_RIGHTS.md`
contains matching hashes, a completed image-generator record, human-verified
Flite and `slt` license/attribution terms, all checked declarations, and a signed
`APPROVED` decision. Those approvals, executed Kaggle outputs, and the final demo
video are still pending.
