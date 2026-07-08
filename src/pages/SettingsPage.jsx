import { useState, useEffect } from 'react';
import { Video, ExternalLink, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { API_BASE_URL } from '../lib/utils';

export default function SettingsPage() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccount();
  }, []);

  const fetchAccount = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/youtube/accounts`);
      const data = await res.json();
      if (data.connected) {
        setAccount(data);
      } else {
        setAccount(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/youtube/auth/url`);
      const data = await res.json();
      if (data.url) {
        const popup = window.open(data.url, 'youtube_auth', 'width=600,height=700');
        const interval = setInterval(() => {
          if (popup.closed) {
            clearInterval(interval);
            fetchAccount();
          }
        }, 1000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-red-500" />
              YouTube Connection
            </CardTitle>
            <CardDescription>
              Connect your YouTube account to enable automatic uploads and scheduling.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : account ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium">Connected to:</span> {account.name}
                </div>
                <Button variant="outline" onClick={handleConnect}>
                  Reconnect Account
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnect}>
                Connect YouTube Account
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
