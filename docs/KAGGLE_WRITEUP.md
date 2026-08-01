# ScenePatch: Git for Physical Creative Setups

**Subtitle:** A local-first semantic diff that checks whether a real-world
creative scene changed the way its owner intended.

**Track:** Local Frontier Innovation

> Submission draft. Every unresolved release field is a deliberate blocker.
>
> **Current fallback state:** the pinned browser q4f16 runtime loaded and emitted
> native calls, but missed the blue-marker removal and proposed a commit. The
> public Pages build is therefore a labeled scripted replay. The official
> `google/gemma-4-E2B-it` notebook is the executable model path. The exact five
> hashed media files were approved for public use at 2026-08-01 22:03:40 CEST.
> Competition-linked Kaggle V3 (`339575640`) completed its full batch in 4m11s.
> Its explicit notebook and output URLs are public and anonymously verified; no
> competition entry has been submitted.

## The problem

A shared art desk changes constantly. Pixel diffs mix meaningful changes with
lighting, shadows, and camera movement. ScenePatch asks: **did the physical scene
change the way I intended, and only that way?** It brings pre-commit review to
controlled creative desks. It is not an inventory, surveillance, or safety
system.

## The experience

The user supplies before and after photographs plus a spoken instruction of at
most ten seconds. ScenePatch joins the images into a labeled contact sheet,
normalizes audio locally, and asks Gemma 4 for an `intended`, `unexplained`, or
`uncertain` semantic diff.

The hero demonstration is intentionally concrete. A white sketchbook sits between
a red and a blue marker, with a yellow sticky-note pad above. The instruction is:
“Move the red marker above the sketchbook. Keep everything else exactly where it
is.” In the first after image, the red marker is moved correctly but the blue
marker is gone. That unexplained change must block the patch. In the corrected
image, the blue marker is restored, and the user—not the model—can confirm the
clean patch.

The reproducible fixture contains four deterministic 640×512 PNGs and a
4.755-second CMU Flite `slt` instruction clip. These are controlled mechanism
inputs, not photographs, natural speech, or real-world accuracy evidence. At
2026-08-01 22:03:40 CEST, the entrant approved their exact five hashes for the
repository, Kaggle dataset/notebook, and demo video. Details are recorded in
[`docs/FIXTURE_RIGHTS.md`](FIXTURE_RIGHTS.md). This source-media approval does not
approve a final demo video. No final demo video has been approved or published.

## Why Gemma 4 is essential

ScenePatch uses the Gemma 4 E2B instruction-tuned model because this task requires
the relationship between vision, audio, language, and structured tool use—not
just an image caption or speech transcription.

