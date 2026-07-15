import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Folder,
  Loader,
  CheckCircle2,
  XCircle,
  Server,
  FileText,
  Eye,
  Trash2,
  Gauge,
  User,
  ChevronDown,
} from "lucide-react";
import {
  checkBackendHealth,
  checkFfmpegHealth,
  getProjects,
  deleteProject,
} from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [health, setHealth] = useState(null);
  const [ffmpegHealth, setFfmpegHealth] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [apiRes, ffmpegRes, projectsRes] = await Promise.all([
        checkBackendHealth(),
        checkFfmpegHealth(),
        getProjects(),
      ]);
      setHealth(apiRes);
      setFfmpegHealth(ffmpegRes);
      setProjects(projectsRes);
    } catch (err) {
      console.error("Error fetching dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this project? Local files and project data will be deleted.",
      )
    )
      return;
    try {
      await deleteProject(id);
      fetchData(); // Refresh list after deletion
    } catch (err) {
      alert(`Failed to delete project: ${err.message}`);
    }
  };

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  const totalProjects = projects.length;
  const renderingJobs = projects.filter(
    (p) => p.status === "queued" || p.status === "rendering",
  ).length;
  const completedProjects = projects.filter(
    (p) => p.status === "completed",
  ).length;
  const failedJobs = projects.filter((p) => p.status === "failed").length;

  return (
    <div className="flex-1 flex flex-col min-h-0 text-foreground">
      {/* Top Header */}
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-border/10 px-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
          <Gauge className="w-4 h-4 text-orange-400" />
          <span>Dashboard</span>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/20 bg-[#241e1a] hover:bg-white/5 transition-colors">
          <User className="w-4 h-4 text-muted-foreground" />
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </header>

      <div className="p-8 space-y-8 max-w-[1400px] w-full mx-auto overflow-y-auto">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="flex flex-row items-center gap-4 p-5 rounded-2xl bg-[#241e1a] border-border/10 shadow-none">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-950/40 border border-orange-500/20">
              <Folder className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium mb-1">
                Total Projects
              </span>
              <span className="text-2xl font-bold text-foreground leading-none">
                {totalProjects}
              </span>
            </div>
          </Card>

          <Card className="flex flex-row items-center gap-4 p-5 rounded-2xl bg-[#241e1a] border-border/10 shadow-none">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-950/40 border border-amber-500/20">
              <Loader className="w-5 h-5 text-amber-500 animate-spin" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium mb-1">
                Rendering
              </span>
              <span className="text-2xl font-bold text-foreground leading-none">
                {renderingJobs}
              </span>
            </div>
          </Card>

          <Card className="flex flex-row items-center gap-4 p-5 rounded-2xl bg-[#241e1a] border-border/10 shadow-none">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-950/30 border border-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium mb-1">
                Completed
              </span>
              <span className="text-2xl font-bold text-foreground leading-none">
                {completedProjects}
              </span>
            </div>
          </Card>

          <Card className="flex flex-row items-center gap-4 p-5 rounded-2xl bg-[#241e1a] border-border/10 shadow-none">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-950/30 border border-red-500/20">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium mb-1">
                Failed
              </span>
              <span className="text-2xl font-bold text-foreground leading-none">
                {failedJobs}
              </span>
            </div>
          </Card>
        </div>

        <Card className="p-6 rounded-2xl bg-[#241e1a] border-border/10 shadow-none flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-foreground" />
            <h2 className="text-base font-semibold text-foreground">
              System Status
            </h2>
          </div>
          <div className="flex items-center gap-10 text-sm">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] ${health?.ok ? "bg-green-500" : "bg-red-500"}`}
              ></span>
              <span className="text-muted-foreground">
                Backend API:{" "}
                <span className="text-foreground">
                  {health?.ok ? "Online" : "Offline"}
                </span>
              </span>
            </div>
            <div className="h-4 w-px bg-border/20"></div>
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] ${ffmpegHealth?.ffmpegInstalled ? "bg-green-500" : "bg-red-500"}`}
              ></span>
              <span className="text-muted-foreground">
                FFmpeg:{" "}
                <span className="text-foreground">
                  {ffmpegHealth?.ffmpegInstalled ? "Installed" : "Missing"}
                </span>
              </span>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl bg-[#241e1a] border-border/10 shadow-none overflow-hidden">
          <div className="p-6 border-b border-border/5 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-semibold text-foreground">
              Latest Projects
            </h2>
          </div>
          <div className="p-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-border/10">
                  <TableHead className="text-muted-foreground font-medium">
                    Title
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Status
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Duration (sec)
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Created
                  </TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow className="hover:bg-white/5 border-b-border/10 border-b-0">
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
                      No projects yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.slice(0, 5).map((p) => (
                    <TableRow
                      key={p.id}
                      className="hover:bg-white/5 border-b-border/5 border-b-0"
                    >
                      <TableCell className="font-medium text-foreground py-4">
                        {p.title}
                      </TableCell>
                      <TableCell className="py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            p.status === "completed"
                              ? "bg-green-950/20 text-green-500 border-green-500/20"
                              : p.status === "failed"
                                ? "bg-red-950/20 text-red-500 border-red-500/20"
                                : "bg-orange-950/20 text-orange-400 border-orange-500/20"
                          }`}
                        >
                          {p.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground py-4">
                        {p.total_duration_seconds}
                      </TableCell>
                      <TableCell className="text-muted-foreground py-4">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right py-4 space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="bg-transparent border-border/20 text-muted-foreground hover:bg-white/10 hover:text-foreground h-8 px-3 rounded-lg"
                        >
                          <Link to={`/projects/${p.id}`}>
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            View
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(p.id)}
                          className="bg-red-950/10 border-red-900/30 text-red-400 hover:bg-red-900/20 hover:text-red-300 h-8 px-3 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
