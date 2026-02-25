import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Providers from './pages/Providers';
import Channels from './pages/Channels';
import Templates from './pages/Templates';
import Logs from './pages/Logs';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100">
        <nav className="w-64 bg-gray-800 text-white p-4">
          <h1 className="text-xl font-bold mb-6">Nanobot</h1>
          <ul className="space-y-2">
            <li><Link to="/" className="block p-2 rounded hover:bg-gray-700">Dashboard</Link></li>
            <li><Link to="/chat" className="block p-2 rounded hover:bg-gray-700">Chat</Link></li>
            <li><Link to="/providers" className="block p-2 rounded hover:bg-gray-700">Providers</Link></li>
            <li><Link to="/channels" className="block p-2 rounded hover:bg-gray-700">Channels</Link></li>
            <li><Link to="/templates" className="block p-2 rounded hover:bg-gray-700">Templates</Link></li>
            <li><Link to="/logs" className="block p-2 rounded hover:bg-gray-700">Logs</Link></li>
          </ul>
        </nav>
        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/providers" element={<Providers />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
