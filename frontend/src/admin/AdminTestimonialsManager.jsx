import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import AdminNavbar from './AdminNavbar.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaEdit, FaTrash, FaStar, FaCheck, FaTimes } from 'react-icons/fa';

const AdminTestimonialsManager = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    department: '',
    feedback: '',
    rating: 5,
    image: '',
    isActive: true,
    order: 0
  });

  const fetchTestimonials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/testimonials');
      setTestimonials(res.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTestimonials(); }, [fetchTestimonials]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await axios.put(`/api/admin/testimonials/${editMode}`, formData);
      } else {
        await axios.post('/api/admin/testimonials', formData);
      }
      setEditMode(null);
      setFormData({ name: '', company: '', department: '', feedback: '', rating: 5, image: '', isActive: true, order: 0 });
      await fetchTestimonials();
    } catch (err) {
      alert('Failed to save testimonial');
    }
  };

  const handleEdit = (testimonial) => {
    setEditMode(testimonial._id);
    setFormData(testimonial);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this testimonial?')) return;
    try {
      await axios.delete(`/api/admin/testimonials/${id}`);
      await fetchTestimonials();
    } catch (err) {
      alert('Failed to delete testimonial');
    }
  };

  const handleCancel = () => {
    setEditMode(null);
    setFormData({ name: '', company: '', department: '', feedback: '', rating: 5, image: '', isActive: true, order: 0 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <AdminNavbar />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6 mb-6"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <FaStar className="text-yellow-500" />
            Testimonials Management
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
              <input
                type="text"
                placeholder="Company *"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
              <input
                type="text"
                placeholder="Department *"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
              <input
                type="text"
                placeholder="Image URL"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
              <div className="flex items-center gap-4">
                <label className="font-semibold text-gray-700">Rating:</label>
                <select
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} Stars</option>)}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="font-semibold text-gray-700">Order:</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            
            <textarea
              placeholder="Feedback *"
              value={formData.feedback}
              onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
              required
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all mb-4"
            />
            
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                />
                <span className="font-semibold text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg"
              >
                <FaCheck />
                {editMode ? 'Update' : 'Create'} Testimonial
              </button>
              {editMode && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
                >
                  <FaTimes />
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Testimonials List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {testimonials.map((item) => (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="w-12 h-12 rounded-full object-cover" />
                        )}
                        <div>
                          <h3 className="font-bold text-gray-800">{item.name}</h3>
                          <p className="text-sm text-gray-600">{item.company}</p>
                        </div>
                      </div>
                      <div className="flex text-yellow-500">
                        {[...Array(item.rating)].map((_, i) => <FaStar key={i} />)}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{item.department}</p>
                    <p className="text-gray-700 mb-4 line-clamp-3">{item.feedback}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminTestimonialsManager;