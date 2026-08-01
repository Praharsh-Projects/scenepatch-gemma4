# ScenePatch controlled-fixture provenance and release record

> **HUMAN APPROVAL REQUIRED.** This record documents the current controlled
> synthetic fixture; it is not evidence of release approval. Until the entrant
> completes the approval section, every listed asset has status **NOT APPROVED
> FOR PUBLIC USE** and must remain out of the public repository, Kaggle dataset,
> public notebook, and final demo video.

## Fixture identity

- Fixture name: `ScenePatch generated sketchbook-and-markers fixture v1`
- Fixture type: deterministic code-generated 2D scene PNGs plus synthesized
  speech audio
- Photographic source media: none
- Human voice recording: none
- Identifiable people or personal information: none by design; human review still
  required
- Image generator: `app/lib/media.ts#createSyntheticArtDeskFixture` at commit
  `321b3c4d016fb2fd588ba5a9cf93c6f1df5cdd83`; source-file SHA-256
  `a13e2cfc97ff99f5962ee1c928422f15b02a1912cb84e3a8bcfc1b2abc6bb4b9`
- Export environment: Chrome `150.0.7871.187` on macOS `26.5.2`, Mac16,8,
  Apple M4 Pro, 24 GB; all variants exported as original canvas PNG data from
  one capture-screen browser session rather than screenshots
- Reproduction path: run `npm ci && npm run dev`, open Capture, select Missing
  marker, Corrected, and Occluded in the same browser session, and save each
  before/after fixture image. Canvas bytes can vary across browser, OS, and font
  versions, so the signed hashes—not regeneration—identify the release files.
- Intended release, after approval: public Kaggle fixture/notebook, repository
  documentation, and demo video

These files are controlled mechanism inputs. They are not photographs, natural
speech, evidence of a physical desk, or proof that ScenePatch works reliably on
real-world media.

## Asset inventory

The current files are stored under the ignored
`fixtures/private/generated-v1/` directory. If any file is regenerated, edited,
or normalized again, record its new hash and repeat human approval.

| Asset | Required content | Current private filename | SHA-256 | Public-use status |
|---|---|---|---|---|
| Before generated PNG | White sketchbook centered; red marker left; blue marker right; yellow sticky-note pad above | `scene-before.png` | `4822982cf8d254fa3b4579ab40c72131627c92a2780f77da7490ad865b7d83cf` | **NOT APPROVED** |
| Bad-after generated PNG | Red marker above sketchbook; blue marker removed; other layout unchanged | `scene-after-bad.png` | `71210ba4d515b1abe4a1c3e134e22fd9d9b2c7f1f1ea7b1396e96b155e2e2120` | **NOT APPROVED** |
| Corrected-after generated PNG | Red marker above; blue marker restored right; other layout unchanged | `scene-after-corrected.png` | `9a22ca251072aee8d79d84ba4f4562f46400a5fec651bc3dae19ba4929e60d03` | **NOT APPROVED** |
| Occluded-after generated PNG | Controlled scene with deliberately obscured comparison evidence | `scene-after-occluded.png` | `b16ff8c9d41b65522fc0d72c8a9b108f72353c54315950fa4460c23e6370b5d3` | **NOT APPROVED** |
| Synthesized intent audio | Exact intent sentence below | `intent.wav` | `d99fe8ce17149e9c8bc94e90467a95d3e1f5b98ba67e7fbc7f2c8fe9f201b020` | **NOT APPROVED** |
| Demo video | Final screen recording with synthetic-fixture disclosure | `[REQUIRED]` | `[REQUIRED]` | **NOT APPROVED** |

Intent sentence:

> Move the red marker above the sketchbook. Keep everything else exactly where it
> is.

## Audio provenance

- Synthesizer: CMU Flite `2.3-current`
- Flite source commit: `6c9f20dc915b17f5619340069889db0aa007fcdc`
- Voice: `slt`
- Final encoding: signed 16-bit little-endian PCM (`pcm_s16le`), 16 kHz, mono
- Final duration: `4.755 s`
- Final SHA-256:
  `d99fe8ce17149e9c8bc94e90467a95d3e1f5b98ba67e7fbc7f2c8fe9f201b020`

The clip is synthesized speech, not the entrant's or any other person's natural
voice. Recording the tool, version, commit, voice, encoding, duration, and hash
does not itself establish public-distribution rights. The official Flite
`COPYING` file describes the collection as BSD-like and grants use and
distribution without restriction subject to its retained notices and
non-endorsement conditions. No separate synthesized-output restriction was found
in that file. The entrant must still review that source and approve distribution
of this exact output; this record is not legal advice.

## Human declarations

The entrant must review and affirm every item; an unchecked item blocks public
release.

- [ ] I verified that the scene generator and compositions are original or that I
  have documented permission to publish them.
- [ ] I reproduced or inspected the four PNGs and confirmed that their hashes match
  this inventory.
- [ ] I confirmed that the PNGs contain no copied, stock, scraped, photographic,
  employer-owned, university-restricted, or other third-party-controlled media.
- [ ] I verified the applicable licenses and attribution requirements for CMU
  Flite, commit `6c9f20dc915b17f5619340069889db0aa007fcdc`, and the `slt` voice, and confirmed
  that the exact audio output may be published in the intended competition
  contexts.
- [ ] I understand that these synthetic inputs test a controlled multimodal and
  tool-calling mechanism only; they do not demonstrate performance on real photos,
  natural speech, or physical scenes.
- [ ] I understand that public repository and Kaggle assets may be copied,
  downloaded, mirrored, and retained by third parties.
- [ ] I reviewed the final demo video for private information, notifications,
  tokens, browser-profile details, and third-party media.
- [ ] I approve publication of only the exact hashed assets listed here, under the
  media terms recorded below; repository code remains Apache-2.0 licensed.

Media license and required attributions:

Proposed record for human verification: scene PNGs are original project output
and may be released under Apache-2.0 with the repository. Intent text is original
project text. Intent audio was synthesized with CMU Flite 2.3-current and the
`cmu_us_slt` voice from commit
`6c9f20dc915b17f5619340069889db0aa007fcdc`; retain the Carnegie Mellon
University and contributor notices and do not imply endorsement. Official terms:
<https://github.com/festvox/flite/blob/6c9f20dc915b17f5619340069889db0aa007fcdc/COPYING>.

`[HUMAN TO CONFIRM OR AMEND THIS RECORD]`

## Processing and retention approval

- [ ] I approve uploading the approved, nonprivate synthetic fixture files to
  Kaggle for cloud-hosted notebook execution.
- [ ] I approve retaining the approved synthetic inputs in the public
  reproducibility package.
- [ ] I understand that Kaggle notebook execution is not on-device processing and
  does not prove that arbitrary user media remains local.
- [ ] I understand that the application discards live-user audio by default, while
  approved reproducibility media would be intentionally distributed.

## Final approval gate

By signing, the entrant confirms the declarations above for the exact hashes in
the inventory. A typed placeholder, assistant-generated signature, or inferred
consent is invalid.

- Entrant/rights holder legal name: `[HUMAN TO COMPLETE]`
- Signature: `[HUMAN TO COMPLETE]`
- Date and time with timezone: `[HUMAN TO COMPLETE]`
- Kaggle username: `[HUMAN TO COMPLETE]`
- Final decision: `[ ] APPROVED  [ ] REJECTED`

**Gate rule:** only a human-selected `APPROVED` decision, complete identity fields,
all checked declarations, a completed license/attribution record, and hashes that
match the release files change the media status to approved. Otherwise stop
publication. Do not substitute copied or unreviewed media.
