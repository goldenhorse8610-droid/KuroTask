import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Tasks from './pages/Tasks';
import Recurring from './pages/Recurring';
import History from './pages/History';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Quick from './pages/Quick';
import Calendar from './pages/Calendar';
import Login from './pages/Login';
import './App.css';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-spinner">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'tasks':
        return <Tasks />;
      case 'recurring':
        return <Recurring />;
      case 'quick':
        return <Quick />;
      case 'calendar':
        return <Calendar />;
      case 'history':
        return <History />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return <Home />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;
