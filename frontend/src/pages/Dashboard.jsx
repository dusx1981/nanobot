import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    providers: 0,
    channels: 0,
    activeChannels: 0,
    messages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [providersRes, channelsRes] = await Promise.all([
        api.getProviders(),
        api.getChannels(),
      ]);
      
      const providers = providersRes.data || [];
      const channels = channelsRes.data || [];
      
      setStats({
        providers: providers.length,
        channels: channels.length,
        activeChannels: channels.filter(c => c.enabled).length,
        messages: 0,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  const statCards = [
    { label: 'LLM Providers', value: stats.providers, color: 'bg-blue-500' },
    { label: 'Channels', value: stats.channels, color: 'bg-green-500' },
    { label: 'Active Channels', value: stats.activeChannels, color: 'bg-purple-500' },
    { label: 'Messages Today', value: stats.messages, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      <div className="grid grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-6">
            <div className={`${stat.color} w-12 h-12 rounded-lg mb-4 flex items-center justify-center`}>
              <span className="text-white text-xl font-bold">{stat.value}</span>
            </div>
            <p className="text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">System Status</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span>API Server</span>
            <span className="text-green-600">● Running</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span>WebSocket</span>
            <span className="text-green-600">● Connected</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span>LLM Provider</span>
            <span className={stats.providers > 0 ? 'text-green-600' : 'text-yellow-600'}>
              ● {stats.providers > 0 ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span>Active Channels</span>
            <span className={stats.activeChannels > 0 ? 'text-green-600' : 'text-gray-500'}>
              ● {stats.activeChannels} active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
