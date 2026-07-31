# Asset provenance

## Product artwork

- `public/icon.svg` is original vector source created for ScenePatch in this
  repository. `icon-192.png` and `icon-512.png` are deterministic rasterizations
  of that source.
- `public/og.svg` is original vector artwork created for ScenePatch in this
  repository. `public/og.png` is its deterministic rasterization. It is
  presentation artwork, not fixture evidence, model input, or proof of product
  behavior.

## Developer fixtures

The missing-marker, corrected, and occluded scenes generated at runtime by
`app/lib/media.ts` are original canvas drawings used to exercise the interaction.
They are labeled developer fixtures and are not evidence that Gemma passed the
required real-photo release gate.

## Human-owned release media

Final hero photographs, voice audio, and demo video must be created and approved
by the entrant. Unapproved files belong in the ignored `fixtures/private/`
directory. Their release is blocked until `docs/FIXTURE_RIGHTS.md` records exact
hashes and a human signature. AI-generated, stock, copied, or placeholder scenes
must not replace that human-owned release set.
