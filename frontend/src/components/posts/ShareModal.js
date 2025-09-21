// components/posts/ShareModal.js
import React, { useState } from 'react';
import './ShareModal.css'; // Create this for custom styles

const ShareModal = ({ connections = [], onShare, onClose }) => {
  const [selected, setSelected] = useState([]);

  const handleToggle = (id) => {
    setSelected(selected.includes(id)
      ? selected.filter(sid => sid !== id)
      : [...selected, id]);
  };

  return (
    <div className="share-modal-bg">
      <div className="share-modal-content">
        <h3>Share Post With Connections</h3>
        <div className="share-list">
          {connections.length === 0 ? (
            <div>No connections found.</div>
          ) : (
            connections.map(conn => (
              <label key={conn._id} className="share-conn-item">
                <input
                  type="checkbox"
                  checked={selected.includes(conn._id)}
                  onChange={() => handleToggle(conn._id)}
                />
                <img src={conn.avatar || '/default-avatar.png.jpg'} alt="" className="share-conn-avatar" />
                <span>{conn.name}</span>
              </label>
            ))
          )}
        </div>
        <button className="share-btn" onClick={() => onShare(selected)} disabled={selected.length === 0}>Share</button>
        <button className="cancel-btn" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

export default ShareModal;