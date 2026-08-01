# ScenePatch controlled-fixture provenance and release record

> **EXACT FIVE-FILE MEDIA APPROVAL RECORDED.** At `2026-08-01 22:03:40 CEST
> (UTC+02:00)`, this record captured the user's explicit approval of public use for
> the four PNGs and one WAV file identified by the hashes below. That approval
> covers use of those five files in the ScenePatch repository, Kaggle
> dataset/notebook, and a demo video. It does not approve the current review-video
> draft, accept the competition rules, authorize final
> submission, or establish a verified legal identity.

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
- Approved release scope for the exact five hashes: ScenePatch repository, public
  Kaggle fixture/notebook, and use within a future demo video

These files are controlled mechanism inputs. They are not photographs, natural
speech, evidence of a physical desk, or proof that ScenePatch works reliably on
real-world media.

## Asset inventory

The approved release files are stored under `fixtures/generated-v1/`; an ignored
review copy remains under `fixtures/private/generated-v1/`. If any media file is
regenerated, edited, or normalized again, record its new hash and repeat human
approval.

| Asset | Required content | Public filename | SHA-256 | Public-use status |
|---|---|---|---|---|
| Before generated PNG | White sketchbook centered; red marker left; blue marker right; yellow sticky-note pad above | `scene-before.png` | `4822982cf8d254fa3b4579ab40c72131627c92a2780f77da7490ad865b7d83cf` | **APPROVED FOR PUBLIC USE** |
| Bad-after generated PNG | Red marker above sketchbook; blue marker removed; other layout unchanged | `scene-after-bad.png` | `71210ba4d515b1abe4a1c3e134e22fd9d9b2c7f1f1ea7b1396e96b155e2e2120` | **APPROVED FOR PUBLIC USE** |
| Corrected-after generated PNG | Red marker above; blue marker restored right; other layout unchanged | `scene-after-corrected.png` | `9a22ca251072aee8d79d84ba4f4562f46400a5fec651bc3dae19ba4929e60d03` | **APPROVED FOR PUBLIC USE** |
| Occluded-after generated PNG | Controlled scene with deliberately obscured comparison evidence | `scene-after-occluded.png` | `b16ff8c9d41b65522fc0d72c8a9b108f72353c54315950fa4460c23e6370b5d3` | **APPROVED FOR PUBLIC USE** |
| Synthesized intent audio | Exact intent sentence below | `intent.wav` | `d99fe8ce17149e9c8bc94e90467a95d3e1f5b98ba67e7fbc7f2c8fe9f201b020` | **APPROVED FOR PUBLIC USE** |
| Demo video review draft | Rendered 1:52 demonstration with synthetic-fixture and saved-run disclosures | `ScenePatch-demo-review-v3.mp4` | `73586989e041648fed9e8ce1966e90940fe64b661e83a0114409ead71a58faf7` | **REVIEW DRAFT — NOT APPROVED OR PUBLISHED** |

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
in that file. The user stated that they reviewed the Flite terms and explicitly
approved public distribution of this exact output; this record is not legal advice.

## Human declarations

Checked items are supported by the user's exact approval message together with
the verified provenance and hashes already recorded here. Unchecked items were not
expressly covered and must not be inferred.

- [x] I verified that the scene generator and compositions are original or that I
  have documented permission to publish them.
- [x] I reproduced or inspected the four PNGs and confirmed that their hashes match
  this inventory.
- [x] I confirmed that the PNGs contain no copied, stock, scraped, photographic,
  employer-owned, university-restricted, or other third-party-controlled media.
- [x] I verified the applicable licenses and attribution requirements for CMU
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
- [x] I approve publication of only the exact hashed assets listed here, under the
  media terms recorded below; repository code remains Apache-2.0 licensed.

Media license and required attributions:

Human-confirmed record: scene PNGs are original project output and are approved
for public use in the ScenePatch repository; repository code remains Apache-2.0
licensed. Intent text is original project text. Intent audio was synthesized with
CMU Flite 2.3-current and the `cmu_us_slt` voice from commit
`6c9f20dc915b17f5619340069889db0aa007fcdc`; retain the Carnegie Mellon
University and contributor notices and do not imply endorsement. Official terms:
<https://github.com/festvox/flite/blob/6c9f20dc915b17f5619340069889db0aa007fcdc/COPYING>.

This record was confirmed by the exact typed approval quoted below at
`2026-08-01 22:03:40 CEST (UTC+02:00)`.

## Processing and retention approval

- [x] I approve uploading the approved, nonprivate synthetic fixture files to
  Kaggle for cloud-hosted notebook execution.
- [x] I approve retaining the approved synthetic inputs in the public
  reproducibility package.
- [ ] I understand that Kaggle notebook execution is not on-device processing and
  does not prove that arbitrary user media remains local.
- [ ] I understand that the application discards live-user audio by default, while
  approved reproducibility media would be intentionally distributed.

## Recorded approval and remaining gates

- Kaggle profile display name: `Praharsh Pulla` (shown in the attached Kaggle
  profile screenshot; not independently verified as a legal identity)
- Legal identity: **not independently verified by this record**
- Kaggle username: `praharshpulla` (shown in the attached screenshot)
- Approval-record timestamp: `2026-08-01 22:03:40 CEST (UTC+02:00)`
- Signature method: exact typed user message, recorded verbatim below

> I reviewed the ScenePatch generated-v1 bundle and Flite terms. I approve public
> use of these exact five hashed files for the ScenePatch repository, Kaggle
> dataset/notebook, and demo video.

- Exact five-file media decision: `[x] APPROVED  [ ] REJECTED`
- Demo-video asset decision: `[ ] APPROVED  [ ] REJECTED` — **PENDING; review
  draft SHA-256 is
  `73586989e041648fed9e8ce1966e90940fe64b661e83a0114409ead71a58faf7`**
- Competition rules acceptance: **VERIFIED ACCEPTED** on the signed-in Kaggle
  rules page at `2026-08-01 22:25 CEST (UTC+02:00)`; this is separate from the
  media approval above.
- Final Kaggle submission: **PENDING; not covered by this media approval**

**Scope rule:** this approval applies only while all five released files match the
hashes in the inventory. Any regenerated or edited file requires a new hash and
new approval. The typed message permits the approved five files to appear in a
demo video; it does not approve the current review draft, its contents, or its
publication. Unchecked acknowledgments remain unconfirmed and must not be inferred.
