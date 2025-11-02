import React, { useState } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

const MediaCarousel = ({ media }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullScreen, setShowFullScreen] = useState(false);

  if (!Array.isArray(media) || media.length === 0) {
    return null;
  }

  const currentMedia = media[currentIndex];
  const hasMultiple = media.length > 1;

  const changeIndex = (next) => {
    setCurrentIndex((prev) => {
      const nextIndex = prev + next;
      if (nextIndex < 0) return media.length - 1;
      if (nextIndex >= media.length) return 0;
      return nextIndex;
    });
  };

  const FullScreenViewer = () => (
    <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center">
      <button
        onClick={() => setShowFullScreen(false)}
        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors"
        aria-label="Close media viewer"
      >
        <FiX className="w-6 h-6 text-white" />
      </button>

      {currentMedia?.type === "video" ? (
        <video
          src={currentMedia.url}
          controls
          className="max-w-full max-h-full"
          autoPlay
        />
      ) : (
        <img
          src={currentMedia?.url}
          alt="Full size media"
          className="max-w-full max-h-full object-contain"
        />
      )}

      {hasMultiple && (
        <>
          <button
            onClick={() => changeIndex(-1)}
            className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 p-3 rounded-full transition-colors"
            aria-label="Previous media"
          >
            <FiChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => changeIndex(1)}
            className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 p-3 rounded-full transition-colors"
            aria-label="Next media"
          >
            <FiChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}

      {hasMultiple && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white text-sm">
          {currentIndex + 1} / {media.length}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="relative bg-slate-900 rounded-xl overflow-hidden">
        {currentMedia?.type === "video" ? (
          <video
            src={currentMedia.url}
            controls
            className="w-full max-h-[500px] object-contain"
          />
        ) : (
          <img
            src={currentMedia?.url}
            alt="Post media"
            onClick={() => setShowFullScreen(true)}
            className="w-full max-h-[500px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
          />
        )}

        {hasMultiple && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                changeIndex(-1);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white p-2 rounded-full transition-colors"
              aria-label="Previous media"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                changeIndex(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white p-2 rounded-full transition-colors"
              aria-label="Next media"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
              {media.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentIndex ? "bg-white" : "bg-white/50"
                  }`}
                  aria-label={`Go to media ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showFullScreen && <FullScreenViewer />}
    </>
  );
};

export default MediaCarousel;
