import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";
import { LayoutDashboard, PlusCircle, Video, Settings } from "lucide-react";

import DashboardPage from "./pages/DashboardPage";
import CreateProjectPage from "./pages/CreateProjectPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import OutputsPage from "./pages/OutputsPage";
import SettingsPage from "./pages/SettingsPage";

function Layout({ children }) {
  return (
    <div className="flex h-screen bg-background dark:bg-neutral-950">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight">Pomodoro Factory</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground text-sm font-medium ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </NavLink>
          <NavLink
            to="/create"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground text-sm font-medium ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`
            }
          >
            <PlusCircle className="w-4 h-4" />
            Create Project
          </NavLink>
          <NavLink
            to="/outputs"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground text-sm font-medium ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`
            }
          >
            <Video className="w-4 h-4" />
            Outputs
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground text-sm font-medium ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`
            }
          >
            <Settings className="w-4 h-4" />
            Settings
          </NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
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
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
