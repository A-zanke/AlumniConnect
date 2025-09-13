import React from 'react';

const SkillsBadges = ({ skills }) => {
  if (!skills || skills.length === 0) return null;
  return (
    <div className="rounded-2xl shadow bg-white dark:bg-gray-900">
      <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
        <h3 className="text-lg font-semibold">Skills</h3>
      </div>
      <div className="p-6">
        <div className="flex flex-wrap gap-2">
          {skills.map((s, i) => (
            <span key={`${s}-${i}`} className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 dark:from-indigo-900/40 dark:to-purple-900/40 dark:text-indigo-100 rounded-full text-sm font-medium">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkillsBadges;

