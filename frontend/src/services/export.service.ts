import api from '@/lib/api';

type ExportFormat = 'pdf' | 'xlsx' | 'docx' | 'csv';

export const exportService = {
  async exportFacturas(ids: string[], format: ExportFormat): Promise<void> {
    const res = await api.post(
      `/export/facturas/${format}`,
      { ids },
      { responseType: 'blob' },
    );

    const contentType: string =
      String(res.headers['content-type'] ?? 'application/octet-stream');

    const disposition: string = String(res.headers['content-disposition'] ?? '');
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
    const filename = filenameMatch?.[1] ?? `facturas.${contentType.includes('zip') ? 'zip' : format}`;

    const blob = new Blob([res.data], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
