import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import { toast } from 'react-toastify';

const ForumPage = () => {
  const { user, canCreateContent } = useAuth();
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState([]);
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
  });

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setLoading(true);
        // This endpoint should be implemented in your backend
        // For now, we'll use mock data
        setTopics([
          {
            _id: '1',
            title: 'Welcome to the Alumni Forum',
            content: 'This is a place to discuss various topics related to our alumni community.',
            category: 'announcements',
            author: {
              _id: '1',
              name: 'Forum Admin',
              username: 'admin',
              avatarUrl: null,
            },
            createdAt: new Date().toISOString(),
            repliesCount: 5,
            viewsCount: 120,
          },
          {
            _id: '2',
            title: 'Job opportunities in tech industry',
            content: 'Looking for software developers with 3+ years of experience.',
            category: 'jobs',
            author: {
              _id: '2',
              name: 'Jane Smith',
              username: 'jsmith',
              avatarUrl: null,
            },
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            repliesCount: 8,
            viewsCount: 95,
          },
        ]);
      } catch (error) {
        console.error('Error fetching forum topics:', error);
        toast.error('Failed to load forum topics');
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // This endpoint should be implemented in your backend
      // const response = await forumAPI.createTopic(formData);
      
      // For now, simulate adding a new topic
      const newTopic = {
        _id: Date.now().toString(),
        title: formData.title,
        content: formData.content,
        category: formData.category,
        author: {
          _id: user._id,
          name: user.name,
          username: user.username,
          avatarUrl: user.avatarUrl,
        },
        createdAt: new Date().toISOString(),
        repliesCount: 0,
        viewsCount: 0,
      };
      
      setTopics([newTopic, ...topics]);
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        category: 'general',
      });
      
      setShowNewTopicForm(false);
      toast.success('Topic created successfully!');
    } catch (error) {
      console.error('Error creating topic:', error);
      toast.error('Failed to create topic');
    }
  };

  if (loading && topics.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="theme-card p-6 mb-6 float-in">
        <h1 className="text-2xl font-extrabold gradient-text">Student Forum</h1>
        <p className="text-gray-600">Target posts by role, branch, and year</p>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Forum</h1>
          <p className="mt-2 text-gray-600">Discuss ideas and share knowledge with fellow alumni</p>
        </div>
        
        {canCreateContent() && (
          <button
            onClick={() => setShowNewTopicForm(!showNewTopicForm)}
            className="mt-4 md:mt-0 btn btn-primary"
          >
            {showNewTopicForm ? 'Cancel' : 'New Topic'}
          </button>
        )}
      </div>
      
      {showNewTopicForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Topic</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="form-label">Title</label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            
            <div>
              <label htmlFor="category" className="form-label">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="general">General Discussion</option>
                <option value="announcements">Announcements</option>
                <option value="jobs">Job Opportunities</option>
                <option value="events">Events</option>
                <option value="networking">Networking</option>
                <option value="advice">Career Advice</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="content" className="form-label">Content</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={6}
                className="form-input"
                required
              />
            </div>
            
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary">
                Create Topic
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
            <div className="col-span-6 sm:col-span-7">Topic</div>
            <div className="col-span-2 text-center hidden sm:block">Replies</div>
            <div className="col-span-2 text-center hidden sm:block">Views</div>
            <div className="col-span-6 sm:col-span-1 text-right">Created</div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {topics.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No topics found</p>
              {canCreateContent() && (
                <button
                  onClick={() => setShowNewTopicForm(true)}
                  className="mt-4 btn btn-outline"
                >
                  Create the first topic
                </button>
              )}
            </div>
          ) : (
            topics.map((topic) => (
              <div key={topic._id} className="p-4 hover:bg-gray-50">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-6 sm:col-span-7">
                    <Link to={`/forum/${topic._id}`} className="block">
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600">
                        {topic.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-1">
                        {topic.content}
                      </p>
                      <div className="mt-2 flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
                          {topic.category}
                        </span>
                        <span className="ml-2 text-xs text-gray-500 flex items-center">
                          by {topic.author.name}
                        </span>
                      </div>
                    </Link>
                  </div>
                  <div className="col-span-2 text-center hidden sm:flex sm:items-center sm:justify-center">
                    <span className="text-gray-900 font-medium">{topic.repliesCount}</span>
                  </div>
                  <div className="col-span-2 text-center hidden sm:flex sm:items-center sm:justify-center">
                    <span className="text-gray-900 font-medium">{topic.viewsCount}</span>
                  </div>
                  <div className="col-span-6 sm:col-span-1 text-right flex items-center justify-end">
                    <span className="text-xs text-gray-500">
                      {new Date(topic.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumPage;