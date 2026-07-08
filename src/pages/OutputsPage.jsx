import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProjects, duplicateProject, deleteProject } from '../lib/api';
import { formatBytes } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OutputsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [duplicating, setDuplicating] = useState(null);

  const fetchOutputs = async () => {
    try {
      const allProjects = await getProjects();
      setProjects(allProjects.filter(p => p.status === 'completed' && p.output_path));
    } catch (err) {
      console.error("Failed to fetch outputs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutputs();
  }, []);

  const handleDuplicate = async (id) => {
    try {
      setDuplicating(id);
      const newProject = await duplicateProject(id);
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      console.error(err);
      setDuplicating(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project? Local files and project data will be deleted.")) return;
    try {
      await deleteProject(id);
      fetchOutputs(); // Refresh list after deletion
    } catch (err) {
      alert(`Failed to delete project: ${err.message}`);
    }
  };

  if (loading) return <div className="p-8">Loading outputs...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Outputs Library</h1>
      
      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No completed outputs yet. Create and render a project first.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(p => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="truncate" title={p.title}>{p.title}</CardTitle>
                <CardDescription className="space-y-1">
                  <div>Duration: {Math.floor((p.rendered_duration_seconds || p.total_duration_seconds) / 60)}m {(p.rendered_duration_seconds || p.total_duration_seconds) % 60}s</div>
                  {p.output_size_bytes && <div>Size: {formatBytes(p.output_size_bytes)}</div>}
                  {p.created_at && <div>Created: {new Date(p.created_at).toLocaleDateString()}</div>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button asChild variant="default" className="flex-1">
                    <a href={`http://localhost:4000${p.output_path}`} target="_blank" rel="noreferrer" download>
                      Download
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link to={`/projects/${p.id}`}>Details</Link>
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1" 
                    onClick={() => handleDuplicate(p.id)}
                    disabled={duplicating === p.id}
                  >
                    {duplicating === p.id ? "Duplicating..." : "Duplicate"}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleDelete(p.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
