import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.getTemplates();
      setTemplates(res.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (name) => {
    try {
      const res = await api.getTemplate(name);
      setSelectedTemplate(name);
      setContent(res.data.content || '');
      setSuccess('');
    } catch (err) {
      setError('Failed to load template');
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    try {
      setSaving(true);
      await api.updateTemplate(selectedTemplate, content);
      setSuccess('Template saved successfully');
      setError('');
    } catch (err) {
      setError('Failed to save template');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const templateNames = {
    SOUL: 'Soul (System Prompt)',
    USER: 'User Instructions',
    TOOLS: 'Tools Configuration',
    MEMORY: 'Persistent Memory',
    HEARTBEAT: 'Periodic Tasks',
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Templates</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1">
          <h3 className="font-semibold mb-2">Available Templates</h3>
          <div className="space-y-2">
            {templates.map((t) => (
              <button
                key={t.name}
                onClick={() => handleSelectTemplate(t.name)}
                className={`w-full text-left p-3 rounded border transition-colors ${
                  selectedTemplate === t.name
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{templateNames[t.name] || t.name}</div>
                <div className="text-xs text-gray-500">{t.name}.md</div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-3">
          {selectedTemplate ? (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{templateNames[selectedTemplate] || selectedTemplate}</h3>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-96 border rounded p-3 font-mono text-sm"
                placeholder="Template content..."
              />
            </div>
          ) : (
            <div className="bg-gray-50 h-96 flex items-center justify-center text-gray-500">
              Select a template to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
