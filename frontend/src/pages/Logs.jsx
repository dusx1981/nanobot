import { useState, useEffect, useRef } from 'react';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const [level, setLevel] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [connected, setConnected] = useState(false);
  const logsEndRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const wsUrl = 'ws://localhost:8000/ws/logs';
    
    const connect = () => {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setConnected(true);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const log = JSON.parse(event.data);
          setLogs(prev => [...prev.slice(-999), log]);
        } catch (err) {
          console.error('Failed to parse log:', err);
        }
      };
      
      wsRef.current.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000);
      };
      
      wsRef.current.onerror = () => {
        setConnected(false);
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const clearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = logs.filter(log => {
    if (level !== 'all' && log.level !== level) return false;
    if (filter && !log.message?.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const levelColors = {
    DEBUG: 'text-gray-500',
    INFO: 'text-blue-600',
    WARNING: 'text-yellow-600',
    ERROR: 'text-red-600',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Logs</h2>
        <div className="flex items-center gap-4">
          <span className={`text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}>
            {connected ? '● Connected' : '○ Disconnected'}
          </span>
          <button
            onClick={clearLogs}
            className="text-gray-600 hover:text-gray-800"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter logs..."
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All Levels</option>
            <option value="DEBUG">DEBUG</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 rounded shadow h-96 overflow-auto font-mono text-sm">
        {filteredLogs.length === 0 ? (
          <div className="p-4 text-gray-500">No logs to display</div>
        ) : (
          <div className="p-2">
            {filteredLogs.map((log, idx) => (
              <div key={idx} className="py-1 border-b border-gray-800">
                <span className="text-gray-500">
                  {log.timestamp || new Date().toISOString()}
                </span>{' '}
                <span className={levelColors[log.level] || 'text-gray-300'}>
                  [{log.level || 'INFO'}]
                </span>{' '}
                <span className="text-gray-300">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
