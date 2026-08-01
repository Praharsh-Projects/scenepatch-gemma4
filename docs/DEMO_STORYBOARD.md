# ScenePatch two-minute fallback demo storyboard

> **Recording gate:** the browser q4f16 path failed the required missing-marker
> trial. Do not present the Pages replay as live inference. The current 1:52 local
> review cut uses explicit public competition-linked V3 (`339575640`) and its
> saved timings; it is unapproved and unpublished. The exact five
> source-media files were approved for the repository, Kaggle dataset/notebook,
> and demo video at 2026-08-01 22:03:40 CEST. The notebook and dataset are public
> and anonymously verified. No final video has been approved or published.

## Controlled synthetic hero fixture

- **Before:** deterministic 640×512 PNG with a white sketchbook centered, red
  marker left, blue marker right, and yellow sticky-note pad above.
- **Intent audio:** CMU Flite `2.3-current`, voice `slt`, speaking “Move the red
  marker above the sketchbook. Keep everything else exactly where it is.”
- **Bad after:** generated PNG with the red marker moved and blue marker removed.
- **Corrected after:** generated PNG with the blue marker restored on the right.
- **Occluded after:** generated PNG with deliberately obscured comparison evidence.

The audio was produced from Flite commit
`6c9f20dc915b17f5619340069889db0aa007fcdc` and normalized to `pcm_s16le`, 16 kHz,
mono, `4.755 s`. Its SHA-256 is
`d99fe8ce17149e9c8bc94e90467a95d3e1f5b98ba67e7fbc7f2c8fe9f201b020`.

These are controlled synthetic mechanism inputs, not real photographs, natural
speech, or evidence of a physical scene. The entrant approved public use of the
exact five hashed media files for the repository, Kaggle dataset/notebook, and
demo video at 2026-08-01 22:03:40 CEST; the approval record, provenance, and Flite
and `slt` attribution details are in [`FIXTURE_RIGHTS.md`](FIXTURE_RIGHTS.md).
That approval covers the source media, not the current review-only video draft.

## Kaggle recording status

