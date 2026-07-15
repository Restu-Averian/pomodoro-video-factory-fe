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
  ChevronLeft,
} from "lucide-react";
import { ThemeControl } from "./components/ThemeControl";
import logo from "./assets/logo.png";

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
      <aside className="w-64 border-r border-border/50 bg-[#161311] flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="p-1 rounded-full border border-orange-500/30 bg-orange-950/20">
            <img
              src={logo}
              alt="Niititu"
              className="w-10 h-10 rounded-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-none text-foreground tracking-tight">
              Niititu
            </h1>
            <span className="text-xs text-muted-foreground mt-1">
              Focus Studio
            </span>
          </div>
        </div>

        <div className="px-4 pb-2">
          <hr className="border-border/30" />
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1.5">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                isActive
                  ? "bg-[#27211d] text-foreground border border-white/5 shadow-sm"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`
            }
          >
            <LayoutDashboard className="w-[18px] h-[18px]" />
            Dashboard
          </NavLink>
          <NavLink
            to="/create"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                isActive
                  ? "bg-[#27211d] text-foreground border border-white/5 shadow-sm"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`
            }
          >
            <PlusCircle className="w-[18px] h-[18px]" />
            Create Project
          </NavLink>
          <NavLink
            to="/outputs"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                isActive
                  ? "bg-[#27211d] text-foreground border border-white/5 shadow-sm"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`
            }
          >
            <Video className="w-[18px] h-[18px]" />
            Outputs
          </NavLink>
          <NavLink
            to="/reformatter"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                isActive
                  ? "bg-[#27211d] text-foreground border border-white/5 shadow-sm"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`
            }
          >
            <Crop className="w-[18px] h-[18px]" />
            Video Reformatter
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                isActive
                  ? "bg-[#27211d] text-foreground border border-white/5 shadow-sm"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`
            }
          >
            <Settings className="w-[18px] h-[18px]" />
            Settings
          </NavLink>
        </nav>

        <div className="p-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            All systems operational
          </div>
          <button className="p-1.5 rounded-lg bg-[#27211d] border border-white/5 hover:bg-white/10 transition-colors text-foreground">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[#1a1715]">
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
