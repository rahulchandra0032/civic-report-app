import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

interface DashboardStats {
  summary: {
    total: number;
    pending: number;
    assigned: number;
    in_progress: number;
    resolved: number;
    sla_breached: number;
  };
  by_category: Record<string, number>;
  by_severity: Record<string, number>;
  recent_issues: any[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
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

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await adminApi.dashboard.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center text-gray-500">Failed to load dashboard</div>;
  }

  const statCards = [
    { label: 'Total Issues', value: stats.summary.total, color: 'bg-blue-500', icon: '📋' },
    { label: 'Pending', value: stats.summary.pending, color: 'bg-yellow-500', icon: '⏳' },
    { label: 'In Progress', value: stats.summary.in_progress, color: 'bg-purple-500', icon: '🔄' },
    { label: 'Resolved', value: stats.summary.resolved, color: 'bg-green-500', icon: '✅' },
    { label: 'SLA Breached', value: stats.summary.sla_breached, color: 'bg-red-500', icon: '🚨' },
  ];

  const resolutionRate = stats.summary.total > 0
    ? ((stats.summary.resolved / stats.summary.total) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <button onClick={fetchStats} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} text-white p-3 rounded-lg text-2xl`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h3 className="text-lg font-semibold mb-4">📊 Resolution Rate</h3>
          <div className="text-center">
            <div className="text-5xl font-bold text-blue-600">{resolutionRate}%</div>
            <p className="text-gray-500 mt-2">{stats.summary.resolved} of {stats.summary.total} resolved</p>
          </div>
          <div className="mt-4 bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${resolutionRate}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h3 className="text-lg font-semibold mb-4">📂 By Category</h3>
          <div className="space-y-3">
            {Object.entries(stats.by_category).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{CATEGORY_ICONS[cat] || '📌'}</span>
                  <span className="text-sm text-gray-600 capitalize">{cat.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(count / stats.summary.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-800 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h3 className="text-lg font-semibold mb-4">🔴 By Severity</h3>
          <div className="space-y-3">
            {Object.entries(stats.by_severity).map(([sev, count]) => {
              const colors: Record<string, string> = {
                CRITICAL: 'bg-red-500',
                HIGH: 'bg-orange-500',
                MEDIUM: 'bg-yellow-500',
                LOW: 'bg-green-500',
              };
              return (
                <div key={sev} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${colors[sev] || 'bg-gray-400'}`}></div>
                    <span className="text-sm text-gray-600">{sev}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${colors[sev] || 'bg-gray-400'}`}
                        style={{ width: `${(count / stats.summary.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-800 w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border">
        <h3 className="text-lg font-semibold mb-4">🕐 Recent Issues</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Title</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Category</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Severity</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Upvotes</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_issues.map((issue) => (
                <tr key={issue.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-800">{issue.title}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 capitalize">
                    {CATEGORY_ICONS[issue.category]} {issue.category.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[issue.status] || ''}`}>
                      {issue.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{issue.severity}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">👍 {issue.upvotes}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {new Date(issue.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