The experimental browser runtime uses pinned `q4f16` files from
[`onnx-community/gemma-4-E2B-it-ONNX`](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX),
a browser conversion of Gemma 4 E2B IT, through Transformers.js and WebGPU. The
notebook loads the official
[`google/gemma-4-E2B-it`](https://huggingface.co/google/gemma-4-E2B-it) checkpoint
with Transformers on a Kaggle GPU. Judges can inspect the prompt, native calls,
raw generations, parser, and host policy. Its unquantized runtime and
preprocessing are not a pixel-identical browser reproduction.

Gemma receives one labeled image, one normalized audio clip, a compact system
instruction, and exactly three native function declarations:

- `record_change(description, classification)` records evidence;
- `commit_patch(summary)` proposes a clean patch; and
- `block_commit(reason)` proposes a block.

The declarations are passed through Gemma's chat template rather than described
as informal JSON in the prompt. Thinking and sampling are disabled, and output is
limited to 128 new tokens. The model generates tool calls; it does not execute
them.

## Deterministic control after generation

Model output is untrusted. The browser's TypeScript executor and notebook's
Python validator allowlist the three tools, validate bounded arguments, reject
duplicates, require one terminal call, and allow one constrained repair before
failing closed. A clean result remains pending until a human confirms it.

For this exact fixture only, the notebook also verifies approved hashes and runs
a fixed pixel/color preflight. It supplies `red_marker`, `blue_marker`, and
`occlusion` coverage labels; the approved transcript supplies `red_marker` as
the intended label. Gemma must record every supplied label, but does not execute
tools. The host overrides commits when required coverage is outside the approved
intent. This is hash-gated controlled-fixture policy, not general object
detection. ScenePatch never evaluates generated code or grants Gemma browser,
file-system, network, or database authority.

## Local-first architecture and privacy

The browser worker's semantic gate failed, so Pages labels three fixture outcomes
as scripted replay. The official-checkpoint notebook performs Gemma generation.
Confirmed replay patches live in IndexedDB with hashes, validated changes,
decision, and timing. Audio is discarded; images require explicit retention.

The primary public host is GitHub Pages at
[praharsh-projects.github.io/scenepatch-gemma4](https://praharsh-projects.github.io/scenepatch-gemma4/).
Anonymous access and the complete replay flow were verified on 31 July 2026.
There is no ScenePatch account or application API. This release makes no offline
inference claim; the public experience does not run the browser model.

The Kaggle notebook processes only this approved synthetic fixture. Its public
[dataset](https://www.kaggle.com/datasets/praharshpulla/scenepatch-controlled-fixture)
contains exactly six files: the five approved media files plus their manifest.
The dataset page includes a provenance subtitle and description, with license
metadata set to “Other (specified in description).” The public
[executed notebook V3](https://www.kaggle.com/code/praharshpulla/scenepatch-gemma-4?scriptVersionId=339575640)
has the approved notebook imported, the dataset attached, and Kaggle's official
Google Gemma 4 Transformers `gemma-4-e2b-it` V1 model attached. Kaggle version
ID `202340794` / script version `339575640`, labeled **COMPLETE BATCH**, finished
in 4m11s in the UI. Its explicit notebook and
[output](https://www.kaggle.com/code/praharshpulla/scenepatch-gemma-4/output?scriptVersionId=339575640)
URLs returned HTTP 200 anonymously. This cloud path does not show arbitrary user
media remaining on-device.

The bare notebook URL currently defaults to V1. V2 (`339574570`) is a source-only
quick version, so every executable claim below cites the explicit V3 URL. The
notebook is linked to Build with Gemma, but no entry has been submitted (`0/5`,
“No Submissions”).

## Evidence, limitations, and impact

The source notebook SHA-256 is
`108604448f368c1fcd583ed79b7b4cc0d6d10ce69542c64ab06415348cf4ad90`.
The downloaded V3 executed notebook SHA-256 is
`0c97048417864c5d2c5dfdac835f23f87f6e1ba840b42eccde1a68434bab2a43`.
It has 15 cells: 10 code cells, eight output-bearing code cells, and seven output
files. Model loading took `83.636302238` seconds.

| One-pass case | Valid / retry | Turns | Total inference | Host decision |
|---|---:|---:|---:|---|
| Bad | yes / no | 3 | 15.295668616 s | `blocked_by_deterministic_policy` |
| Corrected | yes / no | 2 | 8.560120476 s | `pending_human_confirmation` |
| Occluded | yes / no | 3 | 14.269275557 s | `blocked_by_deterministic_policy` |

The downloaded JSON SHA-256 values are
`1b520ccc7914938ec51b3e85972609b0c9f62ca7b29084da625573741e39be28`
(bad),
`54bc5eef1258d72d4e3eab65c1dd9a2ef9ecaf3c8d892c13357659d1d5a54cd8`
(corrected), and
`6093a9456651ea4bd142971163648b6a227f2ee807128af660e6a066e8ee348d`
(occluded).

Gemma labeled the red marker, blue marker, and occlusion `intended` and proposed
commits. The hash-gated host policy, using its supplied coverage plus the
approved transcript, overrode the bad and occluded proposals. Thus the run
demonstrates deterministic control and the clean
human-confirmation gate, not that Gemma detected or classified those changes
correctly. It is one exact controlled-fixture pass, not model accuracy. The
planned five-consecutive clean/block gate on the M4 Pro was not met.

A 1:52 local review video is aligned to competition-linked V3 (`339575640`) and
its saved timings. It is unapproved and unpublished.

On 31 July, the M4 Pro browser path loaded warm in 5.0 seconds and emitted native
calls, but proposed a clean commit for the missing blue marker even after a
recheck. That failed gate is not accuracy evidence.

These numbers are controlled synthetic-fixture mechanism observations, not
accuracy evidence for photographs, natural speech, or physical setups.
ScenePatch can miss small, occluded, or ambiguous changes and can be affected by
camera angle and lighting. It must not be used for theft detection, compliance,
hazard assessment, evidence, or any decision where an error could harm someone.

Within that boundary, users can describe a physical change, inspect a multimodal
diff, and preserve only a human-approved version. Executable release evidence
comes from Kaggle; its evaluation did not stay on-device.

## Sprint challenges and what I learned

The hard part was the trust boundary: compact media, native calls, strict parsing,
host overrides, human confirmation, and honest failure states. A multi-gigabyte
model also makes “local” different from “instantly offline.”

## Links

- Live app: [ScenePatch on GitHub Pages](https://praharsh-projects.github.io/scenepatch-gemma4/)
- Source and architecture: [public Apache-2.0 repository](https://github.com/Praharsh-Projects/scenepatch-gemma4)
- Reproducibility notebook: [public competition-linked V3](https://www.kaggle.com/code/praharshpulla/scenepatch-gemma-4?scriptVersionId=339575640)
- Controlled fixture: [public Kaggle dataset](https://www.kaggle.com/datasets/praharshpulla/scenepatch-controlled-fixture)
- Two-minute demonstration: `[REQUIRED PUBLIC VIDEO URL]`
- Gemma function-calling reference: [Google AI for Developers](https://ai.google.dev/gemma/docs/capabilities/text/function-calling-gemma4)

## Pre-submission human gate

The [official deadline](https://www.kaggle.com/competitions/build-with-gemma-gdgunn/rules)
is **3 August 2026 at 23:59 WAT** (22:59 UTC; 4 August at 00:59 CEST); the internal
target is **18:00 WAT**. The entrant approved the exact five fixture media files
for the stated public uses at 2026-08-01 22:03:40 CEST, and the Kaggle rules page
shows the rules are accepted. Public notebook and dataset access have been
verified anonymously. Remaining gates are review of every measured claim, an
approved and published final video, anonymous access to that final link, and the
entrant's final Kaggle submission.
Eligibility proof, KYC/payout, banking,
and tax actions remain with the human entrant.
AI-assisted code and documentation must receive human review; no result may be
inferred from this draft.
