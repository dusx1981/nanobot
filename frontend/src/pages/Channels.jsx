import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Channels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const res = await api.getChannels();
      setChannels(res.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load channels');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id, currentEnabled) => {
    try {
      const newEnabled = !currentEnabled;
      await api.toggleChannel(id, newEnabled);
      setChannels(channels.map(ch => 
        ch.id === id ? { ...ch, enabled: newEnabled } : ch
      ));
    } catch (err) {
      setError('Failed to toggle channel');
      console.error(err);
    }
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  const channelTypes = {
    telegram: 'Telegram',
    discord: 'Discord',
    slack: 'Slack',
    feishu: 'Feishu',
    dingtalk: 'DingTalk',
    email: 'Email',
    qq: 'QQ',
    whatsapp: 'WhatsApp',
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Channels</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {channels.length === 0 ? (
        <p className="text-gray-500">No channels configured.</p>
      ) : (
        <div className="grid gap-4">
          {channels.map((channel) => (
            <div key={channel.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">
                  {channelTypes[channel.channel_type] || channel.channel_type}
                </h3>
                <p className="text-sm text-gray-600">
                  {channel.name || channel.channel_type}
                </p>
                {channel.config?.bot_token && (
                  <p className="text-xs text-gray-500">Bot token configured</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm ${channel.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {channel.enabled ? 'Connected' : 'Disconnected'}
                </span>
                <button
                  onClick={() => handleToggle(channel.id, channel.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    channel.enabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      channel.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
