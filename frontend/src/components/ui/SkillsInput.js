import React, { useMemo, useRef, useState } from 'react';

const DEFAULT_SUGGESTIONS = [
	'Python','SQL','Data Science','Machine Learning','Deep Learning','NLP',
	'Web Development','Frontend','Backend','Full Stack','MongoDB','PostgreSQL',
	'Data Engineering','Cloud Computing','AWS','Azure','GCP','AI','Cybersecurity',
	'JavaScript','TypeScript','React','Next.js','Node.js','Express','D3.js',
	'Docker','Kubernetes','DevOps','MLOps','CI/CD','GraphQL','REST','Redux',
	'Tailwind CSS','CSS','HTML','Git','Linux','ETL','Power BI','Tableau'
];

const normalize = (v) => String(v || '').trim();

const SkillsInput = ({
	label = 'Skills',
	value = [],
	onChange,
	placeholder = 'Type a skill and press Enter',
	suggestions = DEFAULT_SUGGESTIONS,
	maxTags = 20
}) => {
	const [input, setInput] = useState('');
	const [focused, setFocused] = useState(false);
	const inputRef = useRef(null);

	const tags = Array.isArray(value) ? value : [];

	const renderedSuggestions = useMemo(() => {
		const q = input.toLowerCase().trim();
		if (!q) return suggestions.slice(0, 8);
		return suggestions
			.filter(s => s.toLowerCase().includes(q))
			.filter(s => !tags.map(t => t.toLowerCase()).includes(s.toLowerCase()))
			.slice(0, 8);
	}, [input, suggestions, tags]);

	const addTag = (tag) => {
		const t = normalize(tag);
		if (!t) return;
		if (tags.length >= maxTags) return;
		if (tags.some(existing => existing.toLowerCase() === t.toLowerCase())) return;
		onChange?.([...tags, t]);
		setInput('');
	};

	const removeTag = (idx) => {
		const next = tags.filter((_, i) => i !== idx);
		onChange?.(next);
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			addTag(input);
		} else if (e.key === 'Backspace' && !input && tags.length) {
			removeTag(tags.length - 1);
		}
	};

	return (
		<div className="w-full">
			{label && (
				<label className="block text-sm font-semibold text-gray-700 mb-2">
					{label}
				</label>
			)}
			<div
				className={`w-full rounded-xl border ${focused ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200'} bg-white px-3 py-2 transition-all`}
				onClick={() => inputRef.current?.focus()}
			>
				<div className="flex flex-wrap gap-2">
					{tags.map((tag, idx) => (
						<div key={`${tag}-${idx}`} className="flex items-center bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-sm">
							<span>{tag}</span>
							<button
								type="button"
								onClick={() => removeTag(idx)}
								className="ml-2 text-indigo-500 hover:text-indigo-700 transition-colors"
								aria-label="Remove"
							>
								×
							</button>
						</div>
					))}
					<input
						ref={inputRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						onFocus={() => setFocused(true)}
						onBlur={() => setFocused(false)}
						placeholder={tags.length ? '' : placeholder}
						className="flex-1 min-w-[160px] py-1 outline-none text-gray-800 placeholder-gray-400"
					/>
				</div>
			</div>

			{focused && renderedSuggestions.length > 0 && (
				<div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
					{renderedSuggestions.map((s) => (
						<button
							type="button"
							key={s}
							onMouseDown={(e) => {
								e.preventDefault();
								addTag(s);
							}}
							className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors"
						>
							{s}
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default SkillsInput;
