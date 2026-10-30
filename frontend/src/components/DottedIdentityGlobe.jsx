"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Shield,
  Globe2,
  Lock,
  Sparkles,
  Activity,
  Layers,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

/**
 * Precompute ~220 points on a unit sphere using Fibonacci spiral
 */
function createSpherePoints(count = 220) {
  const points = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // from 1 to -1
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    points.push({ x, y, z });
  }

  // Precompute neighbor connections (pairs with distance < 0.28)
  const connections = [];
  const maxDistSq = 0.28 * 0.28;
  for (let i = 0; i < points.length; i++) {
    let neighbors = 0;
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const dz = points[i].z - points[j].z;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < maxDistSq) {
        connections.push([i, j]);
        neighbors++;
        if (neighbors >= 3) break; // Keep wireframe light and clean
      }
    }
  }

  return { points, connections };
}

export default function DottedIdentityGlobe({
  assets = [],
  userEmail = "user@domain.com",
  onSelectAccount,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 560, height: 480 });

  const rotationRef = useRef({ y: 0, x: 0.26, isDragging: false, lastX: 0, lastY: 0 });

  // Prepare top 6-8 relevant orbital accounts
  const orbitalAccounts = useMemo(() => {
    if (!assets || assets.length === 0) {
      return [
        { domain: "github.com", serviceName: "GitHub", riskLevel: "High", ghostScore: 97, category: "Developer", detectedDate: "2024-01-15", isDormant: true },
        { domain: "stripe.com", serviceName: "Stripe", riskLevel: "High", ghostScore: 88, category: "Finance", detectedDate: "2023-08-05", isDormant: true },
        { domain: "notion.so", serviceName: "Notion", riskLevel: "Medium", ghostScore: 72, category: "Productivity", detectedDate: "2023-10-12", isDormant: true },
        { domain: "slack.com", serviceName: "Slack", riskLevel: "Medium", ghostScore: 65, category: "Productivity", detectedDate: "2023-05-03", isDormant: true },
        { domain: "figma.com", serviceName: "Figma", riskLevel: "Low", ghostScore: 28, category: "Creative", detectedDate: "2023-11-20", isDormant: false },
        { domain: "facebookmail.com", serviceName: "Facebook", riskLevel: "Low", ghostScore: 12, category: "General", detectedDate: "2026-08-09", isDormant: false },
      ];
    }

    // Sort: High risk first, then by ghost score descending
    const sorted = [...assets].sort((a, b) => {
      const riskWeight = (r) => (r === "High" || r === "HIGH" ? 3 : r === "Medium" || r === "MEDIUM" ? 2 : 1);
      const diff = riskWeight(b.riskLevel) - riskWeight(a.riskLevel);
      if (diff !== 0) return diff;
      return (b.ghostScore || 0) - (a.ghostScore || 0);
    });

    return sorted.slice(0, 8);
  }, [assets]);

  const { points, connections } = useMemo(() => createSpherePoints(220), []);

  useEffect(() => {
    setMounted(true);

    const updateDims = () => {
      if (containerRef.current) {
        const w = Math.min(620, Math.max(340, containerRef.current.clientWidth));
        const h = Math.min(520, Math.max(420, Math.round(w * 0.88)));
        setDimensions({ width: w, height: h });
      }
    };

    updateDims();
    window.addEventListener("resize", updateDims);
    return () => window.removeEventListener("resize", updateDims);
  }, []);

  // Canvas Animation Loop
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    const sphereRadius = Math.min(135, dimensions.width * 0.24);

    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    const render = () => {
      // Auto rotation
      if (!rotationRef.current.isDragging) {
        rotationRef.current.y += 0.0032;
      }

      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      const rotY = rotationRef.current.y;
      const rotX = rotationRef.current.x;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Project 3D points
      const projected = [];
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        // Rotate around Y
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;

        // Rotate around X (tilt)
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        // Perspective scale
        const fov = 340;
        const scale = fov / (fov - z2 * sphereRadius * 0.8);
        const screenX = cx + x1 * sphereRadius * scale;
        const screenY = cy + y2 * sphereRadius * scale;

        projected.push({
          x: screenX,
          y: screenY,
          z: z2,
          scale,
        });
      }

      // Draw faint constellation wireframe lattice lines
      ctx.lineWidth = 0.6;
      for (let i = 0; i < connections.length; i++) {
        const [aIdx, bIdx] = connections[i];
        const p1 = projected[aIdx];
        const p2 = projected[bIdx];

        // Only draw connection if at least one dot is in front
        const avgZ = (p1.z + p2.z) / 2;
        if (avgZ > -0.3) {
          const alpha = Math.max(0.04, Math.min(0.25, (avgZ + 0.3) * 0.35));
          ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // Draw subtle orbital guide rings
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, sphereRadius * 1.5, sphereRadius * 0.65, -0.22, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.12)";
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(cx, cy, sphereRadius * 1.85, sphereRadius * 0.82, 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(52, 211, 153, 0.08)";
      ctx.setLineDash([5, 8]);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();

      // Draw dots
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const isFront = p.z > 0;
        const radius = isFront
          ? Math.max(1.6, Math.min(2.8, (p.z + 0.5) * 2.2))
          : Math.max(0.9, Math.min(1.4, (p.z + 1) * 1.1));

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);

        if (isFront) {
          const alpha = 0.4 + p.z * 0.55;
          ctx.fillStyle = `rgba(52, 211, 153, ${alpha})`;
          // Add cyber glow to front points
          if (p.z > 0.45 && i % 4 === 0) {
            ctx.shadowColor = "#10b981";
            ctx.shadowBlur = 6;
          } else {
            ctx.shadowBlur = 0;
          }
        } else {
          ctx.shadowBlur = 0;
          const alpha = 0.12 + (p.z + 1) * 0.12;
          ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
        }

        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [mounted, points, connections, dimensions]);

  // Pointer drag for manual rotate
  const handlePointerDown = (e) => {
    rotationRef.current.isDragging = true;
    rotationRef.current.lastX = e.clientX;
    rotationRef.current.lastY = e.clientY;
  };

  const handlePointerMove = (e) => {
    if (!rotationRef.current.isDragging) return;
    const dx = e.clientX - rotationRef.current.lastX;
    const dy = e.clientY - rotationRef.current.lastY;
    rotationRef.current.y += dx * 0.007;
    rotationRef.current.x = Math.max(-0.6, Math.min(0.6, rotationRef.current.x + dy * 0.004));
    rotationRef.current.lastX = e.clientX;
    rotationRef.current.lastY = e.clientY;
  };

  const handlePointerUp = () => {
    rotationRef.current.isDragging = false;
  };

  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;
  const orbitRadiusX = Math.min(235, dimensions.width * 0.42);
  const orbitRadiusY = Math.min(195, dimensions.height * 0.38);

  const userHandle = userEmail ? userEmail.split("@")[0] : "Verified User";

  return (
    <div
      ref={containerRef}
      className="dotted-identity-globe-wrap"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "640px",
        height: `${dimensions.height}px`,
        margin: "0 auto",
        userSelect: "none",
        touchAction: "none",
        overflow: "visible",
      }}
    >
      {/* Background cyber radial glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "360px",
          height: "360px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.06) 45%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* 3D Dotted Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          cursor: "grab",
          zIndex: 2,
        }}
      />

      {/* SVG Connecting Beams & Pulsing Energy Dots */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 3,
        }}
      >
        <defs>
          <linearGradient id="beam-grad-high" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="beam-grad-med" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="beam-grad-low" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {orbitalAccounts.map((account, idx) => {
          const total = orbitalAccounts.length;
          const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
          const nodeX = cx + Math.cos(angle) * orbitRadiusX;
          const nodeY = cy + Math.sin(angle) * orbitRadiusY;

          const isHigh = account.riskLevel === "High" || account.riskLevel === "HIGH";
          const isMed = account.riskLevel === "Medium" || account.riskLevel === "MEDIUM";
          const strokeColor = isHigh ? "url(#beam-grad-high)" : isMed ? "url(#beam-grad-med)" : "url(#beam-grad-low)";
          const particleColor = isHigh ? "#f43f5e" : isMed ? "#f59e0b" : "#34d399";

          const isHovered = hoveredNode === account.domain;

          return (
            <g key={account.domain || idx}>
              {/* Connecting line */}
              <line
                x1={cx}
                y1={cy}
                x2={nodeX}
                y2={nodeY}
                stroke={strokeColor}
                strokeWidth={isHovered ? 2 : 1.2}
                strokeDasharray={isHovered ? "none" : "3, 5"}
                opacity={isHovered ? 0.95 : 0.45}
                style={{
                  transition: "opacity 0.2s, stroke-width 0.2s",
                }}
              />

              {/* Pulsing energy dot travelling outwards */}
              <circle r={isHovered ? 3.5 : 2.5} fill={particleColor}>
                <animateMotion
                  path={`M ${cx} ${cy} L ${nodeX} ${nodeY}`}
                  dur={`${2.2 + (idx % 3) * 0.4}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        })}
      </svg>

      {/* Central Core Node */}
      <div
        style={{
          position: "absolute",
          top: `${cy}px`,
          left: `${cx}px`,
          transform: "translate(-50%, -50%)",
          zIndex: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pointerEvents: "auto",
        }}
      >
        {/* Pulsing Core Ring */}
        <div
          style={{
            position: "relative",
            width: "58px",
            height: "58px",
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "radial-gradient(circle, #064e3b 0%, #022c22 80%)",
            border: "2px solid #10b981",
            boxShadow: "0 0 24px rgba(16, 185, 129, 0.45), inset 0 0 14px rgba(52, 211, 153, 0.3)",
          }}
        >
          {/* Animated pulse halo */}
          <span
            style={{
              position: "absolute",
              inset: "-8px",
              borderRadius: "50%",
              border: "1px solid rgba(16, 185, 129, 0.5)",
              animation: "core-ring-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              pointerEvents: "none",
            }}
          />

          <Shield size={24} style={{ color: "#34d399" }} strokeWidth={2.4} />
        </div>

        {/* Identity Core Badge */}
        <div
          style={{
            marginTop: "6px",
            padding: "3px 10px",
            borderRadius: "12px",
            background: "rgba(6, 78, 59, 0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            color: "#e2e8f0",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <span style={{ color: "#34d399", marginRight: "4px" }}>●</span>
          {userHandle}
        </div>
      </div>

      {/* Orbital Service Node Chips */}
      {orbitalAccounts.map((account, idx) => {
        const total = orbitalAccounts.length;
        const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
        const nodeX = cx + Math.cos(angle) * orbitRadiusX;
        const nodeY = cy + Math.sin(angle) * orbitRadiusY;

        const isHigh = account.riskLevel === "High" || account.riskLevel === "HIGH";
        const isMed = account.riskLevel === "Medium" || account.riskLevel === "MEDIUM";

        const riskColor = isHigh ? "#f43f5e" : isMed ? "#f59e0b" : "#10b981";
        const riskBg = isHigh
          ? "rgba(244, 63, 94, 0.15)"
          : isMed
          ? "rgba(245, 158, 11, 0.15)"
          : "rgba(16, 185, 129, 0.15)";
        const riskBorder = isHigh
          ? "rgba(244, 63, 94, 0.6)"
          : isMed
          ? "rgba(245, 158, 11, 0.55)"
          : "rgba(16, 185, 129, 0.55)";

        const isHovered = hoveredNode === account.domain;

        return (
          <div
            key={account.domain || idx}
            onMouseEnter={() => setHoveredNode(account.domain)}
            onMouseLeave={() => setHoveredNode(null)}
            onClick={() => onSelectAccount && onSelectAccount(account)}
            style={{
              position: "absolute",
              top: `${nodeY}px`,
              left: `${nodeX}px`,
              transform: `translate(-50%, -50%) scale(${isHovered ? 1.12 : 1})`,
              transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s",
              zIndex: isHovered ? 10 : 5,
              cursor: "pointer",
            }}
          >
            {/* Service Chip */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "5px 11px",
                borderRadius: "20px",
                background: "rgba(15, 23, 42, 0.88)",
                backdropFilter: "blur(10px)",
                border: `1.5px solid ${isHovered ? riskColor : riskBorder}`,
                boxShadow: isHovered
                  ? `0 0 18px ${riskColor}40, 0 8px 16px rgba(0,0,0,0.5)`
                  : "0 4px 12px rgba(0,0,0,0.4)",
              }}
            >
              {/* Risk Dot */}
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: riskColor,
                  boxShadow: `0 0 6px ${riskColor}`,
                  flexShrink: 0,
                }}
              />

              {/* Service Name */}
              <span
                style={{
                  color: "#f8fafc",
                  fontSize: "12px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {account.serviceName || account.name || account.domain}
              </span>

              {/* Ghost score badge */}
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: riskColor,
                  background: riskBg,
                  padding: "1px 5px",
                  borderRadius: "4px",
                  lineHeight: 1.2,
                }}
              >
                {account.ghostScore ?? 0}
              </span>
            </div>

            {/* Hover Tooltip Card */}
            {isHovered && (
              <div
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%) translateY(-10px)",
                  width: "230px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "rgba(10, 15, 29, 0.96)",
                  backdropFilter: "blur(14px)",
                  border: `1px solid ${riskColor}60`,
                  boxShadow: `0 14px 28px rgba(0,0,0,0.6), 0 0 16px ${riskColor}25`,
                  color: "#f8fafc",
                  fontSize: "12px",
                  pointerEvents: "none",
                  zIndex: 20,
                  animation: "tooltip-pop 0.2s ease-out",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "13px", color: "#f8fafc" }}>
                    {account.serviceName || account.domain}
                  </strong>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: riskColor,
                      background: riskBg,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      textTransform: "uppercase",
                    }}
                  >
                    {account.riskLevel || "LOW"}
                  </span>
                </div>

                <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "6px" }}>
                  <span>Domain: </span>
                  <span style={{ color: "#cbd5e1" }}>{account.domain}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "11px", marginBottom: "6px" }}>
                  <span>Category:</span>
                  <span style={{ color: "#34d399", fontWeight: 600 }}>{account.category || "General"}</span>
                </div>

                {account.detectedDate && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "11px", marginBottom: "6px" }}>
                    <span>First Detected:</span>
                    <span style={{ color: "#cbd5e1" }}>
                      {new Date(account.detectedDate).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}

                {account.remediationTip && (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      background: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      fontSize: "10px",
                      color: "#94a3b8",
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ color: "#34d399", fontWeight: 700, display: "block", marginBottom: "2px" }}>Remediation:</span>
                    {account.remediationTip}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Subtle bottom legend indicator */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "4px 12px",
          borderRadius: "20px",
          background: "rgba(15, 23, 42, 0.65)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          fontSize: "11px",
          color: "#94a3b8",
          zIndex: 4,
          pointerEvents: "none",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <i style={{ width: 6, height: 6, borderRadius: "50%", background: "#f43f5e", display: "inline-block" }} /> High Risk
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <i style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} /> Medium Risk
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <i style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} /> Secured / Low
        </span>
      </div>

      <style jsx>{`
        @keyframes core-ring-pulse {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.45);
            opacity: 0;
          }
          100% {
            transform: scale(0.95);
            opacity: 0;
          }
        }
        @keyframes tooltip-pop {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-2px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(-10px) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

