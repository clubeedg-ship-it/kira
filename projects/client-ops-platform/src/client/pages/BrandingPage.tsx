import { useState, type FormEvent } from 'react';
import { useOrgQuery, useOrgMutation } from '../hooks/use-org-query';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

type BrandSettings = {
  id: string;
  companyDisplayName: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  fontHeading: string | null;
  fontBody: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  ctaText: string | null;
  aboutText: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  addressText: string | null;
};

type BrandInput = Partial<BrandSettings>;

export function BrandingPage() {
  const { data, isLoading, error } = useOrgQuery<BrandSettings | null>('branding', 'branding');
  const mutation = useOrgMutation<BrandInput, BrandSettings>('branding', 'patch', ['branding']);

  const [form, setForm] = useState<BrandInput>({});
  const [initialized, setInitialized] = useState(false);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8"><ErrorMessage message={error.message} /></div>;

  if (data && !initialized) {
    setForm({
      companyDisplayName: data.companyDisplayName ?? '',
      primaryColor: data.primaryColor ?? '',
      secondaryColor: data.secondaryColor ?? '',
      accentColor: data.accentColor ?? '',
      fontHeading: data.fontHeading ?? '',
      fontBody: data.fontBody ?? '',
      heroTitle: data.heroTitle ?? '',
      heroSubtitle: data.heroSubtitle ?? '',
      ctaText: data.ctaText ?? '',
      aboutText: data.aboutText ?? '',
      contactEmail: data.contactEmail ?? '',
      contactPhone: data.contactPhone ?? '',
    });
    setInitialized(true);
  }

  function updateField(field: keyof BrandInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Only send non-empty fields
    const payload: Record<string, string> = {};
    for (const [key, value] of Object.entries(form)) {
      if (value && typeof value === 'string' && value.trim()) {
        payload[key] = value.trim();
      }
    }
    mutation.mutate(payload as BrandInput);
  }

  const fields: { key: keyof BrandInput; label: string; type?: string; rows?: number }[] = [
    { key: 'companyDisplayName', label: 'Company Name' },
    { key: 'primaryColor', label: 'Primary Color', type: 'color-text' },
    { key: 'secondaryColor', label: 'Secondary Color', type: 'color-text' },
    { key: 'accentColor', label: 'Accent Color', type: 'color-text' },
    { key: 'fontHeading', label: 'Heading Font' },
    { key: 'fontBody', label: 'Body Font' },
    { key: 'heroTitle', label: 'Hero Title' },
    { key: 'heroSubtitle', label: 'Hero Subtitle' },
    { key: 'ctaText', label: 'CTA Text' },
    { key: 'aboutText', label: 'About Text', rows: 4 },
    { key: 'contactEmail', label: 'Contact Email' },
    { key: 'contactPhone', label: 'Contact Phone' },
  ];

  return (
    <div className="p-8 space-y-6">
      <PageHeader title="Branding & Content" description="Edit your white-label visual identity" />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Identity">
            <div className="space-y-4">
              {fields.slice(0, 6).map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <div className="flex gap-2">
                    {type === 'color-text' && (form[key] as string)?.match(/^#/) && (
                      <div
                        className="w-10 h-10 rounded border border-gray-200 shrink-0"
                        style={{ backgroundColor: (form[key] as string) || '#fff' }}
                      />
                    )}
                    <input
                      type="text"
                      value={(form[key] as string) ?? ''}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Content & Contact">
            <div className="space-y-4">
              {fields.slice(6).map(({ key, label, rows }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  {rows ? (
                    <textarea
                      value={(form[key] as string) ?? ''}
                      onChange={(e) => updateField(key, e.target.value)}
                      rows={rows}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={(form[key] as string) ?? ''}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          {mutation.isSuccess && <span className="text-sm text-green-600">Saved successfully</span>}
          {mutation.error && <ErrorMessage message={mutation.error.message} />}
        </div>
      </form>
    </div>
  );
}
