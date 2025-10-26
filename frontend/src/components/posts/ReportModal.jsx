import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiFlag, FiCheck } from "react-icons/fi";
import { toast } from "react-toastify";
import axios from "axios";

const ReportModal = ({ post, onClose, onReported }) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorShake, setErrorShake] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const selectRef = useRef(null);

  const reasons = [
    "Spam",
    "Harassment",
    "Misinformation",
    "Inappropriate Content",
    "Other",
  ];

  useEffect(() => {
    // Focus management for accessibility: focus on the reason select on mount
    if (selectRef.current) {
      selectRef.current.focus();
    }
  }, []);

  const handleSubmit = async () => {
    if (!reason) {
      setErrorShake(true);
      setTimeout(() => setErrorShake(false), 500);
      toast.error("Please select a reason for reporting");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to report this post? This action cannot be undone."
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await axios.post(
        `/api/posts/${post._id}/report`,
        { reason, description },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success(
        "Thank you for reporting this post. Our team will review it shortly."
      );
      setShowSuccess(true);
      setTimeout(() => {
        onReported && onReported();
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error reporting post:", error);
      toast.error("Failed to report post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h3 id="report-modal-title" className="font-semibold text-lg">
                Report Post
              </h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close report modal"
              >
                <FiX />
              </button>
            </div>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            {/* Post Preview */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">
                Post by {post.user?.name || "Unknown"}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {post.content || "No content"}
              </p>
            </div>

            {/* Reason Selection */}
            <div className="mb-6">
              <label
                htmlFor="report-reason"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Reason for reporting *
              </label>
              <motion.select
                id="report-reason"
                ref={selectRef}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                animate={{ x: errorShake ? [-10, 10, -10, 10, 0] : 0 }}
                transition={{ duration: 0.5 }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                aria-required="true"
              >
                <option value="">Select a reason</option>
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </motion.select>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label
                htmlFor="report-description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Additional details (optional)
              </label>
              <textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide more details about why you're reporting this post..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none resize-none"
                rows={3}
                maxLength={500}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                aria-label="Cancel reporting"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  reason && !submitting
                    ? "bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                aria-label="Submit report"
              >
                <FiFlag />
                {submitting ? "Reporting..." : "Report Post"}
              </motion.button>
            </div>
          </div>

          {/* Success Overlay */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 bg-white rounded-2xl flex items-center justify-center z-10"
              >
                <FiCheck className="text-green-500 text-4xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReportModal;
