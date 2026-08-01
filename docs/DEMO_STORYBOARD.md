# ScenePatch two-minute fallback demo storyboard

> **Recording gate:** the browser q4f16 path failed the required missing-marker
> trial. Do not present the Pages replay as live inference. Record the final take
> only after the official-checkpoint Kaggle notebook has run on the exact hashed
> synthetic fixture and every shown output has been preserved. The exact five
> source-media files were approved for the repository, Kaggle dataset/notebook,
> and demo video at 2026-08-01 22:03:40 CEST. The notebook run and final-video
> review are not complete. No demo video currently exists, and no final video
> has been approved.

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
That approval covers the source media, not a final demo video that does not yet
exist.

## Kaggle recording status

The private
[fixture dataset](https://www.kaggle.com/datasets/praharshpulla/scenepatch-controlled-fixture)
contains exactly six files: the five approved media files plus the manifest. The
private draft
[notebook](https://www.kaggle.com/code/praharshpulla/scenepatch-gemma-4)
has the approved notebook imported, the fixture dataset attached, and Kaggle's
official Google Gemma 4 Transformers `gemma-4-e2b-it` V1 model attached. It has
no published version and zero executed result evidence. Kaggle currently blocks
GPU and internet until the entrant completes phone verification, so no notebook
output is available to record yet.

## Shot list and narration

| Time | Screen action | Narration | Evidence visible |
|---|---|---|---|
| 0:00–0:10 | Title over the clearly labeled generated before-scene PNG | “ScenePatch asks whether a scene change matched the instruction. This demo uses controlled synthetic inputs.” | Product name; synthetic-fixture label |
| 0:10–0:23 | Open the Pages setup screen and pause on its replay warning | “The browser model loaded, but it missed this removed marker. I failed that gate instead of hiding it, so this public interface is a scripted replay.” | Replay label; no live-model claim |
| 0:23–0:38 | Open the public notebook’s fixture, model, tools, and validator cells | “The executable path uses the official pinned Gemma 4 E2B checkpoint, generated scene PNGs, synthesized audio, and exactly three native functions.” | Fixture hashes; audio provenance; model revision; three tools |
| 0:38–0:55 | Show the completed bad-scene notebook output from the same uncut run | “Here is the raw generation and deterministic decision from the same hashed synthetic bad scene.” | Actual raw output, hashes, timing, environment |
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
| Verified final application commit SHA | `[REQUIRED]` |
| Public app and repository URLs | [app](https://praharsh-projects.github.io/scenepatch-gemma4/) · [repository](https://github.com/Praharsh-Projects/scenepatch-gemma4) |
| Public Kaggle notebook URL | `[REQUIRED]` |
| Generated PNG hashes and generator source/revision | PNG hashes and the `app/lib/media.ts` source commit are recorded in `FIXTURE_RIGHTS.md` |
| Audio generator | CMU Flite `2.3-current`; commit `6c9f20dc915b17f5619340069889db0aa007fcdc`; voice `slt` |
| Final audio | `pcm_s16le`; 16 kHz; mono; `4.755 s`; SHA-256 `d99fe8ce17149e9c8bc94e90467a95d3e1f5b98ba67e7fbc7f2c8fe9f201b020` |
| Human media/license approval | Approved for the exact five hashed source files at 2026-08-01 22:03:40 CEST; see `FIXTURE_RIGHTS.md` |
| Kaggle image, GPU, Python, PyTorch, Transformers | `[REQUIRED]` |
| Official model ID/revision | `[REQUIRED]` |
| Bad-scene raw output, result, and timing | `[REQUIRED]` |
| Corrected-scene raw output, result, and timing | `[REQUIRED]` |
| Uncut recording location/hash | `[REQUIRED before upload]` |
| Public two-minute video URL | `[REQUIRED]` |

## Final human approval gate

The exact five source-media files are approved for the stated public uses, and
the Kaggle rules page shows the rules are accepted. Before upload, the entrant
must still complete Kaggle phone verification, execute and publish the notebook,
confirm its exact outputs and measured claims, verify anonymous access to every
link, check for tokens and private paths, review the final duration and completed
video, publish that approved video, and personally submit the competition entry.
