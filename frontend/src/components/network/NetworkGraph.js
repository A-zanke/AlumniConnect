import React, { useCallback, useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAvatarUrl } from '../../utils/helpers';

const NetworkGraph = ({ connections, currentUser }) => {
  const navigate = useNavigate();
  const graphRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);

  useEffect(() => {
    // Transform connections data into graph format
    const nodes = new Map();
    const links = [];

    // Add current user
    nodes.set(currentUser._id, {
      id: currentUser._id,
      name: currentUser.name,
      role: currentUser.role,
      avatar: getAvatarUrl(currentUser.avatarUrl),
      isCurrentUser: true
    });

    // Process connections
    connections.forEach(conn => {
      // Add nodes if they don't exist
      if (!nodes.has(conn.requesterId)) {
        nodes.set(conn.requesterId, {
          id: conn.requesterId,
          name: conn.requester.name,
          role: conn.requester.role,
          avatar: getAvatarUrl(conn.requester.avatarUrl)
        });
      }
      if (!nodes.has(conn.recipientId)) {
        nodes.set(conn.recipientId, {
          id: conn.recipientId,
          name: conn.recipient.name,
          role: conn.recipient.role,
          avatar: getAvatarUrl(conn.recipient.avatarUrl)
        });
      }

      // Add link
      links.push({
        source: conn.requesterId,
        target: conn.recipientId,
        status: conn.status
      });
    });

    setGraphData({
      nodes: Array.from(nodes.values()),
      links
    });
  }, [connections, currentUser]);

  const handleNodeClick = useCallback(node => {
    navigate(`/profile/${node.id}`);
  }, [navigate]);

  const handleNodeHover = node => {
    setHoverNode(node);
    setHighlightNodes(new Set(node ? [node.id] : []));
    setHighlightLinks(new Set(
      graphData.links
        .filter(link => link.source.id === node?.id || link.target.id === node?.id)
        .map(link => `${link.source.id}-${link.target.id}`)
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-[600px] bg-white rounded-lg shadow-lg p-4"
    >
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeLabel={node => `${node.name} (${node.role})`}
        nodeColor={node => 
          highlightNodes.has(node.id) 
            ? '#f97316' 
            : node.isCurrentUser 
              ? '#0891b2'
              : '#64748b'
        }
        nodeRelSize={8}
        linkWidth={link => highlightLinks.has(`${link.source.id}-${link.target.id}`) ? 2 : 1}
        linkColor={link => 
          highlightLinks.has(`${link.source.id}-${link.target.id}`)
            ? '#f97316'
            : link.status === 'accepted'
              ? '#22c55e'
              : '#94a3b8'
        }
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(
            node.x - bckgDimensions[0] / 2,
            node.y - bckgDimensions[1] / 2,
            ...bckgDimensions
          );

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = node.isCurrentUser ? '#0891b2' : '#1f2937';
          ctx.fillText(label, node.x, node.y);
        }}
      />
      {hoverNode && (
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold">{hoverNode.name}</h3>
          <p className="text-sm text-gray-600 capitalize">{hoverNode.role}</p>
        </div>
      )}
    </motion.div>
  );
};

export default NetworkGraph; 