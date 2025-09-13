import React, { useEffect, useState } from 'react';

const DarkModeToggle = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('dark-mode') === 'true';
    setEnabled(stored);
    document.documentElement.classList.toggle('dark', stored);
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('dark-mode', String(next));
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {enabled ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
};

export default DarkModeToggle;

