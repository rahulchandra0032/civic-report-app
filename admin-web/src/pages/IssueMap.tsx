import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { adminApi } from '../services/api';

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

const CATEGORY_ICONS: Record<string, string> = {
  pothole: '🕳️',
  garbage: '🗑️',
  streetlight: '💡',
  water_leak: '💧',
  drainage: '🚰',
  road_damage: '🛣️',
  construction: '🏗️',
  other: '📌',
};

function createIcon(category: string, severity: string) {
  const color = SEVERITY_COLORS[severity] || '#999';
  const emoji = CATEGORY_ICONS[category] || '📌';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center]);
  return null;
}

export default function IssueMap() {
  const [issues, setIssues] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState<[number, number]>([23.3441, 85.3096]);
  const [viewMode, setViewMode] = useState<'markers' | 'heatmap'>('markers');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { days: 30 };
      if (selectedCategory) params.category = selectedCategory;

      const [nearbyData, heatmapResult] = await Promise.all([
        adminApi.geo.nearby(center[0], center[1], 10000),
        adminApi.geo.heatmap(params),
      ]);

      setIssues(nearbyData.features || []);
      setHeatmapData(heatmapResult);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Issue Map</h2>
        <div className="flex gap-3 items-center">
          <select
            className="px-3 py-2 border rounded-lg text-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {Object.keys(CATEGORY_ICONS).map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat.replace('_', ' ')}</option>
            ))}
          </select>
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('markers')}
              className={`px-4 py-2 text-sm ${viewMode === 'markers' ? 'bg-blue-600 text-white' : 'bg-white'}`}
            >
              Markers
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-4 py-2 text-sm ${viewMode === 'heatmap' ? 'bg-blue-600 text-white' : 'bg-white'}`}
            >
              Heatmap
            </button>
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ height: '600px' }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater center={center} />

          {viewMode === 'markers' && issues.map((feature, idx) => {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;
            return (
              <Marker
                key={idx}
                position={[coords[1], coords[0]]}
                icon={createIcon(props.category, props.severity)}
              >
                <Popup>
                  <div className="p-1 min-w-[200px]">
                    <h3 className="font-semibold text-gray-800">{props.title}</h3>
                    <p className="text-sm text-gray-500 capitalize">{props.category?.replace('_', ' ')}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        props.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        props.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        props.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {props.severity}
                      </span>
                      <span className="text-xs text-gray-500">{props.status}</span>
                    </div>
                    {props.distance_meters && (
                      <p className="text-xs text-gray-400 mt-1">📍 {props.distance_meters}m away</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="flex gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border flex-1">
          <h3 className="font-semibold mb-3">Legend</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(SEVERITY_COLORS).map(([level, color]) => (
              <div key={level} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="text-sm text-gray-600">{level}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border flex-1">
          <h3 className="font-semibold mb-3">Statistics</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">Total markers:</div>
            <div className="font-medium">{issues.length}</div>
            {viewMode === 'heatmap' && heatmapData?.features && (
              <>
                <div className="text-gray-500">Heatmap points:</div>
                <div className="font-medium">{heatmapData.features.length}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
