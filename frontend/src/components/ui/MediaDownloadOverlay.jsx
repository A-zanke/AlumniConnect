import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./MediaDownloadOverlay.css";

const WHATSAPP_GREEN = "#25D366";

function ProgressRing({ size = 60, stroke = 6, progress = 0, indeterminate = false, accent = WHATSAPP_GREEN, labelledby, valueNow }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = useMemo(() => {
    const pct = Math.max(0, Math.min(100, progress));
    return circumference - (pct / 100) * circumference;
  }, [progress, circumference]);

  return (
    <div className={`ring ${indeterminate ? "ring-indeterminate" : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={valueNow ?? Math.round(progress)} aria-labelledby={labelledby}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="bg" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="transparent" />
        <circle className="progress" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} stroke={accent} strokeLinecap="round" fill="transparent" strokeDasharray={circumference} strokeDashoffset={indeterminate ? undefined : dashOffset} />
      </svg>
    </div>
  );
}

export default function MediaDownloadOverlay({
  mediaUrl,
  type,
  blurHashDataUrl,
  accent = WHATSAPP_GREEN,
  onReady,
  isSender = false,
  isReceiver = false,
  disabled = false,
  externalProgress,
}) {
  const [state, setState] = useState("idle"); // idle | uploading | downloading | ready | error
  const [progress, setProgress] = useState(0);
  const [objectUrl, setObjectUrl] = useState(null);
  const [downloadedBlob, setDownloadedBlob] = useState(null);
  const [overlayGone, setOverlayGone] = useState(false);
  const abortRef = useRef(null);
  const overlayId = useRef(`overlay_${Math.random().toString(36).slice(2)}`).current;
  const prevIsSender = useRef(isSender);

  // Persist simple downloaded state in-memory per URL to skip overlay later
  const isDownloadedKey = useMemo(() => `dl:${mediaUrl}`, [mediaUrl]);

  const cleanupObjectUrl = useCallback(() => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }, [objectUrl]);

  useEffect(() => {
    return () => {
      cleanupObjectUrl();
      if (abortRef.current) abortRef.current.abort();
    };
  }, [cleanupObjectUrl]);

  // Derive a lightweight blurred preview for Cloudinary images (receiver idle state)
  const previewUrl = useMemo(() => {
    try {
      if (!mediaUrl) return null;
      if (type !== "image") return null;
      // Only apply for Cloudinary URLs
      if (mediaUrl.includes("/upload/")) {
        const parts = mediaUrl.split("/upload/");
        if (parts.length === 2) {
          return `${parts[0]}/upload/c_fill,w_600,q_20,e_blur:200/${parts[1]}`;
        }
      }
      return null;
    } catch {
      return null;
    }
  }, [mediaUrl, type]);

  useEffect(() => {
    if (!mediaUrl) return;
    const downloaded = localStorage.getItem(isDownloadedKey) === "1";
    if (downloaded) {
      setState("ready");
      setProgress(100);
      setOverlayGone(true);
      return;
    }
    if (isSender) {
      // Sender sees clear media with loader overlay only
      setState("uploading");
      setOverlayGone(false);
      return;
    }
    if (isReceiver) {
      // Receiver should tap to download
      setState("idle");
      setOverlayGone(false);
      return;
    }
    // Not receiver (i.e., it's my already-sent message): show sharp immediately
    setState("ready");
    setOverlayGone(true);
  }, [mediaUrl, isSender, isReceiver, isDownloadedKey]);

  // When sender upload completes (parent toggles isSender false), finalize overlay
  useEffect(() => {
    if (prevIsSender.current && !isSender) {
      setProgress(100);
      setState("ready");
      setTimeout(() => setOverlayGone(true), 200);
    }
    prevIsSender.current = isSender;
  }, [isSender]);

  // Allow parent to reflect upload progress via prop or CustomEvent
  const rootRef = useRef(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const handler = (e) => {
      if (e?.detail?.type === "uploadProgress") {
        setState("uploading");
        setProgress(Math.max(0, Math.min(100, Number(e.detail.value) || 0)));
        if (e.detail.value >= 100) {
          // Smooth fade-out
          setTimeout(() => {
            setOverlayGone(true);
            setState("ready");
          }, 250);
        }
      }
    };
    el.addEventListener("mediaOverlay:update", handler);
    return () => el.removeEventListener("mediaOverlay:update", handler);
  }, []);

  useEffect(() => {
    if (typeof externalProgress === "number") {
      setState("uploading");
      setProgress(Math.max(0, Math.min(100, externalProgress)));
      if (externalProgress >= 100) {
        setTimeout(() => {
          setOverlayGone(true);
          setState("ready");
        }, 250);
      }
    }
  }, [externalProgress]);

  const startDownload = useCallback(async () => {
    if (disabled || state === "downloading" || state === "ready") return;
    try {
      setState("downloading");
      setOverlayGone(false);
      setProgress(0);
      const controller = new AbortController();
      abortRef.current = controller;
      const resp = await fetch(mediaUrl, { signal: controller.signal, mode: "cors", credentials: "omit" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const reader = resp.body && resp.body.getReader ? resp.body.getReader() : null;
      const contentLength = Number(resp.headers.get("Content-Length")) || 0;
      const chunks = [];
      let received = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length || value.byteLength || 0;
          }
          if (contentLength) {
            const pct = Math.round((received / contentLength) * 100);
            setProgress(pct);
          }
        }
      } else {
        // Fallback when stream isn't available
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
        setProgress(100);
        setState("ready");
        sessionStorage.setItem(isDownloadedKey, "1");
        onReady && onReady(url);
        setTimeout(() => setOverlayGone(true), 200);
        return;
      }

      const blob = new Blob(chunks);
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);
      setDownloadedBlob(blob);
      setState("ready");
      setProgress(100);
      localStorage.setItem(isDownloadedKey, "1");
      onReady && onReady(url);
      setTimeout(() => setOverlayGone(true), 200);
    } catch (e) {
      if (e.name === "AbortError") return;
      setState("error");
    }
  }, [disabled, mediaUrl, onReady, state, isDownloadedKey]);

  // Retry with backoff up to 3 times
  const retryDownload = useCallback(async () => {
    let attempt = 0;
    while (attempt < 3) {
      try {
        await startDownload();
        if (state === "ready") return;
        break;
      } catch {}
      attempt += 1;
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
    }
  }, [startDownload, state]);

  const mediaContent = useMemo(() => {
    const transparent = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    // Sender: always show actual mediaUrl (sharp), overlay shows progress
    // Receiver: blur until ready, then sharp blob/url
    const src = isSender
      ? mediaUrl
      : (objectUrl || (isReceiver && state !== "ready" ? (blurHashDataUrl || previewUrl || transparent) : mediaUrl));
    if (type === "image") {
      return (
        <img
          src={src}
          alt="media"
          className={isReceiver ? (state === "ready" ? "media-sharp" : "media-blur") : "media-sharp"}
          crossOrigin="anonymous"
        />
      );
    }
    if (type === "video") {
      if (state === "ready" || isSender) {
        return (
          <video
            src={src}
            className="media-sharp"
            controls={true}
            preload="metadata"
            crossOrigin="anonymous"
          />
        );
      }
      // Receiver pre-download: show blurred placeholder with play hint
      return (
        <div className="doc-tile media-blur">
          <span className="doc-name">Video</span>
        </div>
      );
    }
    // docs
    const name = (() => {
      try {
        const u = new URL(mediaUrl, window.location.origin);
        return decodeURIComponent(u.pathname.split("/").pop() || "Document");
      } catch {
        return "Document";
      }
    })();
    return state === "ready" && (objectUrl || mediaUrl) ? (
      <a href={objectUrl || mediaUrl} target="_blank" rel="noreferrer" className="doc-tile">
        <span className="doc-name">{name}</span>
      </a>
    ) : (
      <div className="doc-tile media-blur">
        <span className="doc-name">{name}</span>
      </div>
    );
  }, [type, mediaUrl, objectUrl, state, isSender, isReceiver, previewUrl, blurHashDataUrl]);

  const showOverlay = useMemo(() => {
    if (overlayGone) return false;
    if (isSender) return state === "uploading" && progress < 100;
    if (isReceiver) return state !== "ready"; // idle, downloading, error
    return false;
  }, [overlayGone, isSender, isReceiver, state, progress]);

  const indeterminate = !progress || progress <= 0;

  return (
    <div ref={rootRef} className="media-tile">
      {mediaContent}
      {showOverlay && (
        <div className={`overlay-center ${overlayGone ? "overlay-fade-out" : ""}`}>
          {(state === "idle" || state === "error") && isReceiver && (
            <button
              type="button"
              className="flex items-center justify-center relative"
              onClick={state === "error" ? retryDownload : startDownload}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") (state === "error" ? retryDownload() : startDownload());
              }}
              role="button"
              aria-label={state === "error" ? "Retry download" : "Download media"}
              aria-labelledby={overlayId}
              disabled={disabled}
              style={{
                width: 72,
                height: 72,
                borderRadius: 9999,
                background: WHATSAPP_GREEN,
                boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v10m0 0l-4-4m4 4l4-4M5 21h14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span id={overlayId} className="sr-only">{state === "error" ? "Retry download" : "Download media"}</span>
            </button>
          )}

          {state === "downloading" && (
            <div className="flex flex-col items-center gap-2">
              <ProgressRing size={72} stroke={6} progress={progress} indeterminate={indeterminate} accent={WHATSAPP_GREEN} />
              {!indeterminate && (
                <div className="text-white text-sm font-semibold">{Math.max(0, Math.min(100, progress))}%</div>
              )}
            </div>
          )}

          {state === "uploading" && (
            <div className="flex flex-col items-center gap-2">
              <ProgressRing size={64} stroke={6} progress={progress} indeterminate={indeterminate} accent={accent} />
              {!indeterminate && (
                <div className="text-white text-sm font-semibold">{Math.max(0, Math.min(100, progress))}%</div>
              )}
            </div>
          )}
        </div>
      )}
      {state === "ready" && (
        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            onClick={async () => {
              try {
                if (downloadedBlob && navigator.canShare && navigator.canShare({ files: [new File([downloadedBlob], "media", { type: downloadedBlob.type || "application/octet-stream" })] })) {
                  const file = new File([downloadedBlob], `media.${(downloadedBlob.type || "octet").split("/")[1] || "bin"}`, { type: downloadedBlob.type || "application/octet-stream" });
                  await navigator.share({ files: [file], title: "Share media" });
                } else if (objectUrl) {
                  await navigator.clipboard.writeText(mediaUrl);
                }
              } catch {}
            }}
            aria-label="Share media"
            style={{ background: "rgba(0,0,0,0.45)", color: "white" }}
            className="px-2 py-1 rounded"
            title="Share"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 6l-4-4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 2v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
