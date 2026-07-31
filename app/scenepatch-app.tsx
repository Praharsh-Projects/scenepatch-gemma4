"use client";

import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  CloudOff,
  Cpu,
  Download,
  FileJson,
  GitCommitHorizontal,
  GitCompareArrows,
  HardDrive,
  History,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  Mic,
  OctagonAlert,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  createPatchDraft,
  createToolRepairPrompt,
  executeToolCalls,
  scenePatchRepository,
  type PatchDraft,
  type StoredPatch,
  type ToolExecutionResult,
} from "@/app/lib/core";
import {
  GemmaWorkerClient,
  ModelRuntimeError,
  MODEL_Q4F16_WEIGHT_BYTES,
  MODEL_SAMPLE_RATE,
  SCENEPATCH_MODEL_ID,
  SCENEPATCH_MODEL_REVISION,
  inspectModelCompatibility,
  requestPersistentModelStorage,
  type ModelCompatibility,
  type ModelLoadProgress,
  type SceneAnalysisResult,
} from "@/app/lib/model";
import {
  createContactSheet,
  createSyntheticArtDeskFixture,
  decodeAudioToMono16k,
  formatBytes,
  MAX_AUDIO_SECONDS,
  type FixtureVariant,
} from "@/app/lib/media";
import { createReplayToolCalls, REPLAY_MODEL_ID } from "@/app/lib/replay";

type Stage = "setup" | "capture" | "diff" | "history";
type ModelState = "checking" | "idle" | "loading" | "ready" | "analyzing" | "error";

interface AnalysisView {
  draft: PatchDraft;
  execution: ToolExecutionResult;
  rawOutput: string;
  contactSheetUrl: string;
  retried: boolean;
}

const STAGES: Array<{
  id: Stage;
  index: string;
  label: string;
  note: string;
  icon: typeof Cpu;
}> = [
  { id: "setup", index: "01", label: "Local model", note: "Check & prepare", icon: Cpu },
  { id: "capture", index: "02", label: "Capture", note: "Base, intent, after", icon: ImagePlus },
  { id: "diff", index: "03", label: "Semantic diff", note: "Review the patch", icon: GitCompareArrows },
  { id: "history", index: "04", label: "Local history", note: "Confirmed commits", icon: History },
];

const HERO_INTENT = "Move the red marker above the sketchbook. Keep everything else exactly where it is.";
const PUBLIC_REPLAY_MODE =
  process.env.NEXT_PUBLIC_SCENEPATCH_REPLAY_MODE === "true";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something unexpected happened.";
}

function formatDuration(milliseconds: number) {
  if (milliseconds < 1_000) return `${Math.round(milliseconds)} ms`;
  return `${(milliseconds / 1_000).toFixed(1)} s`;
}

function shortHash(hash: string) {
  return hash.replace("sha256:", "").slice(0, 10);
}

function classificationLabel(value: string) {
  return value === "intended" ? "Staged" : value === "unexplained" ? "Unexplained" : "Needs evidence";
}

