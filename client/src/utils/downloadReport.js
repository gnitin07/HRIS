import api from '../api/axios';

export async function downloadAttendanceExcel({ fromDate, toDate, department }) {
  if (!fromDate || !toDate) {
    throw new Error('Please select a date range.');
  }

  let url = `/reports/attendance?from_date=${fromDate}&to_date=${toDate}`;
  if (department) {
    url += `&department=${encodeURIComponent(department)}`;
  }

  try {
    const res = await api.get(url, { responseType: 'blob' });

    const contentType = res.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      const text = await res.data.text();
      const err = JSON.parse(text);
      throw new Error(err.message || 'Export failed');
    }

    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${fromDate}_to_${toDate}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      const text = await err.response.data.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.message || 'Export failed');
      } catch (parseErr) {
        if (parseErr.message && parseErr.message !== 'Export failed') throw parseErr;
      }
    }
    throw new Error(err.message || 'Failed to download Excel report');
  }
}
