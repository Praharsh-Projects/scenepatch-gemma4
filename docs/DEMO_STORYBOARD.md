# ScenePatch two-minute fallback demo storyboard

> Recording gate: the browser q4f16 path failed the required missing-marker
> trial. Do not present the Pages replay as live inference. Record the final take
> only after the official-checkpoint Kaggle notebook has run on the approved
> fixture and every shown output has been preserved.

## Hero fixture

- **Before:** white sketchbook centered, red marker left, blue marker right,
  yellow sticky-note pad above.
- **Spoken intent:** “Move the red marker above the sketchbook. Keep everything
  else exactly where it is.”
- **Bad after:** red marker moved correctly; blue marker removed.
- **Corrected after:** red marker remains above; blue marker restored to the right.

Every final photo and voice clip must be produced and approved by the entrant in
`docs/FIXTURE_RIGHTS.md`. The canvas fixtures in the Pages app are developer
replays, not substitutes for approved competition media.

## Shot list and narration

| Time | Screen action | Narration | Evidence visible |
|---|---|---|---|
| 0:00–0:10 | Title over the approved physical desk | “A pixel diff can show that a desk changed. ScenePatch asks whether the change matched what I said.” | Product name; owned fixture |
| 0:10–0:23 | Open the Pages setup screen and pause on its replay warning | “The browser model loaded, but it missed this removed marker. I failed that gate instead of hiding it, so this public interface is labeled as a scripted replay.” | Replay label; no live-model claim |
| 0:23–0:38 | Open the public notebook’s model, tools, and validator cells | “The executable Gemma path uses the official pinned Gemma 4 E2B checkpoint, combined image, audio and text input, and exactly three native functions.” | Official model ID/revision; three tools |
| 0:38–0:55 | Show the completed bad-scene notebook output from the same uncut run | “Here is the raw generation and deterministic decision from the approved bad fixture.” | Actual raw output, hashes, timing, environment |
| 0:55–1:10 | Return to Pages; select **Missing marker** and replay the diff | “The UI replay makes the intended product behavior inspectable: the requested red move is intended, while the missing blue marker is unexplained and blocks.” | Persistent replay banner; blocked ledger |
| 1:10–1:23 | Select **Corrected** and replay | “With the blue marker restored, the expected policy outcome is a pending clean patch.” | Replay label; pending state |
| 1:23–1:34 | Click **Confirm replay commit** | “Even a clean proposal cannot store itself. A person still confirms the local record.” | Human click |
| 1:34–1:47 | Show IndexedDB-backed history, hashes, export | “History is local, schema-validated, and exportable. Audio is never stored.” | Replay model identifier; hashes; metadata-only default |
| 1:47–2:00 | End card with app, repo, notebook, limitations | “ScenePatch is a narrow prototype—and the failed browser gate is part of the evidence, not something I edited away.” | Anonymous links; Apache-2.0; limitations |

Target 1:55 to leave editing margin. Do not splice notebook output into a screen
that appears live. If notebook inference footage is shortened, label the cut and
show the actual elapsed time; retain the uncut run and its hash.

## Claims that are disabled

- No browser accuracy or dependable missing-object claim.
- No offline inference claim; the offline sequence was not run after the core
  browser semantic failure.
- No claim that the Pages ledger was produced by Gemma.
- No privacy claim stronger than the verified implementation facts: no
  ScenePatch account, application backend, or telemetry code.

## Evidence captured with the final take

| Item | Value to record |
|---|---|
| App commit SHA | `[REQUIRED]` |
| Public app and repository URLs | `[REQUIRED]` |
| Public Kaggle notebook URL | `[REQUIRED]` |
| Approved fixture hashes | `[REQUIRED]` |
| Kaggle image, GPU, Python, PyTorch, Transformers | `[REQUIRED]` |
| Official model ID/revision | `[REQUIRED]` |
| Bad-scene raw output, result, and timing | `[REQUIRED]` |
| Corrected-scene raw output, result, and timing | `[REQUIRED]` |
| Uncut recording location/hash | `[REQUIRED before upload]` |

## Final human approval gate

Before upload, the entrant must personally confirm fixture and voice rights,
every notebook output and measured claim, anonymous access to all links, absence
of tokens/private paths, and the final duration. Publishing the video, activating
the Kaggle notebook, accepting the rules, and submitting remain human actions.
