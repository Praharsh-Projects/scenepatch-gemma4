# ScenePatch: Git for Physical Creative Setups

**Subtitle:** A local-first semantic diff that checks whether a real-world
creative scene changed the way its owner intended.

**Track:** Local Frontier Innovation

> Submission draft. Bracketed links and measurements are deliberately not
> invented. Every `[REQUIRED]` field must be replaced with release evidence, and
> this status note may be removed only after the evidence checklist passes.
>
> **Current fallback state:** the pinned browser q4f16 runtime loaded and emitted
> native calls, but missed the blue-marker removal and proposed a commit. The
> public Pages build is therefore a labeled scripted replay. The official
> `google/gemma-4-E2B-it` notebook is the executable model path. The exact five
> hashed media files were approved for public use at 2026-08-01 22:03:40 CEST.
> A private Kaggle dataset and private draft notebook now exist, but the notebook
> has zero executed result evidence and no published version. GPU and internet
> remain blocked until the entrant completes Kaggle phone verification.

## The problem

A shared art desk changes constantly. Someone moves a marker as requested but
also removes a tool, covers a sketch, or shifts a reference object. A conventional
pixel diff detects lighting, shadows, and camera movement alongside the meaningful
changes. It cannot answer the useful question: **did the physical scene change in
the way I intended, and only in that way?**

ScenePatch brings a familiar software idea—reviewing a change before committing
it—to small physical creative setups. It is not an inventory, surveillance, or
safety system. It is a focused prototype for student artists and small creative
teams who want a quick second look at controlled desk scenes without uploading
their media to an application backend.

## The experience

The user supplies three pieces of evidence:

1. a before photograph;
2. a spoken instruction of at most ten seconds; and
3. an after photograph.

ScenePatch labels and joins the photographs into a single before/after contact
sheet, normalizes the audio locally, and asks Gemma 4 to classify the visible
changes against the spoken intent. The result is shown as a semantic diff with
three possible labels: `intended`, `unexplained`, and `uncertain`.

The hero demonstration is intentionally concrete. A white sketchbook sits between
a red and a blue marker, with a yellow sticky-note pad above. The instruction is:
“Move the red marker above the sketchbook. Keep everything else exactly where it
is.” In the first after image, the red marker is moved correctly but the blue
marker is gone. That unexplained change must block the patch. In the corrected
image, the blue marker is restored, and the user—not the model—can confirm the
clean patch.

The release fixture is deliberately synthetic for reproducibility and provenance:
four deterministic code-generated 640×512 PNGs represent the controlled scenes,
and a 4.755-second CMU Flite `slt` clip renders the instruction. These are mechanism
inputs, not photographs, natural speech, evidence of a physical desk, or proof of
real-world accuracy. At 2026-08-01 22:03:40 CEST, the entrant approved public use
of these exact five hashed media files for the repository, Kaggle dataset/notebook,
and demo video. Their hashes and approval scope are recorded in
[`docs/FIXTURE_RIGHTS.md`](FIXTURE_RIGHTS.md). This source-media approval does not
approve a final demo video. No demo video currently exists, and no final video
has been approved.

## Why Gemma 4 is essential

ScenePatch uses the Gemma 4 E2B instruction-tuned model because this task requires
the relationship between vision, audio, language, and structured tool use—not
just an image caption or speech transcription.

