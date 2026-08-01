# Asset provenance

## Product artwork

- `public/icon.svg` is original vector source created for ScenePatch in this
  repository. `icon-192.png` and `icon-512.png` are deterministic rasterizations
  of that source.
- `public/og.svg` is original vector artwork created for ScenePatch in this
  repository. `public/og.png` is its deterministic rasterization. It is
  presentation artwork, not fixture evidence, model input, or proof of product
  behavior.

## Pages replay fixtures

The missing-marker, corrected, and occluded scenes generated at runtime by
`app/lib/media.ts` are original canvas drawings used to exercise the interaction.
The Pages build labels them as scripted replays. They are not evidence that Gemma
produced the displayed decisions.

## Controlled notebook fixture

The approved notebook input bundle is stored under `fixtures/generated-v1/` and
contains four deterministic, code-generated 640×512 RGB PNGs:

- `scene-before.png`;
- `scene-after-bad.png`;
- `scene-after-corrected.png`; and
- `scene-after-occluded.png`.

The bundle contains no real photographs. Its `intent.wav` is synthesized speech,
not a human recording. It was generated with CMU Flite `2.3-current`, voice `slt`,
from Flite commit `6c9f20dc915b17f5619340069889db0aa007fcdc`, then normalized to signed 16-bit
little-endian PCM (`pcm_s16le`), 16 kHz, mono, with a duration of `4.755 s`. Its
SHA-256 is
`d99fe8ce17149e9c8bc94e90467a95d3e1f5b98ba67e7fbc7f2c8fe9f201b020`.

These files are controlled synthetic mechanism inputs. They can show how the
multimodal prompt, native tool calls, parser, and deterministic policy behave on
those exact inputs; they cannot establish performance on photographs, natural
speech, or physical scenes. Exact hashes and the human approval record are in
`docs/FIXTURE_RIGHTS.md`; any changed bytes require renewed approval.

## Release boundary

The exact four PNGs and one WAV file were approved for public use in the
ScenePatch repository, Kaggle dataset/notebook, and within a future demo video at
`2026-08-01 22:03:40 CEST (UTC+02:00)`. That approval is hash-bound and does not
relicense third-party tooling or approve changed media. Repository code remains
Apache-2.0 licensed. The final demo video is a separate pending asset requiring
its own filename, hash, privacy review, and human approval.
