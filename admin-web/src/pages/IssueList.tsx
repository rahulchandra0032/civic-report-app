import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

interface Issue {
  id: string;
  title: string;
  category: string;
  status: string;
  severity: string;
  severity_score?: number;
  image_url_before: string;
  upvotes: number;
  ai_confidence?: number;
  latitude: number;
  longitude: number;
  address?: string;
  created_at: string;
  sla_deadline?: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const CATEGORIES = ['pothole', 'garbage', 'streetlight', 'water_leak', 'drainage', 'road_damage', 'construction', 'other'];

export default function IssueList() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [filters, setFilters] = useState({
    category: '',
    status: '',
    severity: '',
    search: '',
  });

  useEffect(() => {
    fetchIssues();
  }, [page, filters]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, per_page: 20 };
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status_filter = filters.status;
      if (filters.severity) params.severity = filters.severity;
      if (filters.search) params.search = filters.search;

      const data = await adminApi.issues.list(params);
      setIssues(data.issues);
      setTotal(data.total);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      await adminApi.issues.update(issueId, { status: newStatus });
      fetchIssues();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleAssign = async (issueId: string, assignedTo: string, notes: string) => {
    try {
      await adminApi.issues.assign(issueId, { assigned_to: assignedTo, notes });
      setShowAssignModal(false);
      fetchIssues();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const getSlaStatus = (deadline?: string) => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return { text: 'BREACHED', color: 'text-red-600 bg-red-50' };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 12) return { text: `${hours}h left`, color: 'text-orange-600 bg-orange-50' };
    return { text: `${hours}h left`, color: 'text-green-600 bg-green-50' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Issues ({total})</h2>
        <button onClick={fetchIssues} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search issues..."
            className="px-4 py-2 border rounded-lg"
            value={filters.search}
            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
          />
          <select
            className="px-4 py-2 border rounded-lg"
            value={filters.category}
            onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setPage(1); }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            className="px-4 py-2 border rounded-lg"
            value={filters.status}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            className="px-4 py-2 border rounded-lg"
            value={filters.severity}
            onChange={(e) => { setFilters({ ...filters, severity: e.target.value }); setPage(1); }}
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <button
            onClick={() => setFilters({ category: '', status: '', severity: '', search: '' })}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Image</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Title</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Category</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Severity</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">SLA</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Upvotes</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => {
                const sla = getSlaStatus(issue.sla_deadline);
                return (
                  <tr key={issue.id} className="border-t hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <img src={issue.image_url_before} alt="" className="w-16 h-16 object-cover rounded-lg" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800">{issue.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{issue.address || 'No address'}</div>
                    </td>
                    <td className="py-3 px-4 text-sm capitalize">{issue.category.replace('_', ' ')}</td>
                    <td className="py-3 px-4">
                      <select
                        value={issue.status}
                        onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${STATUS_COLORS[issue.status] || ''}`}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="ASSIGNED">Assigned</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${SEVERITY_COLORS[issue.severity] || ''}`}>
                        {issue.severity}
                      </span>
                      {issue.severity_score && (
                        <div className="text-xs text-gray-500 mt-1">Score: {issue.severity_score.toFixed(1)}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {sla && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${sla.color}`}>
                          {sla.text}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">👍 {issue.upvotes}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelectedIssue(issue); setShowAssignModal(true); }}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                        >
                          Assign
                        </button>
                        <a
                          href={`/map?issue=${issue.id}`}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200"
                        >
                          Map
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50">
            <span className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1}-{Math.min(page * 20, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">Page {page}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={issues.length < 20}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && selectedIssue && (
        <AssignModal
          issue={selectedIssue}
          onAssign={handleAssign}
          onClose={() => { setShowAssignModal(false); setSelectedIssue(null); }}
        />
      )}
    </div>
  );
}

function AssignModal({ issue, onAssign, onClose }: { issue: Issue; onAssign: any; onClose: () => void }) {
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Assign Issue</h3>
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="font-medium">{issue.title}</p>
          <p className="text-sm text-gray-500">{issue.category.replace('_', ' ')}</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign To (User ID)</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter user UUID"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
              placeholder="Assignment notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => onAssign(issue.id, assignedTo, notes)}
              disabled={!assignedTo}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
