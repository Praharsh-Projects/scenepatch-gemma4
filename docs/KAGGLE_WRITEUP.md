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
> public Pages build is therefore a labeled scripted fixture replay. The official
> `google/gemma-4-E2B-it` Kaggle notebook is the primary executable model path and
> still requires an approved fixture run before this draft can be submitted.

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

Gemma receives one labeled image, one normalized voice clip, a compact system
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

The intended primary public host is GitHub Pages at `[REQUIRED PUBLIC APP URL]`.
There is no ScenePatch account or application API. This release makes no offline
inference claim; the public experience does not run the browser model.

## Evidence, limitations, and impact

The release evaluation will use three creator-owned fixtures after the entrant's
rights approval: a clean intended
change, an intended change plus an unexplained removal, and an occluded or poorly
aligned scene. The latter two are expected to fail closed. The required demo-laptop
gate is five consecutive correct clean proposals and five consecutive correct
blocks.

Browser engineering result from 31 July 2026: on an M4 Pro with Chrome
150.0.7871.187, the exact pinned q4f16 cache verified and warm model loading took
5.0 seconds. The model emitted native tool calls, but proposed a clean commit for
the missing-blue-marker scene even after a disappearance-focused recheck. This is
reported as a failed gate, not a successful block or accuracy result.

Results still required from the official-checkpoint notebook and approved media:

- official model load: `[REQUIRED BYTES AND ELAPSED TIME]`;
- bad-scene notebook inference: `[REQUIRED MEASURED RESULT]`;
- corrected-scene notebook inference: `[REQUIRED MEASURED RESULT]`;
- repeated hero-fixture gate: `[REQUIRED PASS/FAIL COUNTS]`;
- tested browser/hardware: `[REQUIRED EXACT VERSIONS]`.

These are fixture-level observations, not a claim of general detection accuracy.
ScenePatch can miss small, occluded, or ambiguous changes and can be affected by
camera angle and lighting. It must not be used for theft detection, compliance,
hazard assessment, evidence, or any decision where an error could harm someone.
Uncertainty is visible and blocks progress rather than being hidden behind a
confident score.

Within that boundary, the idea offers a new interaction: describe a physical
change, inspect a multimodal semantic diff, and preserve only a human-approved
version. Local execution gives creative teams a way to experiment with this
workflow without building a cloud media archive.

## Sprint challenges and what I learned

The main engineering challenge was not producing prose from two images. It was
building a narrow trust boundary around a small multimodal model: compact media,
native tool calls, strict parsing, policy overrides, human confirmation, and
honest failure states. Browser storage and the multi-gigabyte first model load also
make “local” different from “instantly offline.” ScenePatch exposes those costs
instead of disguising them.

## Links

- Live app: `[REQUIRED AFTER ANONYMOUS DEPLOYMENT TEST]`
- Source and architecture: `[REQUIRED PUBLIC REPOSITORY URL]`
- Reproducibility notebook: `[REQUIRED PUBLIC KAGGLE NOTEBOOK URL]`
- Two-minute demonstration: `[REQUIRED PUBLIC VIDEO URL]`
- Gemma function-calling reference: [Google AI for Developers](https://ai.google.dev/gemma/docs/capabilities/text/function-calling-gemma4)

## Pre-submission human gate

The [official deadline](https://www.kaggle.com/competitions/build-with-gemma-gdgunn/rules)
is **3 August 2026 at 23:59 WAT** (22:59 UTC; 4 August at 00:59 CEST); the internal
target is **18:00 WAT**. Before submission, the entrant must personally approve
the owned fixture and voice rights, public repository and media release, measured
claims, rule acceptance, and the final Kaggle submission. Eligibility proof,
KYC/payout, banking, and tax actions also remain with the human entrant.
AI-assisted code and documentation must receive human review; no result may be
inferred from this draft.
