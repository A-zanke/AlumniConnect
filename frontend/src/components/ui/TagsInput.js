import React, { useMemo, useRef, useState } from 'react';

const normalize = (value) => String(value || '').trim();

const TagsInput = ({
	label = 'Tags',
	value = [],
	onChange,
	placeholder = 'Type and press Enter or comma',
	maxTags = 50,
	chipColor = 'indigo'
}) => {
	const [input, setInput] = useState('');
	const [focused, setFocused] = useState(false);
	const inputRef = useRef(null);

	const tags = Array.isArray(value) ? value : [];

	const colorMap = useMemo(() => ({
		indigo: {
			chip: 'bg-indigo-50 text-indigo-700',
			remove: 'text-indigo-500 hover:text-indigo-700',
			focus: 'border-indigo-400 ring-2 ring-indigo-100'
		},
		blue: {
			chip: 'bg-blue-50 text-blue-700',
			remove: 'text-blue-500 hover:text-blue-700',
			focus: 'border-blue-400 ring-2 ring-blue-100'
		},
		green: {
			chip: 'bg-green-50 text-green-700',
			remove: 'text-green-500 hover:text-green-700',
			focus: 'border-green-400 ring-2 ring-green-100'
		},
		purple: {
			chip: 'bg-purple-50 text-purple-700',
			remove: 'text-purple-500 hover:text-purple-700',
			focus: 'border-purple-400 ring-2 ring-purple-100'
		}
	}), []);

	const palette = colorMap[chipColor] || colorMap.indigo;

	const addTag = (tag) => {
		const normalized = normalize(tag);
		if (!normalized) return;
		if (tags.length >= maxTags) return;
		if (tags.some((t) => t.toLowerCase() === normalized.toLowerCase())) return;
		onChange?.([...tags, normalized]);
		setInput('');
	};

	const removeTag = (index) => {
		const next = tags.filter((_, i) => i !== index);
		onChange?.(next);
	};

	const commitBuffered = () => {
		// Split by commas while allowing spaces within words; trim each
		const parts = input
			.split(',')
			.map((p) => p.trim())
			.filter(Boolean);
		if (parts.length === 0) return;
		const next = [...tags];
		parts.forEach((p) => {
			const normalized = normalize(p);
			if (!normalized) return;
			if (!next.some((t) => t.toLowerCase() === normalized.toLowerCase())) {
				next.push(normalized);
			}
		});
		onChange?.(next);
		setInput('');
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			commitBuffered();
		} else if (e.key === ',') {
			e.preventDefault();
			commitBuffered();
		} else if (e.key === 'Backspace' && !input && tags.length) {
			removeTag(tags.length - 1);
		}
	};

	return (
		<div className="w-full">
			{label && (
				<label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
			)}
			<div
				className={`w-full rounded-xl border ${focused ? palette.focus : 'border-gray-200'} bg-white px-3 py-2 transition-all`}
				onClick={() => inputRef.current?.focus()}
			>
				<div className="flex flex-wrap gap-2">
					{tags.map((tag, idx) => (
						<div key={`${tag}-${idx}`} className={`flex items-center ${palette.chip} px-2 py-1 rounded-lg text-sm`}>
							<span>{tag}</span>
							<button
								type="button"
								onClick={() => removeTag(idx)}
								className={`ml-2 ${palette.remove} transition-colors`}
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
						onBlur={() => {
							setFocused(false);
							commitBuffered();
						}}
						onFocus={() => setFocused(true)}
						placeholder={tags.length ? '' : placeholder}
						className="flex-1 min-w-[160px] py-1 outline-none text-gray-800 placeholder-gray-400"
					/>
				</div>
			</div>
		</div>
	);
};

export default TagsInput;

