import React from "react";

/**
 * Formats text content with support for:
 * - Emojis (native support)
 * - Bold text (**text**)
 * - Italic text (*text*)
 * - Links (auto-detect URLs)
 * - Mentions (@username)
 * - Hashtags (#tag)
 */
export const formatPostContent = (content) => {
  if (!content) return null;

  // Split content by newlines to preserve line breaks
  const lines = content.split("\n");

  return lines.map((line, lineIndex) => {
    const elements = [];
    let currentIndex = 0;

    // Regex patterns
    const patterns = [
      // Bold: **text**
      { regex: /\*\*(.+?)\*\*/g, type: "bold" },
      // Italic: *text* (but not **)
      { regex: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, type: "italic" },
      // URLs
      { regex: /(https?:\/\/[^\s]+)/g, type: "link" },
      // Mentions: @username
      { regex: /@([a-zA-Z0-9_.-]+)/g, type: "mention" },
      // Hashtags: #tag
      { regex: /#([a-zA-Z0-9_]+)/g, type: "hashtag" },
    ];

    // Find all matches
    const matches = [];
    patterns.forEach(({ regex, type }) => {
      let match;
      const regexCopy = new RegExp(regex.source, regex.flags);
      while ((match = regexCopy.exec(line)) !== null) {
        matches.push({
          type,
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          content: match[1] || match[0],
        });
      }
    });

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);

    // Remove overlapping matches (keep first match)
    const filteredMatches = [];
    let lastEnd = 0;
    matches.forEach((match) => {
      if (match.start >= lastEnd) {
        filteredMatches.push(match);
        lastEnd = match.end;
      }
    });

    // Build elements
    filteredMatches.forEach((match, index) => {
      // Add text before match
      if (match.start > currentIndex) {
        elements.push(
          <span key={`text-${lineIndex}-${index}`}>
            {line.substring(currentIndex, match.start)}
          </span>
        );
      }

      // Add formatted match
      switch (match.type) {
        case "bold":
          elements.push(
            <strong
              key={`bold-${lineIndex}-${index}`}
              className="font-bold text-slate-900"
            >
              {match.content}
            </strong>
          );
          break;
        case "italic":
          elements.push(
            <em
              key={`italic-${lineIndex}-${index}`}
              className="italic text-slate-800"
            >
              {match.content}
            </em>
          );
          break;
        case "link":
          elements.push(
            <a
              key={`link-${lineIndex}-${index}`}
              href={match.text}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {match.text}
            </a>
          );
          break;
        case "mention":
          elements.push(
            <span
              key={`mention-${lineIndex}-${index}`}
              className="text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                // Navigate to user profile
                window.location.href = `/profile/${match.content}`;
              }}
            >
              {match.text}
            </span>
          );
          break;
        case "hashtag":
          elements.push(
            <span
              key={`hashtag-${lineIndex}-${index}`}
              className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                // Could implement hashtag search
                console.log("Search for hashtag:", match.content);
              }}
            >
              {match.text}
            </span>
          );
          break;
        default:
          elements.push(
            <span key={`default-${lineIndex}-${index}`}>{match.text}</span>
          );
      }

      currentIndex = match.end;
    });

    // Add remaining text
    if (currentIndex < line.length) {
      elements.push(
        <span key={`text-${lineIndex}-end`}>
          {line.substring(currentIndex)}
        </span>
      );
    }

    // Return line with line break
    return (
      <React.Fragment key={`line-${lineIndex}`}>
        {elements.length > 0 ? elements : line}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

/**
 * Extract mentions from content
 */
export const extractMentions = (content) => {
  const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)]; // Remove duplicates
};

/**
 * Extract hashtags from content
 */
export const extractHashtags = (content) => {
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const hashtags = [];
  let match;
  while ((match = hashtagRegex.exec(content)) !== null) {
    hashtags.push(match[1]);
  }
  return [...new Set(hashtags)]; // Remove duplicates
};

/**
 * Format time ago
 */
export const formatTimeAgo = (date) => {
  const now = new Date();
  const postDate = new Date(date);
  const diffInSeconds = Math.floor((now - postDate) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return postDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: postDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};
