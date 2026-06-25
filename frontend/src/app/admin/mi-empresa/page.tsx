
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Save } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { empresaService } from '@/services/empresa.service';
import { cn } from '@/lib/utils';

const emptyForm = { nombre: '', cuit: '', direccion: '', telefono: '', email: '' };

const fields: { key: keyof typeof emptyForm; label: string; placeholder: string; type?: string }[] = [
  { key: 'nombre',    label: 'Nombre de la empresa',  placeholder: 'Mi Empresa S.A.'           },
  { key: 'cuit',      label: 'CUIT',                   placeholder: '30-12345678-9'              },
  { key: 'direccion', label: 'Dirección',              placeholder: 'Av. Corrientes 1234, CABA'  },
  { key: 'telefono',  label: 'Teléfono',               placeholder: '011-4567-8900'              },
  { key: 'email',     label: 'Email de contacto',      placeholder: 'contacto@empresa.com', type: 'email' },
];

export default function MiEmpresaPage() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    empresaService.get()
      .then((e) => setForm({ nombre: e.nombre, cuit: e.cuit ?? '', direccion: e.direccion ?? '', telefono: e.telefono ?? '', email: e.email ?? '' }))
      .catch(() => toast.error('No se pudo cargar los datos de la empresa'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      await empresaService.update(form);
      toast.success('Datos de la empresa actualizados');
    } catch {
      toast.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Empresa</h1>
          <p className="text-sm text-gray-500 mt-0.5">Datos que aparecen en las facturas emitidas por tu empresa</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50/70 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Datos de la empresa</p>
              <p className="text-xs text-gray-400">Esta información aparece en todas las facturas emitidas</p>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {fields.map(({ key, label, placeholder, type }) => (
                    <div key={key} className={cn('space-y-1.5', key === 'direccion' && 'sm:col-span-2')}>
                      <Label htmlFor={key} className="text-sm font-medium text-gray-700">{label}</Label>
                      <Input
                        id={key}
                        type={type ?? 'text'}
                        placeholder={placeholder}
                        value={form[key]}
                        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                        className="bg-gray-50 focus:bg-white transition-colors"
                      />
                    </div>
                  ))}
                </div>
                <div className="pt-2 flex justify-end">
                  <Button type="submit" disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