The public
[fixture dataset](https://www.kaggle.com/datasets/praharshpulla/scenepatch-controlled-fixture)
contains exactly six files: the five approved media files plus the manifest. The
dataset page includes a provenance subtitle and description, with license
metadata set to “Other (specified in description).” The public
[executed notebook V3](https://www.kaggle.com/code/praharshpulla/scenepatch-gemma-4?scriptVersionId=339575640)
has the approved notebook imported, the fixture dataset attached, and Kaggle's
official Google Gemma 4 Transformers `gemma-4-e2b-it` V1 model attached. Its
source SHA-256 is
`108604448f368c1fcd583ed79b7b4cc0d6d10ce69542c64ab06415348cf4ad90`.
Kaggle version ID `202340794` / script version `339575640`, labeled **COMPLETE
BATCH**, completed in 4m11s in the UI. The downloaded executed notebook SHA-256
is `0c97048417864c5d2c5dfdac835f23f87f6e1ba840b42eccde1a68434bab2a43`.
It has 15 cells: 10 code cells, eight output-bearing code cells, and seven output
files. Model loading took `83.636302238` seconds.

The V3 total-inference results were: bad, valid/no retry/three turns/
`15.295668616` seconds,
`blocked_by_deterministic_policy`; corrected, valid/no retry/two turns/
`8.560120476` seconds,
`pending_human_confirmation`; and occluded, valid/no retry/three turns/
`14.269275557` seconds, `blocked_by_deterministic_policy`. Gemma labeled
the red marker, blue marker, and occlusion intended and proposed commits. The
notebook's deterministic, hash-gated preflight supplies `red_marker`,
`blue_marker`, and `occlusion` labels; the approved transcript supplies
`red_marker` as intended. That host policy—not general model detection—overrode
the bad and occluded proposals.

The verified saved-output JSON SHA-256 values are
`1b520ccc7914938ec51b3e85972609b0c9f62ca7b29084da625573741e39be28`
(bad),
`54bc5eef1258d72d4e3eab65c1dd9a2ef9ecaf3c8d892c13357659d1d5a54cd8`
(corrected), and
`6093a9456651ea4bd142971163648b6a227f2ee807128af660e6a066e8ee348d`
(occluded). The explicit V3 notebook and
[output](https://www.kaggle.com/code/praharshpulla/scenepatch-gemma-4/output?scriptVersionId=339575640)
URLs both returned HTTP 200 anonymously.

The bare notebook URL defaults to V1; V2 (`339574570`) is source-only. Record and
cite explicit V3. The notebook is linked to Build with Gemma, but no entry has
been submitted (`0/5`, “No Submissions”).

## Local review cut status

`ScenePatch-demo-review-v3.mp4` (1:52; SHA-256
`73586989e041648fed9e8ce1966e90940fe64b661e83a0114409ead71a58faf7`)
was rendered against explicit public V3 `339575640` and its bad/corrected/
occluded total-inference timings of `15.295668616`, `8.560120476`, and
`14.269275557` seconds. It is local, unapproved, and unpublished.

## Shot list and narration

| Time | Screen action | Narration | Evidence visible |
|---|---|---|---|
| 0:00–0:10 | Title over the clearly labeled generated before-scene PNG | “ScenePatch asks whether a scene change matched the instruction. This demo uses controlled synthetic inputs.” | Product name; synthetic-fixture label |
| 0:10–0:23 | Open the Pages setup screen and pause on its replay warning | “The browser model loaded, but it missed this removed marker. I failed that gate instead of hiding it, so this public interface is a scripted replay.” | Replay label; no live-model claim |
| 0:23–0:38 | Open the public notebook’s fixture, preflight, tools, and validator cells | “This controlled test uses official Gemma 4, three native functions, and a hash-gated host preflight that supplies red-marker, blue-marker, and occlusion labels.” | Fixture hashes; transcript; fixed labels; three tools |
| 0:38–0:55 | Show the bad-scene raw output and decision from explicit Kaggle V3 | “Gemma called the missing blue marker intended and proposed a commit. The host blocks because only the red move is approved by the transcript.” | Raw calls; host coverage; override; 15.2957 s |
| 0:55–1:10 | Return to Pages; select **Missing marker** and replay the diff | “The UI replay shows the intended product behavior: the red move is intended, while the missing blue marker is unexplained and blocks.” | Persistent replay banner; blocked ledger |
| 1:10–1:23 | Select **Corrected** and replay | “With the blue marker restored, the expected policy outcome is a pending clean patch.” | Replay label; pending state |
| 1:23–1:34 | Click **Confirm replay commit** | “Even a clean proposal cannot store itself. A person still confirms the local record.” | Human click |
| 1:34–1:47 | Show IndexedDB-backed history, hashes, and export | “History is local, schema-validated, and exportable. Audio is never stored.” | Replay model identifier; hashes; metadata-only default |
| 1:47–2:00 | End card with app, repo, notebook, and limitations | “This is a controlled mechanism demo, not a real-photo accuracy result, and the failed browser gate remains part of the evidence.” | Anonymous links; Apache-2.0 code license; limitations |

Target 1:55 to leave editing margin. Do not splice notebook output into a screen
that appears live. If notebook inference footage is shortened, label the cut and
show the actual elapsed time; retain the uncut run and its hash.

## Claims that are disabled

- No browser accuracy or dependable missing-object claim.
- No offline inference claim; the offline sequence was not run after the core
  browser semantic failure.
- No claim that the Pages ledger was produced by Gemma.
- No claim that the notebook evaluated real photographs or natural human speech.
- No claim that synthetic-scene results predict physical-scene accuracy.
- No claim that Kaggle notebook execution keeps inputs on-device.
- No privacy claim stronger than the verified implementation facts: no
  ScenePatch account, application backend, or telemetry code.

## Evidence required with the final take

| Item | Value to record |
|---|---|
| Verified deployed Pages application commit SHA | `321b3c4d016fb2fd588ba5a9cf93c6f1df5cdd83` |
| Public app and repository URLs | [app](https://praharsh-projects.github.io/scenepatch-gemma4/) · [repository](https://github.com/Praharsh-Projects/scenepatch-gemma4) |
| Public Kaggle notebook URL | [competition-linked V3](https://www.kaggle.com/code/praharshpulla/scenepatch-gemma-4?scriptVersionId=339575640) |
| Public Kaggle output URL | [V3 output](https://www.kaggle.com/code/praharshpulla/scenepatch-gemma-4/output?scriptVersionId=339575640) |
| Public Kaggle dataset URL | [scenepatch-controlled-fixture](https://www.kaggle.com/datasets/praharshpulla/scenepatch-controlled-fixture) |
| Generated PNG hashes and generator source/revision | PNG hashes and the `app/lib/media.ts` source commit are recorded in `FIXTURE_RIGHTS.md` |
| Audio generator | CMU Flite `2.3-current`; commit `6c9f20dc915b17f5619340069889db0aa007fcdc`; voice `slt` |
| Final audio | `pcm_s16le`; 16 kHz; mono; `4.755 s`; SHA-256 `d99fe8ce17149e9c8bc94e90467a95d3e1f5b98ba67e7fbc7f2c8fe9f201b020` |
| Human media/license approval | Approved for the exact five hashed source files at 2026-08-01 22:03:40 CEST; see `FIXTURE_RIGHTS.md` |
| Source / V3 executed notebook SHA-256 | `108604448f368c1fcd583ed79b7b4cc0d6d10ce69542c64ab06415348cf4ad90` / `0c97048417864c5d2c5dfdac835f23f87f6e1ba840b42eccde1a68434bab2a43` |
| Kaggle V3 identifiers / output shape | Version `202340794`; script `339575640`; 15 cells, 10 code, 8 output-bearing, 7 output files |
| V3 saved-output JSON SHA-256 | Bad `1b520ccc7914938ec51b3e85972609b0c9f62ca7b29084da625573741e39be28`; corrected `54bc5eef1258d72d4e3eab65c1dd9a2ef9ecaf3c8d892c13357659d1d5a54cd8`; occluded `6093a9456651ea4bd142971163648b6a227f2ee807128af660e6a066e8ee348d` |
| Kaggle GPU, Python, PyTorch, Transformers | Tesla T4; 3.12.13; 2.10.0+cu128; 5.14.1 |
| Official model ID/revision | `kaggle://google/gemma-4/transformers/gemma-4-e2b-it/1`; documented upstream revision `3e22461f65e89153144f8adb70e3b8c2cc9845a7`, not byte-verified against Kaggle V1 |
| V3 model load | 83.636302238 s |
| Bad-scene result | Valid; no retry; 3 turns; 15.295668616 s total inference; `blocked_by_deterministic_policy` |
| Corrected-scene result | Valid; no retry; 2 turns; 8.560120476 s total inference; `pending_human_confirmation` |
| Occluded-scene result | Valid; no retry; 3 turns; 14.269275557 s total inference; `blocked_by_deterministic_policy` |
| Review draft location/hash | `ScenePatch-demo-review-v3.mp4` / `73586989e041648fed9e8ce1966e90940fe64b661e83a0114409ead71a58faf7` (competition-linked V3 basis; local, unapproved, unpublished) |
| Public two-minute video URL | `[REQUIRED]` |

## Final human approval gate

The exact five source-media files are approved for the stated public uses, and
the Kaggle rules page shows the rules are accepted. Before upload, the entrant
must still confirm all measured claims, check for tokens and private paths,
review the final duration and completed video, publish that approved video,
verify its public link anonymously, and personally submit the competition entry.
