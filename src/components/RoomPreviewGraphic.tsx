import React, { useEffect, useState } from 'react';
import { RoomProject } from '../types/room';
import { getCatalogItem } from '../data/catalog';
import { isNightLightingPreset } from '../three/lightingPresets';
import { buildProjectThumbnailSignature, requestRoomThumbnail } from '../three/thumbnailRenderer';

interface RoomPreviewGraphicProps {
  project: RoomProject;
  theme?: 'light' | 'dark';
  className?: string;
}

const FLOOR_FILL: Record<RoomProject['shell']['floorMaterial'], string> = {
  'white-oak': '#D6BE9E',
  'herringbone-oak': '#DEC9A8',
  'smoked-walnut': '#6E513B',
  'polished-concrete': '#CECAC2',
  'warm-travertine': '#E2D8C7',
  'polished-marble': '#EFECE5',
  'ceramic-tile': '#E5E0D7',
  'plush-carpet': '#CFC9BD',
};

export const RoomPreviewGraphic: React.FC<RoomPreviewGraphicProps> = ({
  project,
  theme = 'light',
  className = '',
}) => {
  const isDark = theme === 'dark';
  const [thumbEntry, setThumbEntry] = useState<{ sig: string; url: string; loaded: boolean } | null>(
    null,
  );
  const sig = buildProjectThumbnailSignature(project);

  useEffect(() => {
    const cancel = requestRoomThumbnail(project, (url) => {
      if (url) {
        setThumbEntry({ sig, url, loaded: false });
      }
    });
    return cancel;
  }, [project, sig]);

  const activeThumbUrl = thumbEntry?.sig === sig ? thumbEntry.url : null;
  const isImgReady = Boolean(thumbEntry?.sig === sig && thumbEntry.loaded);

  const { length: L, width: W } = project.dimensions;
  const safeL = Math.max(L, 1.5);
  const safeW = Math.max(W, 1.5);
  const scale = Math.min(204 / safeL, 114 / safeW);
  const rw = L * scale;
  const rh = W * scale;
  const centerX = 120;
  const centerY = 65;
  const ox = centerX - rw / 2;
  const oy = centerY - rh / 2;

  const floorColor = FLOOR_FILL[project.shell.floorMaterial] ?? '#D6BE9E';
  const wallStroke = project.shell.hasAccentWall
    ? project.shell.accentWallColor
    : project.shell.wallColor;
  const isNight = isNightLightingPreset(project.shell.lightingPreset);

  const bgClass = isDark ? 'bg-[#171917]' : 'bg-[#ECE7DD]';
  const gridStroke = isDark ? 'rgba(244,240,232,0.06)' : 'rgba(31,33,32,0.055)';
  const outerWallStroke = isDark ? '#585A54' : '#2B2D2B';
  const dimTextFill = isDark ? '#A6A298' : '#5B5D5A';
  const sunConeFill = isNight
    ? 'rgba(130, 165, 210, 0.14)'
    : 'rgba(255, 224, 166, 0.28)';

  return (
    <div className={`relative overflow-hidden ${bgClass} flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 240 146"
        className={`w-full h-full transition-all duration-300 ease-out group-hover:scale-105 ${
          isImgReady ? 'opacity-0' : 'opacity-100'
        }`}
        aria-label={`${project.name} architectural floor plan preview`}
      >
        <defs>
          <pattern id={`grid-${project.id}-${theme}`} width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke={gridStroke} strokeWidth="0.6" />
          </pattern>
          <pattern id={`plank-${project.id}`} width="10" height="5" patternUnits="userSpaceOnUse">
            <path d="M 0 5 L 10 5 M 5 0 L 5 5" fill="none" stroke="rgba(31,33,32,0.07)" strokeWidth="0.45" />
          </pattern>
        </defs>

        <rect width="240" height="150" fill={`url(#grid-${project.id}-${theme})`} />

        {/* Architectural shadow */}
        <rect
          x={ox + 4}
          y={oy + 5}
          width={rw}
          height={rh}
          rx="2"
          fill={isDark ? 'rgba(0,0,0,0.45)' : 'rgba(31,33,32,0.13)'}
        />

        {/* Room Floor */}
        <rect
          x={ox}
          y={oy}
          width={rw}
          height={rh}
          fill={floorColor}
          stroke={outerWallStroke}
          strokeWidth="3.2"
        />
        <rect x={ox} y={oy} width={rw} height={rh} fill={`url(#plank-${project.id})`} />

        {/* Subtle sunlit / moonlight cone across floor */}
        {project.shell.windowWall === 'right' && (
          <polygon
            points={`${ox + rw},${oy + rh * 0.24} ${ox + rw},${oy + rh * 0.76} ${ox + rw * 0.28},${oy + rh * 0.88} ${ox + rw * 0.28},${oy + rh * 0.14}`}
            fill={sunConeFill}
          />
        )}
        {project.shell.windowWall === 'back' && (
          <polygon
            points={`${ox + rw * 0.24},${oy} ${ox + rw * 0.76},${oy} ${ox + rw * 0.86},${oy + rh * 0.65} ${ox + rw * 0.14},${oy + rh * 0.65}`}
            fill={sunConeFill}
          />
        )}
        {project.shell.windowWall === 'left' && (
          <polygon
            points={`${ox},${oy + rh * 0.24} ${ox},${oy + rh * 0.76} ${ox + rw * 0.72},${oy + rh * 0.86} ${ox + rw * 0.72},${oy + rh * 0.14}`}
            fill={sunConeFill}
          />
        )}

        {/* Night ambient overlay */}
        {isNight && (
          <rect
            x={ox + 1.5}
            y={oy + 1.5}
            width={Math.max(0, rw - 3)}
            height={Math.max(0, rh - 3)}
            fill="rgba(22, 26, 32, 0.32)"
          />
        )}

        {/* Accent wall highlight */}
        <line
          x1={ox}
          y1={oy}
          x2={ox + rw}
          y2={oy}
          stroke={wallStroke === '#F3EFE6' || wallStroke === '#EFECE6' ? '#5D6B53' : wallStroke}
          strokeWidth="4.2"
        />

        {/* Window indicator on configured wall */}
        {project.shell.windowWall === 'right' && (
          <line
            x1={ox + rw}
            y1={oy + rh * 0.22}
            x2={ox + rw}
            y2={oy + rh * 0.78}
            stroke="#9AC0D8"
            strokeWidth="3.5"
          />
        )}
        {project.shell.windowWall === 'back' && (
          <line
            x1={ox + rw * 0.22}
            y1={oy}
            x2={ox + rw * 0.78}
            y2={oy}
            stroke="#9AC0D8"
            strokeWidth="3.5"
          />
        )}
        {project.shell.windowWall === 'left' && (
          <line
            x1={ox}
            y1={oy + rh * 0.22}
            x2={ox}
            y2={oy + rh * 0.78}
            stroke="#9AC0D8"
            strokeWidth="3.5"
          />
        )}

        {/* Placed Furniture Architectural Silhouettes */}
        {project.furniture.map((inst) => {
          const cat = getCatalogItem(inst.catalogId);
          const fw = Math.max(4, (cat?.width ?? 0.8) * inst.scale * scale);
          const fd = Math.max(4, (cat?.depth ?? 0.8) * inst.scale * scale);
          const cx = centerX + inst.position[0] * scale;
          const cy = centerY + inst.position[2] * scale;
          const deg = (inst.rotationY * 180) / Math.PI;
          const isRug = cat?.category === 'Rugs';
          const isBed = cat?.category === 'Beds';
          const isSofa = cat?.category === 'Sofas';
          const isLamp = cat?.category === 'Lamps';
          const isPlant = cat?.category === 'Plants';

          return (
            <g key={inst.instanceId} transform={`translate(${cx}, ${cy}) rotate(${-deg})`}>
              {isLamp && (
                <circle
                  r={Math.max(fw, fd) * 1.45}
                  fill="rgba(255, 214, 145, 0.34)"
                />
              )}

              {isPlant ? (
                <circle
                  r={Math.max(fw, fd) * 0.48}
                  fill="#5D6B53"
                  stroke="rgba(31,33,32,0.45)"
                  strokeWidth="0.9"
                />
              ) : (
                <rect
                  x={-fw / 2}
                  y={-fd / 2}
                  width={fw}
                  height={fd}
                  rx={isRug ? 1 : 2.5}
                  fill={inst.primaryColor}
                  fillOpacity={isRug ? 0.65 : 0.96}
                  stroke={isRug ? 'rgba(31,33,32,0.2)' : 'rgba(31,33,32,0.48)'}
                  strokeWidth={isRug ? 0.7 : 1}
                />
              )}

              {isBed && fw > 12 && fd > 14 && (
                <>
                  {/* Headboard bar */}
                  <rect
                    x={-fw / 2}
                    y={-fd / 2}
                    width={fw}
                    height={3}
                    rx="1"
                    fill={inst.secondaryColor}
                  />
                  {/* Pillows */}
                  <rect
                    x={-fw * 0.38}
                    y={-fd / 2 + 4}
                    width={fw * 0.34}
                    height={fd * 0.2}
                    rx="1.5"
                    fill="#FAF7F0"
                    stroke="rgba(31,33,32,0.22)"
                    strokeWidth="0.5"
                  />
                  <rect
                    x={fw * 0.04}
                    y={-fd / 2 + 4}
                    width={fw * 0.34}
                    height={fd * 0.2}
                    rx="1.5"
                    fill="#FAF7F0"
                    stroke="rgba(31,33,32,0.22)"
                    strokeWidth="0.5"
                  />
                  {/* Duvet throw band */}
                  <rect
                    x={-fw / 2 + 1}
                    y={fd * 0.14}
                    width={fw - 2}
                    height={fd * 0.33}
                    rx="1"
                    fill={inst.secondaryColor}
                    fillOpacity="0.32"
                  />
                </>
              )}

              {isSofa && fw > 12 && (
                <rect
                  x={-fw / 2 + 1.5}
                  y={-fd / 2 + 1.5}
                  width={fw - 3}
                  height={Math.max(2.5, fd * 0.26)}
                  rx="1"
                  fill={inst.secondaryColor}
                  fillOpacity="0.45"
                />
              )}
            </g>
          );
        })}

        {/* Architectural corner ticks & dimension labels */}
        <text
          x="120"
          y={oy + rh + 13}
          textAnchor="middle"
          fontSize="8.5"
          fontFamily="JetBrains Mono, monospace"
          fill={dimTextFill}
        >
          {L.toFixed(1)}m × {W.toFixed(1)}m
        </text>
      </svg>

      {activeThumbUrl && (
        <img
          src={activeThumbUrl}
          alt={`${project.name} 3D architectural preview`}
          onLoad={() =>
            setThumbEntry((prev) =>
              prev && prev.sig === sig ? { ...prev, loaded: true } : prev,
            )
          }
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-105 ${
            isImgReady ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};
