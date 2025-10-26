import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch,
  FiX,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiTag,
  FiUser,
  FiCalendar,
  FiTrendingUp,
  FiMessageSquare,
} from "react-icons/fi";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const PostSearch = ({ onSearch, onClear }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState("recent");
  const [filters, setFilters] = useState({
    author: "",
    dateFrom: "",
    dateTo: "",
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultsCount, setResultsCount] = useState(0);
  const [popularTags, setPopularTags] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Load popular tags and recent searches on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Fetch popular tags
        const tagsResponse = await axios.get("/api/posts/tags/popular", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setPopularTags(tagsResponse.data);
      } catch (error) {
        console.error("Failed to load popular tags:", error);
      }

      // Load recent searches from localStorage
      const saved = localStorage.getItem("postSearchRecent");
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    };

    loadInitialData();
  }, []);

  // Perform search
  const performSearch = useCallback(async () => {
    if (
      !debouncedQuery.trim() &&
      selectedTags.length === 0 &&
      !Object.values(filters).some((v) => v)
    ) {
      onClear();
      setResultsCount(0);
      return;
    }

    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (debouncedQuery.trim())
        searchParams.append("q", debouncedQuery.trim());
      selectedTags.forEach((tag) => searchParams.append("tags", tag));
      searchParams.append("sort", sortBy);

      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });

      const response = await axios.get(`/api/posts/search?${searchParams}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setResultsCount(response.data.total || 0);
      onSearch(response.data.posts || [], debouncedQuery);

      // Save to recent searches
      if (debouncedQuery.trim()) {
        const updatedRecent = [
          debouncedQuery.trim(),
          ...recentSearches.filter((s) => s !== debouncedQuery.trim()),
        ].slice(0, 5);
        setRecentSearches(updatedRecent);
        localStorage.setItem("postSearchRecent", JSON.stringify(updatedRecent));
      }
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Search failed. Please try again.");
      onClear();
    } finally {
      setLoading(false);
    }
  }, [
    debouncedQuery,
    selectedTags,
    sortBy,
    filters,
    onSearch,
    onClear,
    recentSearches,
  ]);

  // Trigger search when debounced query or filters change
  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  const clearSearch = () => {
    setQuery("");
    setSelectedTags([]);
    setFilters({
      author: "",
      dateFrom: "",
      dateTo: "",
    });
    setSortBy("recent");
    onClear();
    setResultsCount(0);
  };

  const addTag = (tag) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tag) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAdvancedFilters = () => {
    setShowAdvancedFilters(!showAdvancedFilters);
  };

  const selectRecentSearch = (searchTerm) => {
    setQuery(searchTerm);
  };

  return (
    <div className="post-search">
      {/* Search Input */}
      <div className="search-input-wrapper">
        <div className="search-input-container">
          <FiSearch className="search-icon" />
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search posts, tags, or content..."
            className="search-input"
            autoComplete="off"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="clear-search-btn"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <FiX />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Loading indicator */}
        <AnimatePresence>
          {loading && (
            <motion.div
              className="search-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="loading-spinner"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Count */}
      <AnimatePresence>
        {resultsCount > 0 && (
          <motion.div
            className="search-results-count"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {resultsCount} result{resultsCount !== 1 ? "s" : ""} found
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Filters */}
      <div className="search-quick-filters">
        {/* Popular Tags */}
        <div className="popular-tags">
          <FiTag className="section-icon" />
          <span className="section-label">Popular:</span>
          <div className="tag-chips">
            {popularTags.slice(0, 10).map((tag) => (
              <motion.button
                key={tag}
                className={`tag-chip ${
                  selectedTags.includes(tag) ? "selected" : ""
                }`}
                onClick={() =>
                  selectedTags.includes(tag) ? removeTag(tag) : addTag(tag)
                }
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {tag}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div className="sort-options">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="recent">Recent</option>
            <option value="popular">Most Reactions</option>
            <option value="commented">Most Comments</option>
          </select>
        </div>

        {/* Advanced Filters Toggle */}
        <motion.button
          className="advanced-filters-toggle"
          onClick={toggleAdvancedFilters}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FiFilter />
          Advanced
          {showAdvancedFilters ? <FiChevronUp /> : <FiChevronDown />}
        </motion.button>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            className="advanced-filters"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="filters-grid">
              {/* Author Filter */}
              <div className="filter-group">
                <label className="filter-label">
                  <FiUser />
                  Author
                </label>
                <input
                  type="text"
                  value={filters.author}
                  onChange={(e) => handleFilterChange("author", e.target.value)}
                  placeholder="Search by author name"
                  className="filter-input"
                />
              </div>

              {/* Date Range */}
              <div className="filter-group">
                <label className="filter-label">
                  <FiCalendar />
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    handleFilterChange("dateFrom", e.target.value)
                  }
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">
                  <FiCalendar />
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="filter-input"
                />
              </div>
            </div>

            {/* Clear All Filters */}
            <div className="filters-actions">
              <motion.button
                className="clear-filters-btn"
                onClick={clearSearch}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Clear All Filters
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Searches */}
      {recentSearches.length > 0 && !query && (
        <div className="recent-searches">
          <h4>Recent Searches</h4>
          <div className="recent-list">
            {recentSearches.map((search, index) => (
              <motion.button
                key={index}
                className="recent-search-item"
                onClick={() => selectRecentSearch(search)}
                whileHover={{ backgroundColor: "rgba(0,0,0,0.05)" }}
              >
                <FiSearch className="recent-icon" />
                {search}
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostSearch;
