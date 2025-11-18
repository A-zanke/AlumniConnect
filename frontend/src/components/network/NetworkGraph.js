import React, { useCallback, useEffect, useState, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getAvatarUrl } from "../utils/helpers";

const NetworkGraph = ({ connections, currentUser }) => {
  const navigate = useNavigate();
  const graphRef = useRef();
  const containerRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = window.innerWidth < 640 ? 400 : 500;
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    const nodes = new Map();
    const links = [];

    nodes.set(currentUser._id, {
      id: currentUser._id,
      name: currentUser.name,
      role: currentUser.role,
      avatar: getAvatarUrl(currentUser.avatarUrl),
      isCurrentUser: true,
    });

    connections.forEach((conn) => {
      const connId = conn._id || conn.id;
      const connName = conn.name || "Unknown";
      const connRole = conn.role || "user";
      const connAvatar = getAvatarUrl(conn.avatarUrl);

      if (!nodes.has(connId)) {
        nodes.set(connId, {
          id: connId,
          name: connName,
          role: connRole,
          avatar: connAvatar,
        });
      }

      links.push({
        source: currentUser._id,
        target: connId,
        status: "connected",
      });
    });

    setGraphData({
      nodes: Array.from(nodes.values()),
      links,
    });
  }, [connections, currentUser]);

  const handleNodeClick = useCallback(
    (node) => {
      navigate(`/profile/id/${node.id}`);
    },
    [navigate]
  );

  const handleNodeHover = (node) => {
    setHoverNode(node);
    setHighlightNodes(new Set(node ? [node.id] : []));
    setHighlightLinks(
      new Set(
        graphData.links
          .filter(
            (link) =>
              link.source.id === node?.id || link.target.id === node?.id
          )
          .map((link) => `${link.source.id}-${link.target.id}`)
      )
    );
  };

  return (
    <div ref={containerRef} className="w-full">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl shadow-inner relative overflow-hidden"
        style={{ height: dimensions.height }}
      >
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel={(node) => `${node.name} (${node.role})`}
          nodeColor={(node) =>
            highlightNodes.has(node.id)
              ? "#f97316"
              : node.isCurrentUser
              ? "#0891b2"
              : "#64748b"
          }
          nodeRelSize={6}
          linkWidth={(link) =>
            highlightLinks.has(`${link.source.id}-${link.target.id}`) ? 3 : 1
          }
          linkColor={(link) =>
            highlightLinks.has(`${link.source.id}-${link.target.id}`)
              ? "#f97316"
              : link.status === "accepted"
              ? "#22c55e"
              : "#94a3b8"
          }
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 10 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(
              (n) => n + fontSize * 0.4
            );

            ctx.fillStyle = node.isCurrentUser
              ? "rgba(8, 145, 178, 0.9)"
              : "rgba(255, 255, 255, 0.9)";
            ctx.fillRect(
              node.x - bckgDimensions[0] / 2,
              node.y - bckgDimensions[1] / 2 - 20,
              ...bckgDimensions
            );

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = node.isCurrentUser ? "#ffffff" : "#1f2937";
            ctx.fillText(label, node.x, node.y - 20);

            const img = new Image();
            img.src = node.avatar || "/default-avatar.png";
            const size = node.isCurrentUser ? 16 : 12;
            ctx.save();
            ctx.beginPath();
            ctx.arc(node.x, node.y, size / globalScale, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(
              img,
              node.x - size / globalScale,
              node.y - size / globalScale,
              (size * 2) / globalScale,
              (size * 2) / globalScale
            );
            ctx.restore();

            if (node.isCurrentUser) {
              ctx.strokeStyle = "#0891b2";
              ctx.lineWidth = 3 / globalScale;
              ctx.beginPath();
              ctx.arc(node.x, node.y, (size + 4) / globalScale, 0, 2 * Math.PI);
              ctx.stroke();
            }
          }}
          d3VelocityDecay={0.3}
          cooldownTicks={100}
          warmupTicks={50}
        />
        {hoverNode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 bg-white p-3 sm:p-4 rounded-xl shadow-2xl border-2 border-indigo-200 max-w-xs"
          >
            <div className="flex items-center gap-3">
              <img
                src={hoverNode.avatar || "/default-avatar.png"}
                alt={hoverNode.name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-indigo-200"
              />
              <div>
                <h3 className="text-sm sm:text-lg font-bold text-gray-900">
                  {hoverNode.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 capitalize">
                  {hoverNode.role}
                </p>
                {hoverNode.isCurrentUser && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full text-xs font-semibold">
                    You
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg text-xs">
          <h4 className="font-bold text-gray-900 mb-2">Legend</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-600"></div>
              <span className="text-gray-700">You</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-500"></div>
              <span className="text-gray-700">Connections</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-gray-700">Highlighted</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NetworkGraph;