The experimental browser runtime uses the pinned `q4f16` files from
[`onnx-community/gemma-4-E2B-it-ONNX`](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX),
a browser-compatible conversion of the Google Gemma 4 E2B IT weights, through
Transformers.js and WebGPU. The included notebook can be published to Kaggle to
load the pinned official
[`google/gemma-4-E2B-it`](https://huggingface.co/google/gemma-4-E2B-it) checkpoint
with Hugging Face Transformers on a Kaggle GPU so judges can execute and inspect the prompt,
tool schemas, raw generation, parser, and deterministic policy independently of
the web interface. It is an independent mechanism check: its unquantized runtime
and preprocessing are documented separately rather than presented as a
pixel-identical reproduction of the browser path.

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

Model output is treated as untrusted input. TypeScript code allowlists the three
tool names, validates argument shapes, limits the response to six unique change
records, and requires exactly one terminal call. A malformed response gets one
constrained repair attempt and then fails closed.

Most importantly, the executor overrides any proposed commit if even one change
is `unexplained` or `uncertain`. A clean result is still only pending. A human must
click confirm before it becomes a local patch record. ScenePatch never evaluates
generated code or gives Gemma browser, file-system, network, or database authority.

## Local-first architecture and privacy

The browser implementation prepares media and runs its ONNX model in a dedicated
worker, but it is not the release-qualified execution path because its semantic
gate failed. The Pages build instead replays three expected fixture decisions and
labels them as scripted. The official-checkpoint notebook performs the actual
Gemma generation. Confirmed replay patches live in IndexedDB with the
model identifier, intent summary, image-thumbnail hashes, validated change
records, decision, and measured timing. Audio is discarded after inference by
default; images are retained only after an explicit choice.

The primary public host is GitHub Pages at
[praharsh-projects.github.io/scenepatch-gemma4](https://praharsh-projects.github.io/scenepatch-gemma4/).
Anonymous access and the complete replay flow were verified on 31 July 2026.
There is no ScenePatch account or application API. This release makes no offline
inference claim; the public experience does not run the browser model.

The primary notebook path is cloud-hosted on Kaggle and will process only this
approved, nonprivate synthetic fixture. Its private
[dataset](https://www.kaggle.com/datasets/praharshpulla/scenepatch-controlled-fixture)
contains exactly six files: the five approved media files plus their manifest.
The private draft
[notebook](https://www.kaggle.com/code/praharshpulla/scenepatch-gemma-4)
has the approved notebook imported, the dataset attached, and Kaggle's official
Google Gemma 4 Transformers `gemma-4-e2b-it` V1 model attached. It has no
published version or executed result evidence. Kaggle currently blocks GPU and
internet until the entrant completes phone verification. This notebook does not
demonstrate that arbitrary user media remains on-device.

## Evidence, limitations, and impact

The release evaluation will use three comparisons built from the same controlled,
code-generated and approved fixture: a clean intended change, an intended
change plus an unexplained removal, and an occluded scene. The latter two are
expected to fail closed. The planned gate is five consecutive correct clean
proposals and five consecutive correct blocks, but those official-checkpoint runs
are still pending.

Browser engineering result from 31 July 2026: on an M4 Pro with Chrome
150.0.7871.187, the exact pinned q4f16 cache verified and warm model loading took
5.0 seconds. The model emitted native tool calls, but proposed a clean commit for
the missing-blue-marker scene even after a disappearance-focused recheck. This is
reported as a failed gate, not a successful block or accuracy result.

Results still required from the official-checkpoint notebook and exact hashed
synthetic inputs:

- official model load: `[REQUIRED BYTES AND ELAPSED TIME]`;
- generated bad-scene notebook inference: `[REQUIRED MEASURED RESULT]`;
- generated corrected-scene notebook inference: `[REQUIRED MEASURED RESULT]`;
- repeated generated-fixture gate: `[REQUIRED PASS/FAIL COUNTS]`;
- tested browser/hardware: `[REQUIRED EXACT VERSIONS]`.

Any resulting numbers will be controlled synthetic-fixture mechanism observations,
not accuracy evidence for photographs, natural speech, or physical setups.
ScenePatch can miss small, occluded, or ambiguous changes and can be affected by
camera angle and lighting. It must not be used for theft detection, compliance,
hazard assessment, evidence, or any decision where an error could harm someone.

Within that boundary, the idea offers a new interaction: describe a physical
change, inspect a multimodal semantic diff, and preserve only a human-approved
version. The architecture explores local execution, but the release-qualified
model evidence will come from the cloud-hosted Kaggle notebook; this draft makes
no claim that its evaluation inputs remain on-device.

## Sprint challenges and what I learned

The hardest part was not producing prose from two images; it was building a narrow
trust boundary around a multimodal model: compact media, native tool calls, strict
parsing, policy overrides, human confirmation, and honest failure states. The
multi-gigabyte model also makes “local” different from “instantly offline.”

## Links

- Live app: [ScenePatch on GitHub Pages](https://praharsh-projects.github.io/scenepatch-gemma4/)
- Source and architecture: [public Apache-2.0 repository](https://github.com/Praharsh-Projects/scenepatch-gemma4)
- Private notebook draft (not judge-accessible): [Kaggle draft](https://www.kaggle.com/code/praharshpulla/scenepatch-gemma-4)
- Reproducibility notebook: `[REQUIRED PUBLIC KAGGLE NOTEBOOK URL]`
- Two-minute demonstration: `[REQUIRED PUBLIC VIDEO URL]`
- Gemma function-calling reference: [Google AI for Developers](https://ai.google.dev/gemma/docs/capabilities/text/function-calling-gemma4)

## Pre-submission human gate

The [official deadline](https://www.kaggle.com/competitions/build-with-gemma-gdgunn/rules)
is **3 August 2026 at 23:59 WAT** (22:59 UTC; 4 August at 00:59 CEST); the internal
target is **18:00 WAT**. The entrant approved the exact five fixture media files
for the stated public uses at 2026-08-01 22:03:40 CEST, and the Kaggle rules page
shows the rules are accepted. Remaining gates are Kaggle phone verification,
executed and preserved notebook results, a published notebook version, review of
every measured claim, a created and approved final video, anonymous access to all
submission links, and the entrant's final Kaggle submission. Eligibility proof,
KYC/payout, banking, and tax actions remain with the human entrant.
AI-assisted code and documentation must receive human review; no result may be
inferred from this draft.