function downloadText(filename: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ScenePatchApp() {
  const [stage, setStage] = useState<Stage>("setup");
  const [compatibility, setCompatibility] = useState<ModelCompatibility | null>(null);
  const [modelState, setModelState] = useState<ModelState>("checking");
  const [modelProgress, setModelProgress] = useState<ModelLoadProgress | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelLoadMs, setModelLoadMs] = useState<number | null>(null);
  const [persistenceGranted, setPersistenceGranted] = useState<boolean | null>(null);
  const [online, setOnline] = useState(true);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [intentSummary, setIntentSummary] = useState(HERO_INTENT);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [fixtureVariant, setFixtureVariant] = useState<FixtureVariant>("blocked");
  const [fixtureLoaded, setFixtureLoaded] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisView | null>(null);
  const [history, setHistory] = useState<StoredPatch[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retainImages, setRetainImages] = useState(false);

  const clientRef = useRef<GemmaWorkerClient | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await scenePatchRepository.list());
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }, []);

  const inspectCompatibility = useCallback(async () => {
    setModelState("checking");
    setModelError(null);
    try {
      const result = PUBLIC_REPLAY_MODE
        ? await inspectModelCompatibility()
        : await clientRef.current?.checkCompatibility();
      if (!result) throw new Error("The local model worker is unavailable.");
      setCompatibility(result);
      setModelState("idle");
    } catch (error) {
      setModelError(errorMessage(error));
      setModelState("error");
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const client = PUBLIC_REPLAY_MODE ? null : new GemmaWorkerClient();
    clientRef.current = client;
    const unsubscribe = client
      ? client.subscribe((event) => {
          if (event.type === "load-progress") setModelProgress(event.progress);
        })
      : () => undefined;
    const bootTimer = window.setTimeout(() => {
      setOnline(navigator.onLine);
      void inspectCompatibility();
      void refreshHistory();
    }, 0);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register(new URL("./sw.js", window.location.href).href).catch(() => {
        // The hosted app remains usable without installation support.
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
      client?.terminate();
      activeStreamRef.current?.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
      window.clearTimeout(bootTimer);
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    };
  }, [inspectCompatibility, refreshHistory]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, button, select")) return;
      const next = STAGES[Number(event.key) - 1];
      if (next) setStage(next.id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const setImage = useCallback((kind: "before" | "after", file: File | null, source: "user" | "fixture" = "user") => {
    if (kind === "before") {
      setBeforeUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return file ? URL.createObjectURL(file) : null;
      });
      setBeforeFile(file);
    } else {
      setAfterUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return file ? URL.createObjectURL(file) : null;
      });
      setAfterFile(file);
    }
    if (source === "user") setFixtureLoaded(false);
    setAnalysis(null);
  }, []);

  const prepareModel = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    setModelState("loading");
    setModelError(null);
    setModelLoadMs(null);
    setModelProgress({
      phase: "preflight",
      status: "starting",
      message: "Reserving local model storage…",
    });
    const startedAt = performance.now();
    try {
      let persisted = false;
      try {
        persisted = await requestPersistentModelStorage();
      } catch {
        // Persistence is an eviction-resistance hint, not a runtime requirement.
      }
      setPersistenceGranted(persisted);
      await client.load();
      const refreshedCompatibility = await client.checkCompatibility();
      setCompatibility(refreshedCompatibility);
      setModelLoadMs(performance.now() - startedAt);
      setModelProgress({ phase: "ready", status: "ready", progress: 1, message: "Gemma 4 E2B is ready locally." });
      setModelState("ready");
      setNotice(
        refreshedCompatibility.cache.state === "complete"
          ? "Local model ready. All pinned q4f16 cache files were verified."
          : "Model loaded for this tab. Browser cache retention could not be fully verified.",
      );
    } catch (error) {
      setModelError(errorMessage(error));
      setModelState("error");
    }
  }, []);

  const loadFixture = useCallback(
    async (variant: FixtureVariant) => {
      setBusy(true);
      try {
        const fixture = await createSyntheticArtDeskFixture(variant);
        setImage("before", fixture.before, "fixture");
        setImage("after", fixture.after, "fixture");
        setFixtureVariant(variant);
        setFixtureLoaded(true);
        setIntentSummary(HERO_INTENT);
        setNotice(
          variant === "clean"
            ? "Corrected fixture loaded: the blue marker is restored."
            : variant === "uncertain"
              ? "Occluded fixture loaded: the model should fail closed."
              : "Blocked fixture loaded: the blue marker is missing after the intended move.",
        );
      } finally {
        setBusy(false);
      }
    },
    [setImage],
  );

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const discardAudio = useCallback(() => {
    setAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setAudioBlob(null);
    setRecordingSeconds(0);
  }, []);

  const selectAudioFile = useCallback(
    (file: File | null) => {
      discardAudio();
      setAnalysis(null);
      if (!file) return;
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
      setNotice("Intent audio selected. It will be normalized locally and discarded after inference.");
    },
    [discardAudio],
  );

  const startRecording = useCallback(async () => {
    setNotice(null);
    discardAudio();
    setAnalysis(null);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      activeStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recordingChunksRef.current = [];
      setRecordingSeconds(0);
      recorder.ondataavailable = (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(blob);
        });
        setAudioBlob(blob);
        setRecording(false);
        stream?.getTracks().forEach((track) => track.stop());
        activeStreamRef.current = null;
      };
      recorder.start(250);
      setRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => {
          const next = current + 0.1;
          if (next >= MAX_AUDIO_SECONDS) stopRecording();
          return Math.min(MAX_AUDIO_SECONDS, next);
        });
      }, 100);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
      setRecording(false);
      setNotice(`Microphone unavailable: ${errorMessage(error)}`);
    }
  }, [discardAudio, stopRecording]);

  const runModel = useCallback(
    async (resultInput: { image: Blob; audio: Float32Array }, correction?: string): Promise<SceneAnalysisResult> => {
      const client = clientRef.current;
      if (!client) throw new Error("The local model worker is unavailable.");
      return client.analyze({
        image: resultInput.image,
        imageMimeType: resultInput.image.type || "image/webp",
        audio: resultInput.audio,
        sampleRate: MODEL_SAMPLE_RATE,
        correction,
      });
    },
    [],
  );

  const analyzeScene = useCallback(async () => {
    if (!beforeFile || !afterFile) {
      setNotice("Add both scene images before building a diff.");
      return;
    }
    if (PUBLIC_REPLAY_MODE) {
      if (!fixtureLoaded) {
        setNotice("This public replay accepts only the three labeled developer fixtures.");
        return;
      }
      setBusy(true);
      setNotice(null);
      try {
        const sheet = await createContactSheet(beforeFile, afterFile);
        const calls = createReplayToolCalls(fixtureVariant);
        const execution = executeToolCalls(calls);
        const draft = createPatchDraft({
          modelId: REPLAY_MODEL_ID,
          intentSummary,
          thumbnailHashes: sheet.thumbnailHashes,
          changes: execution.changes,
          decision: execution.decision,
          terminalMessage: execution.terminalMessage,
          inferenceMs: 0,
        });
        setAnalysis({
          draft,
          execution,
          rawOutput: `SCRIPTED REPLAY — expected policy calls, not Gemma output\n${JSON.stringify(calls, null, 2)}`,
          contactSheetUrl: sheet.dataUrl,
          retried: false,
        });
        setStage("diff");
      } catch (error) {
        setNotice(`Replay stopped safely: ${errorMessage(error)}`);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!audioBlob) {
      setNotice("Record or select the spoken intent before analyzing.");
      return;
    }
    if (modelState !== "ready") {
      setNotice("Prepare the local Gemma model first.");
      setStage("setup");
      return;
    }

    setBusy(true);
    setModelState("analyzing");
    setNotice(null);
    let modelRuntimeFailed = false;
    try {
      const [sheet, audio] = await Promise.all([
        createContactSheet(beforeFile, afterFile),
        decodeAudioToMono16k(audioBlob),
      ]);
      const input = { image: sheet.blob, audio };
      let modelResult = await runModel(input);
      let totalInferenceMs = modelResult.inferenceMs;
      let normalizedCalls = modelResult.toolCalls.map(({ name, arguments: args }) => ({ name, arguments: args }));
      let execution = executeToolCalls(normalizedCalls);
      let retried = false;
      if (!execution.valid) {
        retried = true;
        modelResult = await runModel(
          input,
          createToolRepairPrompt(execution.failure),
        );
        totalInferenceMs += modelResult.inferenceMs;
        normalizedCalls = modelResult.toolCalls.map(({ name, arguments: args }) => ({ name, arguments: args }));
        execution = executeToolCalls(normalizedCalls);
      }

      const draft = createPatchDraft({
        modelId: modelResult.modelId,
        intentSummary: intentSummary.trim() || "Spoken intent; audio discarded after inference.",
        thumbnailHashes: sheet.thumbnailHashes,
        changes: execution.changes,
        decision: execution.decision,
        terminalMessage: execution.terminalMessage,
        inferenceMs: totalInferenceMs,
      });
      setAnalysis({
        draft,
        execution,
        rawOutput: modelResult.rawOutput,
        contactSheetUrl: sheet.dataUrl,
        retried,
      });
      setStage("diff");
    } catch (error) {
      if (error instanceof ModelRuntimeError) {
        modelRuntimeFailed = true;
        setModelError(errorMessage(error));
      }
      setNotice(`Analysis stopped safely: ${errorMessage(error)}`);
    } finally {
      discardAudio();
      setBusy(false);
      setModelState(modelRuntimeFailed ? "error" : "ready");
    }
  }, [afterFile, audioBlob, beforeFile, discardAudio, fixtureLoaded, fixtureVariant, intentSummary, modelState, runModel]);

  const confirmCommit = useCallback(async () => {
    if (!analysis || analysis.draft.decision !== "commit_proposed" || !analysis.execution.valid) return;
    setBusy(true);
    try {
      await scenePatchRepository.saveConfirmed(
        analysis.draft,
        retainImages && beforeFile && afterFile
          ? { confirmed: true, retainImages: true, images: { before: beforeFile, after: afterFile } }
          : { confirmed: true, retainImages: false },
      );
      await refreshHistory();
      setNotice("Patch committed to this device. No application backend is involved.");
      setStage("history");
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [afterFile, analysis, beforeFile, refreshHistory, retainImages]);

  const exportHistory = useCallback(async () => {
    try {
      downloadText(`scenepatch-history-${new Date().toISOString().slice(0, 10)}.json`, await scenePatchRepository.exportJson());
      setNotice("Metadata export created. Images and audio are not included.");
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }, []);

  const importHistory = useCallback(
    async (file: File) => {
      try {
        const summary = await scenePatchRepository.importJson(await file.text());
        await refreshHistory();
        setNotice(`Imported ${summary.imported} patch${summary.imported === 1 ? "" : "es"}; skipped ${summary.skipped}.`);
      } catch (error) {
        setNotice(errorMessage(error));
      }
    },
    [refreshHistory],
  );

  const deletePatch = useCallback(
    async (id: string) => {
      try {
        await scenePatchRepository.remove(id);
        await refreshHistory();
        setNotice("Local patch deleted.");
      } catch (error) {
        setNotice(errorMessage(error));
      }
    },
    [refreshHistory],
  );

  const currentIndex = STAGES.findIndex((item) => item.id === stage);
  const modelPercent = Math.round(
    Math.min(1, Math.max(0, modelProgress?.progress ?? 0)) * 100,
  );
  const storageAvailable = compatibility?.storage?.availableBytes;
  const canAnalyze = PUBLIC_REPLAY_MODE
    ? Boolean(beforeFile && afterFile && fixtureLoaded && !busy)
    : Boolean(
        beforeFile &&
          afterFile &&
          audioBlob &&
          !recording &&
          modelState === "ready" &&
          !busy,
      );
  const statusLabel = PUBLIC_REPLAY_MODE
    ? "Replay mode"
    : modelState === "ready" || modelState === "analyzing"
      ? "Gemma ready"
      : modelState === "loading"
        ? "Loading model"
        : "Model not loaded";

  const setupPanel = (
    <section className="stage-panel setup-panel" aria-labelledby="setup-title">
      {PUBLIC_REPLAY_MODE && (
        <div className="replay-banner" role="note">
          <AlertTriangle size={19} />
          <div>
            <strong>Public fixture replay — not live inference</strong>
            <span>The release browser model missed the missing-marker gate. This Pages build replays expected policy outcomes; the official-model notebook is the executable Gemma path.</span>
          </div>
        </div>
      )}
      <div className="panel-heading">
        <div>
          <span className="kicker">01 · LOCAL MODEL</span>
          <h2 id="setup-title">{PUBLIC_REPLAY_MODE ? "Review the release gate." : "Prepare your private inference workspace."}</h2>
          <p>{PUBLIC_REPLAY_MODE ? "The browser integration remains inspectable in source, but this public build does not present it as dependable live inference." : "One first-run download. Scene analysis is designed to run inside this browser."}</p>
        </div>
        <div className={`model-orbit ${modelState === "ready" ? "is-ready" : ""}`} aria-hidden="true">
          <Cpu size={30} strokeWidth={1.5} />
          <span />
        </div>
      </div>

      <div className="setup-grid">
        <div className="compat-card">
          <div className="card-title-row">
            <div>
              <span className="micro-label">SYSTEM PREFLIGHT</span>
              <h3>{compatibility?.supported ? "This browser is ready" : modelState === "checking" ? "Inspecting this browser" : "Compatibility review"}</h3>
            </div>
            {modelState === "checking" ? <LoaderCircle className="spin" size={22} /> : compatibility?.supported ? <CheckCircle2 className="success-icon" size={22} /> : <AlertTriangle className="warning-icon" size={22} />}
          </div>
          <div className="check-list">
            {(compatibility?.checks ?? []).map((check) => (
              <div className="check-row" key={check.id}>
                <span className={`check-dot ${check.status}`}>
                  {check.status === "pass" ? <Check size={12} /> : check.status === "warn" ? "!" : <X size={12} />}
                </span>
                <div>
                  <strong>{check.label}</strong>
                  <span>{check.detail}</span>
                </div>
              </div>
            ))}
            {!compatibility && <div className="preflight-skeleton"><span /><span /><span /><span /></div>}
          </div>
          {compatibility && !compatibility.supported && (
            <button className="text-button" onClick={() => void inspectCompatibility()}>
              <RefreshCw size={15} /> Run checks again
            </button>
          )}
        </div>

        <div className="model-card">
          <div className="model-card-topline">
            <span>GEMMA 4 · E2B · Q4F16</span>
            <span className="local-pill"><LockKeyhole size={12} /> LOCAL</span>
          </div>
          <h3>{PUBLIC_REPLAY_MODE ? <>Browser gate failed.<br />Notebook path retained.</> : <>3.4 GB of capability.<br />No ScenePatch media API.</>}</h3>
          <p>{PUBLIC_REPLAY_MODE ? "The q4f16 runtime loaded and emitted native calls, but missed the owned missing-marker trial. The official Gemma checkpoint notebook is now the executable demo path." : "The public ONNX model runs through WebGPU in a dedicated worker and uses the browser cache when cache writes succeed."}</p>
          <div className="model-identity" title={`${SCENEPATCH_MODEL_ID}@${SCENEPATCH_MODEL_REVISION}`}>
            <code>{SCENEPATCH_MODEL_ID}</code>
            <span>revision {SCENEPATCH_MODEL_REVISION.slice(0, 12)}</span>
          </div>
          <div className="storage-meter" aria-label={`Model download ${modelPercent}%`}>
            <span style={{ width: `${modelState === "ready" ? 100 : modelPercent}%` }} />
          </div>
          <div className="storage-meta">
            <span><HardDrive size={14} /> {formatBytes(MODEL_Q4F16_WEIGHT_BYTES)} weights</span>
            <span>{storageAvailable ? `${formatBytes(storageAvailable)} available` : "Quota pending"}</span>
          </div>
          {modelProgress && modelState === "loading" && (
            <div className="load-message"><LoaderCircle className="spin" size={15} /> {modelProgress.message}</div>
          )}
          {modelState === "ready" && (
            <div className="load-message">
              <HardDrive size={15} />
              {compatibility?.cache.state === "complete"
                ? "Pinned cache verified"
                : "Ready in this tab; cache unverified"}
              {modelLoadMs !== null ? ` · ${formatDuration(modelLoadMs)}` : ""}
              {persistenceGranted === true
                ? " · persistent storage granted"
                : persistenceGranted === false
                  ? " · persistence not granted"
                  : ""}
            </div>
          )}
          {modelError && <div className="inline-error"><OctagonAlert size={16} /> {modelError}</div>}
          <button
            className="primary-action lime"
            onClick={() => void prepareModel()}
            disabled={PUBLIC_REPLAY_MODE || !compatibility?.supported || modelState === "loading" || modelState === "ready"}
          >
            {PUBLIC_REPLAY_MODE ? <><OctagonAlert size={18} /> Live browser inference disabled for release</> : modelState === "ready" ? <><Check size={18} /> Model ready in this tab</> : modelState === "loading" ? <><LoaderCircle className="spin" size={18} /> Preparing local model · {modelPercent}%</> : <><Zap size={18} /> Prepare Gemma 4 locally</>}
          </button>
          <button className="secondary-action" onClick={() => setStage("capture")}>
            Set up the scene first <ArrowRight size={17} />
          </button>
        </div>
      </div>
      <div className="privacy-strip">
        <ShieldCheck size={19} />
        <strong>Local-first by design</strong>
        <span>No account</span><span>No app backend</span><span>No telemetry code</span><span>Human-confirmed commits</span>
      </div>
    </section>
  );

  const imageSlot = (kind: "before" | "after", url: string | null, file: File | null) => (
    <div className={`image-slot ${url ? "has-image" : ""}`}>
      <input
        id={`scene-${kind}-input`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => setImage(kind, event.target.files?.[0] ?? null)}
      />
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`${kind === "before" ? "Before" : "After"} scene preview`} />
          <div className="image-overlay">
            <span>{kind === "before" ? "BASE" : "WORKTREE"}</span>
            <button aria-label={`Remove ${kind} image`} onClick={() => setImage(kind, null)}><X size={15} /></button>
          </div>
          <div className="file-caption">{file?.name}<span>{file ? formatBytes(file.size) : null}</span></div>
          <label className="replace-image" htmlFor={`scene-${kind}-input`}>Replace</label>
        </>
      ) : (
        <label className="empty-image" htmlFor={`scene-${kind}-input`}>
          <span><ImagePlus size={25} /></span>
          <strong>Add {kind} image</strong>
          <small>PNG, JPEG or WebP</small>
        </label>
      )}
    </div>
  );

  const capturePanel = (
    <section className="stage-panel capture-panel" aria-labelledby="capture-title">
      <div className="panel-heading capture-heading">
        <div>
          <span className="kicker">02 · CAPTURE</span>
          <h2 id="capture-title">Create a physical patch.</h2>
          <p>Keep the camera fixed. Speak only the change you intend. ScenePatch treats everything else as reviewable.</p>
        </div>
        <div className="fixture-controls" aria-label="Synthetic developer fixtures">
          {(["blocked", "clean", "uncertain"] as const).map((variant) => (
            <button key={variant} className={fixtureLoaded && fixtureVariant === variant ? "active" : ""} onClick={() => void loadFixture(variant)} disabled={busy}>
              {variant === "blocked" ? "Missing marker" : variant === "clean" ? "Corrected" : "Occluded"}
            </button>
          ))}
        </div>
      </div>

      {PUBLIC_REPLAY_MODE && (
        <div className="replay-banner compact" role="note">
          <CircleDot size={18} />
          <div><strong>Choose a labeled fixture</strong><span>The resulting ledger is a transparent scripted replay of the expected policy decision, not generated model evidence.</span></div>
        </div>
      )}

      <div className="capture-sequence">
        <div className="capture-step">
          <div className="capture-step-label"><span>1</span><div><strong>Base scene</strong><small>What exists before the change</small></div></div>
          {imageSlot("before", beforeUrl, beforeFile)}
        </div>
        <div className="sequence-arrow" aria-hidden="true"><ChevronRight /></div>
        <div className="capture-step intent-step">
          <div className="capture-step-label"><span>2</span><div><strong>Spoken intent</strong><small>Maximum {MAX_AUDIO_SECONDS} seconds</small></div></div>
          {PUBLIC_REPLAY_MODE ? (
            <div className="recorder has-audio replay-intent">
              <span className="record-button"><FileJson size={21} /></span>
              <div className="recorder-copy"><strong>Recorded fixture intent</strong><span>No audio is processed in replay mode</span></div>
              <CheckCircle2 size={21} className="success-icon" />
            </div>
          ) : (
            <>
              <div className={`recorder ${recording ? "is-recording" : audioBlob ? "has-audio" : ""}`}>
                <button className="record-button" onClick={recording ? stopRecording : () => void startRecording()} aria-label={recording ? "Stop recording" : "Record spoken intent"}>
                  {recording ? <Square size={20} fill="currentColor" /> : audioBlob ? <RefreshCw size={20} /> : <Mic size={22} />}
                </button>
                <div className="recorder-copy">
                  <strong>{recording ? "Listening…" : audioBlob ? "Intent captured" : "Record intent"}</strong>
                  <span>{recording ? `${recordingSeconds.toFixed(1)} / ${MAX_AUDIO_SECONDS}.0 seconds` : audioBlob ? "Audio is discarded after inference" : "Speak one concise authorized change"}</span>
                </div>
                {recording && <div className="waveform" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>}
                {audioBlob && !recording && <CheckCircle2 size={21} className="success-icon" />}
              </div>
              {audioUrl && <audio className="audio-preview" src={audioUrl} controls preload="metadata" />}
              {!recording && (
                <label className="secondary-action file-action audio-file-action">
                  <input
                    type="file"
                    accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg"
                    hidden
                    onChange={(event) =>
                      selectAudioFile(event.target.files?.[0] ?? null)
                    }
                  />
                  <Upload size={15} /> Choose an intent audio file
                </label>
              )}
            </>
          )}
          <label className="intent-note">
            <span>Intent note <small>{PUBLIC_REPLAY_MODE ? "fixed by the recorded fixture" : "stored with the patch; Gemma listens to audio"}</small></span>
            <textarea readOnly={PUBLIC_REPLAY_MODE} maxLength={1_000} rows={3} value={intentSummary} onChange={(event) => setIntentSummary(event.target.value)} />
          </label>
        </div>
        <div className="sequence-arrow" aria-hidden="true"><ChevronRight /></div>
        <div className="capture-step">
          <div className="capture-step-label"><span>3</span><div><strong>Changed scene</strong><small>What exists after the change</small></div></div>
          {imageSlot("after", afterUrl, afterFile)}
        </div>
      </div>

      <div className="capture-footer">
        <div className="evidence-note"><CircleDot size={15} /><span>Controlled scenes only · fixed camera · 2–6 distinct objects · non-safety-critical</span></div>
        <button className="primary-action blue" disabled={!canAnalyze} onClick={() => void analyzeScene()}>
          {busy || modelState === "analyzing" ? <><LoaderCircle className="spin" size={18} /> Building scene diff…</> : <><Sparkles size={18} /> {PUBLIC_REPLAY_MODE ? "Replay expected diff" : "Build semantic diff"}</>}
        </button>
      </div>
    </section>
  );

  const diffPanel = (
    <section className="stage-panel diff-panel" aria-labelledby="diff-title">
      <div className="panel-heading">
        <div>
          <span className="kicker">03 · SEMANTIC DIFF</span>
          <h2 id="diff-title">{analysis ? (analysis.draft.decision === "blocked" ? "This patch cannot be committed yet." : "Every recorded change matches the intent.") : "No diff yet."}</h2>
          <p>{analysis ? analysis.draft.terminalMessage : "Capture a before scene, voice intent, and after scene to create a grounded diff."}</p>
        </div>
        {analysis && (
          <div className={`decision-seal ${analysis.draft.decision}`}>
            {analysis.draft.decision === "blocked" ? <OctagonAlert size={24} /> : <GitCommitHorizontal size={24} />}
            <span>{analysis.draft.decision === "blocked" ? "BLOCKED" : "READY"}<small>{analysis.draft.changes.length} change{analysis.draft.changes.length === 1 ? "" : "s"}</small></span>
          </div>
        )}
      </div>

      {PUBLIC_REPLAY_MODE && analysis && (
        <div className="replay-banner compact" role="note">
          <AlertTriangle size={18} />
          <div><strong>Expected fixture outcome</strong><span>This ledger is scripted UI evidence. It is not a captured Gemma result and must not be reported as one.</span></div>
        </div>
      )}

      {!analysis ? (
        <div className="empty-diff">
          <div><GitCompareArrows size={38} /></div>
          <h3>Your semantic diff will appear here.</h3>
          <p>ScenePatch will never invent a successful commit when the model output is missing or malformed.</p>
          <button className="secondary-action" onClick={() => setStage("capture")}>Go to capture <ArrowRight size={16} /></button>
        </div>
      ) : (
        <div className="diff-workspace">
          <div className="contact-sheet-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={analysis.contactSheetUrl} alt={PUBLIC_REPLAY_MODE ? "Labeled before and after replay fixture" : "Labeled before and after contact sheet analyzed by Gemma 4"} />
            <div className="contact-meta">
              <span title={analysis.draft.modelId}><Cpu size={14} /> {PUBLIC_REPLAY_MODE ? "Scripted fixture replay" : "Gemma 4 E2B · q4f16 · pinned"}</span>
              <span><Clock3 size={14} /> {PUBLIC_REPLAY_MODE ? "no inference" : formatDuration(analysis.draft.inferenceMs)}</span>
              <span><LockKeyhole size={14} /> {PUBLIC_REPLAY_MODE ? "Expected policy trace" : "Local inference"}</span>
            </div>
          </div>
          <div className="change-ledger">
            <div className="ledger-header"><span>CHANGE LEDGER</span><span>CLASSIFICATION</span></div>
            {analysis.draft.changes.length ? analysis.draft.changes.map((change, index) => (
              <div className={`change-row ${change.classification}`} key={`${change.description}-${index}`}>
                <span className="diff-sign">{change.classification === "intended" ? "+" : change.classification === "unexplained" ? "!" : "?"}</span>
                <p>{change.description}</p>
                <span className="classification">{classificationLabel(change.classification)}</span>
              </div>
            )) : (
              <div className="change-row invalid"><span className="diff-sign">×</span><p>No valid change records were produced.</p><span className="classification">Fail closed</span></div>
            )}
            {analysis.execution.valid && analysis.execution.overridden && (
              <div className="kernel-override"><ShieldCheck size={16} /> Safety kernel overrode an unsafe model commit proposal.</div>
            )}
            {!analysis.execution.valid && (
              <div className="kernel-override"><ShieldCheck size={16} /> Invalid tool output was retried once, then blocked deterministically.</div>
            )}
            <details className="model-trace">
              <summary>{PUBLIC_REPLAY_MODE ? "Inspect scripted replay trace" : "Inspect raw Gemma tool trace"}</summary>
              <pre>{analysis.rawOutput || "No decodable output."}</pre>
            </details>
          </div>
        </div>
      )}

      {analysis && (
        <div className="diff-footer">
          <div className="patch-identity">
            <span>PATCH</span><code>{analysis.draft.id.slice(0, 8)}</code>
            <span>BASE</span><code>{shortHash(analysis.draft.thumbnailHashes.before)}</code>
            {analysis.retried && <em>1 constrained retry</em>}
            {PUBLIC_REPLAY_MODE && <em>scripted replay</em>}
          </div>
          <div className="diff-actions">
            {analysis.draft.decision === "blocked" ? (
              <>
                <button className="secondary-action" onClick={() => { setFixtureVariant("clean"); void loadFixture("clean"); setStage("capture"); }}><RotateCcw size={16} /> Load corrected scene</button>
                <button className="primary-action blocked" disabled><OctagonAlert size={17} /> Commit blocked</button>
              </>
            ) : (
              <>
                <label className="retain-toggle"><input type="checkbox" checked={retainImages} onChange={(event) => setRetainImages(event.target.checked)} /><span /> Keep scene images locally</label>
                <button className="primary-action lime" onClick={() => void confirmCommit()} disabled={busy}><GitCommitHorizontal size={18} /> {PUBLIC_REPLAY_MODE ? "Confirm replay commit" : "Confirm local commit"}</button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );

  const historyPanel = (
    <section className="stage-panel history-panel" aria-labelledby="history-title">
      <div className="panel-heading">
        <div>
          <span className="kicker">04 · LOCAL HISTORY</span>
          <h2 id="history-title">Confirmed by a person. Stored on this device.</h2>
          <p>Exports contain validated metadata only. Audio is never saved, and scene images never leave IndexedDB.</p>
        </div>
        <div className="history-actions">
          <label className="secondary-action file-action"><input type="file" accept="application/json" hidden onChange={(event) => event.target.files?.[0] && void importHistory(event.target.files[0])} /><Upload size={16} /> Import</label>
          <button className="primary-action blue" onClick={() => void exportHistory()} disabled={!history.length}><Download size={16} /> Export JSON</button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="empty-history">
          <span><GitCommitHorizontal size={34} /></span>
          <h3>No confirmed patches yet.</h3>
          <p>{PUBLIC_REPLAY_MODE ? "A clean scripted replay still needs your explicit confirmation before it appears here." : "A clean model proposal still needs your explicit confirmation before it appears here."}</p>
          <button className="secondary-action" onClick={() => setStage("capture")}>Create a patch <ArrowRight size={16} /></button>
        </div>
      ) : (
        <div className="history-list">
          {history.map((patch) => (
            <article className="history-item" key={patch.id}>
              <div className="commit-node"><GitCommitHorizontal size={19} /></div>
              <div className="history-main">
                <div className="history-topline">
                  <span className="commit-status"><Check size={12} /> COMMITTED</span>
                  <time>{new Date(patch.confirmedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time>
                </div>
                <h3>{patch.terminalMessage}</h3>
                <p>{patch.intentSummary}</p>
                <div className="history-changes">
                  {patch.changes.map((change, index) => <span key={`${change.description}-${index}`}>+ {change.description}</span>)}
                </div>
                <div className="history-meta"><code>{patch.id.slice(0, 8)}</code><span>{patch.changes.length} staged</span><span>{formatDuration(patch.inferenceMs)}</span><span>{patch.retainedImages ? "images local" : "metadata only"}</span></div>
                <details className="history-proof">
                  <summary>Inspect model and hashes</summary>
                  <code>{patch.modelId}</code>
                  <span>before {patch.thumbnailHashes.before}</span>
                  <span>after {patch.thumbnailHashes.after}</span>
                </details>
              </div>
              <button className="icon-button danger" aria-label="Delete local patch" onClick={() => void deletePatch(patch.id)}><Trash2 size={17} /></button>
            </article>
          ))}
        </div>
      )}
      <div className="history-integrity"><FileJson size={18} /><div><strong>Portable, inspectable history</strong><span>Every export is schema-versioned and rejects malformed or duplicate records on import.</span></div></div>
    </section>
  );

  const panel = stage === "setup" ? setupPanel : stage === "capture" ? capturePanel : stage === "diff" ? diffPanel : historyPanel;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setStage("setup")} aria-label="ScenePatch home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>Scene<strong>Patch</strong></span>
        </button>
        <div className="topbar-center"><span>LOCAL FRONTIER INNOVATION</span><i /> <span>BUILT WITH GEMMA 4</span></div>
        <div className="topbar-status">
          <span className={online ? "is-online" : "is-offline"}>{online ? <Wifi size={14} /> : <WifiOff size={14} />}{online ? "ONLINE" : "OFFLINE"}</span>
          <span className={modelState === "ready" || modelState === "analyzing" ? "is-ready" : ""}><CircleDot size={14} /> {statusLabel}</span>
        </div>
      </header>

      <section className="masthead">
        <div className="masthead-copy">
          <span className="eyebrow"><span>SEMANTIC CHANGE CONTROL</span><i /></span>
          <h1>Commit the change you meant.<br /><em>Block the one you didn’t.</em></h1>
          <p>{PUBLIC_REPLAY_MODE ? "ScenePatch demonstrates semantic change control through transparent fixture replays; the repository notebook contains the executable Gemma path." : "ScenePatch compares a physical before-and-after with your spoken intent using on-device Gemma inference."}</p>
        </div>
        <div className="masthead-proof">
          <div><span>01</span><p><strong>See</strong>One contact sheet</p></div>
          <div><span>02</span><p><strong>Listen</strong>One spoken intent</p></div>
          <div><span>03</span><p><strong>Gate</strong>One human commit</p></div>
        </div>
      </section>

      <div className="product-frame">
        <nav className="stage-nav" aria-label="ScenePatch stages">
          {STAGES.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.id === stage;
            const isPast = index < currentIndex;
            return (
              <button className={`${isActive ? "active" : ""} ${isPast ? "past" : ""}`} key={item.id} onClick={() => setStage(item.id)} aria-current={isActive ? "step" : undefined}>
                <span className="stage-index">{isPast ? <Check size={13} /> : item.index}</span>
                <Icon size={18} />
                <span className="stage-copy"><strong>{item.label}</strong><small>{item.note}</small></span>
                {isActive && <ChevronRight className="stage-chevron" size={17} />}
              </button>
            );
          })}
          <div className="nav-footnote"><CloudOff size={16} /><span><strong>Local-first mode</strong>No ScenePatch media backend.</span></div>
        </nav>
        <div className="panel-container">{panel}</div>
      </div>

      <footer className="site-footer">
        <span>ScenePatch · Controlled creative setups only</span>
        <span><ShieldCheck size={14} /> Deterministic commit kernel</span>
        <span>{PUBLIC_REPLAY_MODE ? "Fixture replay · Gemma notebook · Apache-2.0" : "Gemma 4 E2B · WebGPU · Apache-2.0"}</span>
      </footer>

      {notice && (
        <div className="toast" role="status">
          <span><CircleDot size={15} /></span><p>{notice}</p><button aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={15} /></button>
        </div>
      )}
    </main>
  );
}
