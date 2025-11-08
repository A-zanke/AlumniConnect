import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiCommand } from 'react-icons/fi';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const commands = [
    { label: 'Dashboard', path: '/admin', keywords: ['home', 'overview'] },
    { label: 'Users', path: '/admin/users', keywords: ['members', 'people'] },
    { label: 'Events', path: '/admin/events', keywords: ['calendar'] },
    { label: 'Forum Analytics', path: '/admin/forum', keywords: ['stats'] },
    { label: 'Forum Management', path: '/admin/forum/manage', keywords: ['posts'] },
    { label: 'Posts Analytics', path: '/admin/posts', keywords: ['stats'] },
    { label: 'Posts Management', path: '/admin/posts/manage', keywords: ['content'] },
    { label: 'Reports', path: '/admin/reports', keywords: ['flags', 'moderation'] },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.keywords.some((k) => k.includes(search.toLowerCase()))
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (path) => {
    navigate(path);
    setIsOpen(false);
    setSearch('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20">
      <div className="w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-700 px-4 py-3">
          <FiSearch className="text-slate-400" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-white placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          <kbd className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd) => (
              <button
                key={cmd.path}
                onClick={() => handleSelect(cmd.path)}
                className="w-full rounded-lg px-4 py-3 text-left text-white hover:bg-slate-800"
              >
                {cmd.label}
              </button>
            ))
          )}
        </div>

        <div className="border-t border-slate-700 px-4 py-2 text-xs text-slate-400">
          <kbd className="rounded bg-slate-800 px-1.5 py-0.5">
            <FiCommand size={10} className="inline" /> K
          </kbd>{' '}
          to open
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
