import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { CSVLink } from "react-csv";

const PostAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/posts/my-analytics", {
        params: { range: dateRange },
      });
      setData(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="post-analytics-loading">
        <div className="skeleton-card"></div>
        <div className="skeleton-card"></div>
        <div className="skeleton-table"></div>
      </div>
    );
  }

  if (!data || !data.overview || !data.posts) {
    return (
      <div className="post-analytics-no-data">No analytics data available.</div>
    );
  }

  const { overview, posts } = data;

  const handlePostClick = (post) => {
    setSelectedPost(post);
  };

  const exportData =
    posts && Array.isArray(posts)
      ? posts.map((post) => ({
          Title: post.title,
          Views: post.views,
          Reactions: post.reactions,
          Comments: post.comments,
          Shares: post.shares,
          Date: new Date(post.date).toLocaleDateString(),
        }))
      : [];

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#FF6384",
    "#36A2EB",
  ];

  return (
    <div className="post-analytics">
      <h1>Post Analytics</h1>

      <div className="analytics-filters">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="date-range-select"
        >
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
          <option value="90days">Last 90 days</option>
          <option value="all">All time</option>
        </select>
        <CSVLink
          data={exportData}
          filename="post-analytics.csv"
          className="export-btn"
        >
          Export CSV
        </CSVLink>
      </div>

      <div className="overview-cards">
        <div className="overview-card">
          <h3>Total Posts</h3>
          <p>{overview.totalPosts}</p>
          {overview.postsChange && (
            <span className="change">{overview.postsChange}%</span>
          )}
        </div>
        <div className="overview-card">
          <h3>Total Views</h3>
          <p>{overview.totalViews}</p>
          {overview.viewsChange && (
            <span className="change">{overview.viewsChange}%</span>
          )}
        </div>
        <div className="overview-card">
          <h3>Total Reactions</h3>
          <p>{overview.totalReactions}</p>
          {overview.reactionsChange && (
            <span className="change">{overview.reactionsChange}%</span>
          )}
        </div>
        <div className="overview-card">
          <h3>Total Comments</h3>
          <p>{overview.totalComments}</p>
          {overview.commentsChange && (
            <span className="change">{overview.commentsChange}%</span>
          )}
        </div>
        <div className="overview-card">
          <h3>Total Shares</h3>
          <p>{overview.totalShares}</p>
          {overview.sharesChange && (
            <span className="change">{overview.sharesChange}%</span>
          )}
        </div>
      </div>

      <div className="analytics-table-container">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Post Title</th>
              <th>Views</th>
              <th>Reactions</th>
              <th>Comments</th>
              <th>Shares</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {posts && Array.isArray(posts) && posts.length > 0 ? (
              posts.map((post) => (
                <tr
                  key={post.id}
                  onClick={() => handlePostClick(post)}
                  className="table-row"
                >
                  <td>{post.title}</td>
                  <td>{post.views}</td>
                  <td>{post.reactions}</td>
                  <td>{post.comments}</td>
                  <td>{post.shares}</td>
                  <td>{new Date(post.date).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No posts available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedPost && (
        <div className="detailed-analytics">
          <button className="back-btn" onClick={() => setSelectedPost(null)}>
            Back to Overview
          </button>
          <h2>{selectedPost.title}</h2>

          <div className="charts-container">
            <div className="chart-wrapper">
              <h3>View Count Over Time</h3>
              <LineChart
                width={window.innerWidth < 768 ? 300 : 400}
                height={300}
                data={selectedPost.detailed?.viewHistory || []}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="#8884d8" />
              </LineChart>
            </div>

            <div className="chart-wrapper">
              <h3>Reaction Breakdown</h3>
              <PieChart
                width={window.innerWidth < 768 ? 300 : 400}
                height={300}
              >
                <Pie
                  data={selectedPost.detailed?.reactionBreakdown || []}
                  cx={window.innerWidth < 768 ? 150 : 200}
                  cy={150}
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(selectedPost.detailed?.reactionBreakdown || []).map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </div>
          </div>

          <div className="additional-metrics">
            <div className="metric-item">
              <h3>Top Commenters</h3>
              <ul>
                {(selectedPost.detailed?.topCommenters || []).map(
                  (commenter, index) => (
                    <li key={index}>
                      {commenter.name}: {commenter.count} comments
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="metric-item">
              <h3>Share Count</h3>
              <p>{selectedPost.detailed.shareCount}</p>
            </div>

            <div className="metric-item">
              <h3>Engagement Rate</h3>
              <p>{selectedPost.detailed.engagementRate}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostAnalytics;
