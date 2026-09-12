import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

interface SLAReport {
  breached: SLAIssue[];
  at_risk: SLAIssue[];
  compliance_rate: number;
}

interface SLAIssue {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  sla_deadline: string;
  hours_overdue?: number;
  hours_remaining?: number;
}

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

export default function SLAReport() {
  const [report, setReport] = useState<SLAReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const data = await adminApi.sla.getReport();
      setReport(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return <div className="text-center text-gray-500 py-12">Failed to load SLA report</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">SLA Report</h2>
        <button onClick={fetchReport} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">Compliance Rate</div>
            <div className={`text-5xl font-bold ${
              report.compliance_rate >= 80 ? 'text-green-600' :
              report.compliance_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {report.compliance_rate.toFixed(1)}%
            </div>
            <div className="mt-3 bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  report.compliance_rate >= 80 ? 'bg-green-500' :
                  report.compliance_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${report.compliance_rate}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">SLA Breached</div>
            <div className="text-5xl font-bold text-red-600">{report.breached.length}</div>
            <div className="text-sm text-gray-500 mt-2">Issues past deadline</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">At Risk</div>
            <div className="text-5xl font-bold text-orange-500">{report.at_risk.length}</div>
            <div className="text-sm text-gray-500 mt-2">Within 12 hours of deadline</div>
          </div>
        </div>
      </div>

      {report.breached.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-red-50 border-b">
            <h3 className="text-lg font-semibold text-red-800">🚨 SLA Breached ({report.breached.length})</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Issue</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Category</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Severity</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Overdue By</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {report.breached.map((issue) => (
                <tr key={issue.id} className="border-t hover:bg-red-50">
                  <td className="py-3 px-4">
                    <a href={`/issues?id=${issue.id}`} className="font-medium text-blue-600 hover:underline">
                      {issue.title}
                    </a>
                  </td>
                  <td className="py-3 px-4 text-sm capitalize">
                    {CATEGORY_ICONS[issue.category]} {issue.category.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      issue.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                      issue.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {issue.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">{issue.status}</td>
                  <td className="py-3 px-4 text-sm font-medium text-red-600">
                    {issue.hours_overdue ? `${issue.hours_overdue.toFixed(1)}h` : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {new Date(issue.sla_deadline).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.at_risk.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-orange-50 border-b">
            <h3 className="text-lg font-semibold text-orange-800">⚠️ At Risk ({report.at_risk.length})</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Issue</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Category</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Severity</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Time Left</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {report.at_risk.map((issue) => (
                <tr key={issue.id} className="border-t hover:bg-orange-50">
                  <td className="py-3 px-4">
                    <a href={`/issues?id=${issue.id}`} className="font-medium text-blue-600 hover:underline">
                      {issue.title}
                    </a>
                  </td>
                  <td className="py-3 px-4 text-sm capitalize">
                    {CATEGORY_ICONS[issue.category]} {issue.category.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      issue.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                      issue.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {issue.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">{issue.status}</td>
                  <td className="py-3 px-4 text-sm font-medium text-orange-600">
                    {issue.hours_remaining ? `${issue.hours_remaining.toFixed(1)}h` : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {new Date(issue.sla_deadline).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.breached.length === 0 && report.at_risk.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 border text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-gray-800">All Clear!</h3>
          <p className="text-gray-500 mt-2">No SLA breaches or at-risk issues</p>
        </div>
      )}
    </div>
  );
}
