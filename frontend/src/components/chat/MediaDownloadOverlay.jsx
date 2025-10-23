import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_ACCENT = "#25D366"; // WhatsApp green

const CIRCLE_SIZE = 56;
const STROKE_WIDTH = 4;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const getDownloadedKey = (key) => `chat_media_downloaded:${key}`;

function useObjectUrl(blob) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);
  return url;
}

function MediaDownloadOverlay({
  mediaUrl,
  type,
  blurHashDataUrl,
  accent = DEFAULT_ACCENT,
  onReady,
  isSender = false,
  isReceiver = false,
  disabled = false,
  uploadProgressPercent = null,
  persistenceKey,
}) {
  const persistedKey = useMemo(
    () => persistenceKey || mediaUrl,
    [mediaUrl, persistenceKey]
  );

  // idle → uploading → downloading → ready → error
  const [state, setState] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [indeterminate, setIndeterminate] = useState(false);
  const [error, setError] = useState(null);
  const [blob, setBlob] = useState(null);
  const blobUrl = useObjectUrl(blob);
  const downloadedOnceRef = useRef(false);

  const isDownloadedPersisted = useMemo(() => {
    try {
      return localStorage.getItem(getDownloadedKey(persistedKey)) === "1";
    } catch {
      return false;
    }
  }, [persistedKey]);

  const markDownloaded = useCallback(() => {
    try {
      localStorage.setItem(getDownloadedKey(persistedKey), "1");
    } catch {}
  }, [persistedKey]);

  // Sender: reflect upload progress and disable controls until complete
  useEffect(() => {
    if (isSender) {
      if (typeof uploadProgressPercent === "number") {
        if (uploadProgressPercent < 100) {
          setState("uploading");
          setProgress(Math.max(0, Math.min(100, uploadProgressPercent)));
        } else {
          setProgress(100);
          const t = setTimeout(() => setState("ready"), 250);
          return () => clearTimeout(t);
        }
      } else {
        setState("ready");
      }
    }
  }, [isSender, uploadProgressPercent]);

  // Receiver: if previously downloaded, skip overlay
  useEffect(() => {
    if (isReceiver && isDownloadedPersisted) {
      setState("ready");
    }
  }, [isReceiver, isDownloadedPersisted]);

  // Notify parent when ready with blob URL
  useEffect(() => {
    if (state === "ready" && blobUrl && onReady && !downloadedOnceRef.current) {
      downloadedOnceRef.current = true;
      onReady(blobUrl);
    }
  }, [state, blobUrl, onReady]);

  const startDownload = useCallback(async () => {
    if (disabled || state === "downloading" || state === "ready") return;
    setError(null);
    setState("downloading");
    setProgress(0);

    try {
      const response = await fetch(mediaUrl, {
        mode: "cors",
        credentials: "omit",
      });
      if (!response.ok || !response.body) {
        throw new Error(`Failed to fetch media: ${response.status}`);
      }

      const contentLengthHeader = response.headers.get("Content-Length");
      const total = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      const reader = response.body.getReader();

      setIndeterminate(!total);

      const chunks = [];
      let received = 0;

      let frameRequested = false;
      const updateProgress = (val) => {
        if (!frameRequested) {
          frameRequested = true;
          requestAnimationFrame(() => {
            setProgress(val);
            frameRequested = false;
          });
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (total) updateProgress(Math.round((received / total) * 100));
        }
      }

      const lower = (mediaUrl || "").toLowerCase();
      let mime = "application/octet-stream";
      if (/\.(jpg|jpeg|png|gif|webp|bmp|tiff)(\?.*)?$/.test(lower)) mime = "image/jpeg";
      else if (/\.(mp4)(\?.*)?$/.test(lower)) mime = "video/mp4";
      else if (/\.(webm)(\?.*)?$/.test(lower)) mime = "video/webm";

      const assembled = new Blob(chunks, { type: mime });
      setBlob(assembled);
      setState("ready");
      markDownloaded();
    } catch (e) {
      console.error(e);
      setError(e?.message || "Download failed");
      setState("error");
    }
  }, [disabled, mediaUrl, markDownloaded, state]);

  // Retry with exponential backoff
  const retryRef = useRef({ attempts: 0, timer: 0 });
  const handleRetry = useCallback(async () => {
    if (retryRef.current.timer) clearTimeout(retryRef.current.timer);
    const attempt = retryRef.current.attempts + 1;
    retryRef.current.attempts = attempt;
    const delay = Math.min(2000 * Math.pow(2, attempt - 1), 6000);
    retryRef.current.timer = setTimeout(startDownload, delay);
  }, [startDownload]);

  useEffect(() => {
    return () => {
      if (retryRef.current.timer) clearTimeout(retryRef.current.timer);
    };
  }, []);

  const showOverlay = useMemo(() => {
    if (disabled) return false;
    if (isSender) return state === "uploading";
    if (isReceiver) return state !== "ready";
    return false;
  }, [disabled, isSender, isReceiver, state]);

  const ringOffset = useMemo(() => {
    const pct = Math.max(0, Math.min(100, progress || 0));
    return CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
  }, [progress]);

  const containerStyle = useMemo(
    () => ({
      position: "relative",
      borderRadius: 12,
      overflow: "hidden",
      width: "100%",
      aspectRatio: "4 / 5",
      background: "#f3f4f6",
    }),
    []
  );

  const overlayStyle = useMemo(
    () => ({
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: isSender
        ? "rgba(0,0,0,0.25)"
        : state === "idle"
        ? "rgba(0,0,0,0.35)"
        : state === "downloading"
        ? "rgba(0,0,0,0.35)"
        : state === "error"
        ? "rgba(0,0,0,0.45)"
        : "transparent",
      transition: "opacity 200ms ease, transform 200ms ease",
    }),
    [isSender, state]
  );

  const progressTextStyle = useMemo(
    () => ({
      position: "absolute",
      color: "white",
      fontWeight: 600,
      fontSize: 12,
    }),
    []
  );

  const shouldShowPlay = type === "video" && state === "ready";
  const mediaSrc = state === "ready"
    ? (blobUrl || mediaUrl)
    : isSender
    ? mediaUrl
    : blurHashDataUrl || undefined;

  // Accessibility: keyboard activation
  const onKeyDown = (e) => {
    if (!isReceiver) return;
    if (state === "ready") return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (state === "idle" || state === "error") startDownload();
    }
  };

  return (
    <div style={containerStyle} className="media-overlay-container">
      {type === "image" && mediaSrc ? (
        <img
          src={mediaSrc}
          alt="media"
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: isReceiver && state !== "ready" ? "blur(12px)" : undefined, transform: isReceiver && state !== "ready" ? "scale(1.06)" : undefined, transition: "filter 250ms ease, transform 250ms ease" }}
          draggable={false}
        />
      ) : null}
      {type === "video" && mediaSrc ? (
        <video
          src={mediaSrc}
          controls={shouldShowPlay}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: isReceiver && state !== "ready" ? "blur(12px)" : undefined, transform: isReceiver && state !== "ready" ? "scale(1.06)" : undefined, transition: "filter 250ms ease, transform 250ms ease" }}
          preload={isSender ? "metadata" : "none"}
          playsInline
        />
      ) : null}
      {type === "doc" && (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg, rgba(0,0,0,0.04), rgba(0,0,0,0.09))",
            filter: isReceiver && state !== "ready" ? "blur(8px)" : undefined,
            transform: isReceiver && state !== "ready" ? "scale(1.02)" : undefined,
            transition: "filter 250ms ease, transform 250ms ease",
          }}
        >
          <span style={{ fontSize: 14, color: "#111827", opacity: 0.85 }}>
            Document
          </span>
        </div>
      )}

      {showOverlay && (
        <div
          style={overlayStyle}
          role={isReceiver ? "button" : undefined}
          aria-label={isReceiver ? "Download media" : undefined}
          tabIndex={isReceiver ? 0 : -1}
          onKeyDown={onKeyDown}
          onClick={() => {
            if (isReceiver) {
              if (state === "idle") startDownload();
              if (state === "error") handleRetry();
            }
          }}
        >
          <div style={{ position: "relative" }} aria-valuemin={0} aria-valuemax={100} aria-valuenow={indeterminate ? undefined : progress}>
            <svg
              width={CIRCLE_SIZE}
              height={CIRCLE_SIZE}
              viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}
              className={indeterminate ? "media-ring-indeterminate" : undefined}
              style={{ display: "block" }}
            >
              <circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              <circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke={accent}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={indeterminate ? CIRCUMFERENCE * 0.7 : ringOffset}
                style={{
                  transition: indeterminate ? undefined : "stroke-dashoffset 120ms linear",
                  transformOrigin: "center",
                }}
              />
            </svg>
            {!indeterminate && (
              <div style={progressTextStyle}>{`${Math.max(0, Math.min(100, progress)).toFixed(0)}%`}</div>
            )}
            {indeterminate && isReceiver && state === "idle" && (
              <div style={{ ...progressTextStyle, opacity: 0.9 }}>Download</div>
            )}
          </div>
        </div>
      )}

      {state === "error" && isReceiver && (
        <div
          style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <button
            onClick={handleRetry}
            style={{
              padding: "6px 12px",
              borderRadius: 9999,
              background: accent,
              color: "white",
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default MediaDownloadOverlay;
