import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

const AvatarPreviewContext = createContext({
  open: () => {},
  close: () => {},
});

export const useAvatarPreview = () => useContext(AvatarPreviewContext);

export const AvatarPreviewProvider = ({ children }) => {
  const [previewSrc, setPreviewSrc] = useState(null);

  const close = useCallback(() => setPreviewSrc(null), []);
  const open = useCallback((src) => {
    if (src) setPreviewSrc(src);
  }, []);

  useEffect(() => {
    const handleClick = (event) => {
      const target = event.target.closest("[data-avatar-src]");
      if (!target) return;
      const src = target.getAttribute("data-avatar-src");
      if (!src) return;
      event.preventDefault();
      open(src);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [close]);

  return (
    <AvatarPreviewContext.Provider value={{ open, close }}>
      {children}
      <AnimatePresence>
        {previewSrc && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              className="relative max-w-full max-h-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={previewSrc}
                alt="Profile avatar preview"
                className="max-h-[85vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
              />
              <button
                type="button"
                onClick={close}
                className="absolute -top-3 -right-3 rounded-full bg-white text-slate-700 shadow-lg px-3 py-1 text-sm font-semibold"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AvatarPreviewContext.Provider>
  );
};
