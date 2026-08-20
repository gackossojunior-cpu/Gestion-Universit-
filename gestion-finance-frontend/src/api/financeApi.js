import apiClient from './client';

export async function getDashboardData() {
  const { data } = await apiClient.get('/dashboard/');
  return data;
}

export async function exportDashboard(format = 'pdf') {
  const response = await apiClient.get('/dashboard/export/', {
    params: { format },
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(
    new Blob([response.data])
  );

  const link = document.createElement('a');

  link.href = url;
  link.setAttribute(
    'download',
    `tableau_de_bord.${format}`
  );

  document.body.appendChild(link);

  link.click();

  link.remove();

  window.URL.revokeObjectURL(url);
}