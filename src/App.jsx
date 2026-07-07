import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Video } from 'lucide-react';

import DashboardPage from './pages/DashboardPage';
import CreateProjectPage from './pages/CreateProjectPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import OutputsPage from './pages/OutputsPage';

function Layout({ children }) {
  return (
    <div className="flex h-screen bg-background dark:bg-neutral-950">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight">Pomodoro Factory</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm font-medium">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link to="/create" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm font-medium">
            <PlusCircle className="w-4 h-4" />
            Create Project
          </Link>
          <Link to="/outputs" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm font-medium">
            <Video className="w-4 h-4" />
            Outputs
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/create" element={<CreateProjectPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/outputs" element={<OutputsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
