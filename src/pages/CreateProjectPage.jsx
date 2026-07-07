import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject, uploadProjectAsset } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    focusDurationMinutes: 25,
    breakDurationMinutes: 5,
    sessionCount: 4,
    includeFinalBreak: false,
    timerStyle: 'minimal',
    outputResolution: '1920x1080'
  });

  const [files, setFiles] = useState({
    focusVideo: null,
    breakVideo: null,
    audio: null
  });

  const estimatedDuration = useMemo(() => {
    const focus = form.focusDurationMinutes;
    const brk = form.breakDurationMinutes;
    const count = form.sessionCount;
    
    let totalMins = 0;
    if (form.includeFinalBreak) {
      totalMins = count * (focus + brk);
    } else {
      totalMins = (count * focus) + ((count - 1) * brk);
    }
    
    if (isNaN(totalMins) || totalMins < 0) return '0h 0m';
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins}m`;
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !files.focusVideo || !files.breakVideo || !files.audio) {
      setError("Title, and all 3 files are required.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // 1. Create project
      const project = await createProject(form);
      setUploadProgress(20);

      // 2. Upload assets (could do Promise.all but sequential is safer for progress)
      await uploadProjectAsset(project.id, 'focus_video', files.focusVideo);
      setUploadProgress(50);
      
      await uploadProjectAsset(project.id, 'break_video', files.breakVideo);
      setUploadProgress(80);
      
      await uploadProjectAsset(project.id, 'audio', files.audio);
      setUploadProgress(100);

      // 3. Redirect
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create project');
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Create Project</h1>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                value={form.title} 
                onChange={e => setForm({ ...form, title: e.target.value })} 
                placeholder="e.g. Rainy Coding Room" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={form.description} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
                placeholder="Optional description" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Focus Video (MP4)</Label>
              <Input 
                type="file" 
                accept="video/*" 
                onChange={e => setFiles({ ...files, focusVideo: e.target.files[0] })} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Break Video (MP4)</Label>
              <Input 
                type="file" 
                accept="video/*" 
                onChange={e => setFiles({ ...files, breakVideo: e.target.files[0] })} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Audio (MP3/WAV)</Label>
              <Input 
                type="file" 
                accept="audio/*" 
                onChange={e => setFiles({ ...files, audio: e.target.files[0] })} 
                required 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pomodoro Config</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Focus Duration (minutes)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={form.focusDurationMinutes} 
                  onChange={e => setForm({ ...form, focusDurationMinutes: parseInt(e.target.value) })} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Break Duration (minutes)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  value={form.breakDurationMinutes} 
                  onChange={e => setForm({ ...form, breakDurationMinutes: parseInt(e.target.value) })} 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Session Count</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={form.sessionCount} 
                  onChange={e => setForm({ ...form, sessionCount: parseInt(e.target.value) })} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Timer Style</Label>
                <Select value={form.timerStyle} onValueChange={v => setForm({ ...form, timerStyle: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch 
                checked={form.includeFinalBreak} 
                onCheckedChange={v => setForm({ ...form, includeFinalBreak: v })} 
              />
              <Label>Include Final Break</Label>
            </div>
            
            <div className="mt-4 p-4 bg-secondary rounded-lg">
              <p className="font-semibold text-lg text-secondary-foreground">
                Estimated duration: {estimatedDuration}
              </p>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Creating & Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? 'Creating Project...' : 'Create Project'}
        </Button>
      </form>
    </div>
  );
}
