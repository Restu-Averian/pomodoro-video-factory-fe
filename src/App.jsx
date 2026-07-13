import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  Video,
  Settings,
  Crop,
} from "lucide-react";
import { ThemeControl } from "./components/ThemeControl";

import DashboardPage from "./pages/DashboardPage";
import CreateProjectPage from "./pages/CreateProjectPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import OutputsPage from "./pages/OutputsPage";
import SettingsPage from "./pages/SettingsPage";
import VideoReformatterPage from "./pages/VideoReformatterPage";

function Layout({ children }) {
  return (
    <div className="flex h-screen bg-background">
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
            to="/reformatter"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground text-sm font-medium ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`
            }
          >
            <Crop className="w-4 h-4" />
            Video Reformatter
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
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex h-16 shrink-0 items-center justify-end border-b bg-card px-4">
          <ThemeControl />
        </header>
        <div className="min-w-0">{children}</div>
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
          <Route path="/reformatter" element={<VideoReformatterPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
