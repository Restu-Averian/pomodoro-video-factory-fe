import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { checkBackendHealth, checkFfmpegHealth, getProjects, deleteProject } from "../lib/api";
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
    if (!window.confirm("Are you sure you want to delete this project? Local files and project data will be deleted.")) return;
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
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rendering</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renderingJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedJobs}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${health?.ok ? "bg-green-500" : "bg-red-500"}`}
              ></span>
              <span>Backend API: {health?.ok ? "Online" : "Offline"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${ffmpegHealth?.ffmpegInstalled ? "bg-green-500" : "bg-red-500"}`}
              ></span>
              <span>
                FFmpeg:{" "}
                {ffmpegHealth?.ffmpegInstalled ? "Installed" : "Missing"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration (sec)</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No projects yet.
                  </TableCell>
                </TableRow>
              ) : (
                projects.slice(0, 5).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "completed"
                            ? "default"
                            : p.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.total_duration_seconds}</TableCell>
                    <TableCell>
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/projects/${p.id}`}>View</Link>
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
