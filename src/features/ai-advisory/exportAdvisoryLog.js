/**
 * Client-Side CSV Exporter for AI Advisory & Operator Decision History
 * STANAG 4586 GCS Post-Flight Audit Log
 */

export function exportAdvisoryLogToCSV(events = [], missionId = 'M-2025-07-14', uavId = 'UAV-03') {
  if (!events || events.length === 0) {
    alert('No advisory events recorded to export.');
    return;
  }

  const headers = [
    'Timestamp (UTC)',
    'Mission ID',
    'UAV ID',
    'Category',
    'Severity',
    'Condition / Event',
    'Priority Score',
    'Confidence (%)',
    'Operator Acknowledged',
    'Selected Decision',
    'Operator Notes',
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = events.map((ev) => [
    escapeCSV(ev.timestamp || new Date().toISOString()),
    escapeCSV(ev.missionId || missionId),
    escapeCSV(ev.uavId || uavId),
    escapeCSV(ev.category || 'AI'),
    escapeCSV(ev.severity || 'INFO'),
    escapeCSV(ev.description || ev.condition || ''),
    escapeCSV(ev.priorityScore ? `P-${ev.priorityScore}` : ''),
    escapeCSV(ev.confidence ? `${ev.confidence}%` : ''),
    escapeCSV(ev.acknowledged ? 'YES' : 'NO'),
    escapeCSV(ev.selectedDecision || ''),
    escapeCSV(ev.operatorNote || ''),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  if (typeof document === 'undefined') {
    return csvContent;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  link.setAttribute('href', url);
  link.setAttribute('download', `AeroTwin_Advisory_Log_${missionId}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
