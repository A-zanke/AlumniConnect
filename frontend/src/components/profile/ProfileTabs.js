import React from 'react';

const TabButton = ({ id, activeId, onClick, children }) => (
  <button
    onClick={() => onClick(id)}
    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
      activeId === id
        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200'
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
    }`}
  >
    {children}
  </button>
);

const ProfileTabs = ({ tabs, activeId, onChange }) => {
  return (
    <div className="bg-white/60 dark:bg-gray-900/60 rounded-3xl shadow-xl p-2 md:p-4 border border-indigo-100 dark:border-gray-800">
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(t => (
          <TabButton key={t.id} id={t.id} activeId={activeId} onClick={onChange}>{t.label}</TabButton>
        ))}
      </div>
      <div className="mt-2">
        {tabs.find(t => t.id === activeId)?.content}
      </div>
    </div>
  );
};

export default ProfileTabs;

