import React, { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

const ACCEPTED_IMAGE = ['image/jpeg','image/png','image/gif','image/webp'];
const ACCEPTED_VIDEO = ['video/mp4','video/webm','video/ogg'];

const PostComposer = ({ onPosted }) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(false);

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles(picked.slice(0,5));
  };

  const submitPost = async (e) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) {
      toast.error('Write something or attach media');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('content', content);
      form.append('visibility', visibility);
      files.forEach(f => form.append('media', f));
      await axios.post('/api/posts', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Posted!');
      setContent(''); setFiles([]);
      onPosted?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submitPost} className="theme-card float-in" style={{ padding: 16 }}>
      <textarea
        value={content}
        onChange={(e)=>setContent(e.target.value)}
        className="form-textarea"
        rows={3}
        placeholder="Share your thoughts..."
      />
      <div style={{ display:'flex', gap:12, alignItems:'center', marginTop: 8 }}>
        <input type="file" multiple accept={ACCEPTED_IMAGE.concat(ACCEPTED_VIDEO).join(',')} onChange={handleFiles} />
        <select value={visibility} onChange={(e)=>setVisibility(e.target.value)} className="form-input" style={{ maxWidth: 180 }}>
          <option value="public">Public</option>
          <option value="connections">Connections</option>
          <option value="private">Only me</option>
        </select>
        <button type="submit" className="btn btn-primary hover-tilt" disabled={loading}>
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
      {files.length > 0 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop: 10 }}>
          {files.map((f, i) => (
            <div key={i} className="theme-card" style={{ padding: 8 }}>
              <div style={{ fontSize: 12 }}>{f.name}</div>
              <div style={{ fontSize: 11, color:'#64748b' }}>{(f.size/1024/1024).toFixed(2)} MB</div>
            </div>
          ))}
        </div>
      )}
    </form>
  );
};

export default PostComposer;
