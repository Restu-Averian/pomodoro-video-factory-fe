import { useState, useEffect } from "react";
import {
  Video,
  ExternalLink,
  CheckCircle,
  Settings,
  User,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { API_BASE_URL } from "../lib/utils";

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
        const popup = window.open(
          data.url,
          "youtube_auth",
          "width=600,height=700",
        );
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
    <div className="flex-1 flex flex-col min-h-0 text-foreground">
      {/* Top Header */}
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-border/10 px-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
          <Settings className="w-4 h-4 text-orange-400" />
          <span>Settings</span>
        </div>
      </header>

      <div className="p-8 space-y-8 max-w-[1400px] w-full mx-auto overflow-y-auto pb-20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
        </div>

        <div className="grid gap-6 max-w-4xl">
          <Card className="rounded-2xl bg-[#1a1715] border-border/10 shadow-none p-6">
            <div className="flex flex-col space-y-2 mb-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Video className="w-6 h-6 text-red-500" />
                YouTube Connection
              </h3>
              <p className="text-sm text-muted-foreground">
                Connect your YouTube account to enable automatic uploads and
                scheduling.
              </p>
            </div>
            <div>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : account ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-semibold text-foreground">
                      Connected to:
                    </span>
                    <span className="text-muted-foreground">
                      {account.name}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleConnect}
                    className="bg-[#241e1a] hover:bg-white/5 border-border/20 text-foreground h-10 px-4 rounded-xl transition-colors font-medium"
                  >
                    Reconnect Account
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleConnect}
                  className="bg-orange-400 hover:bg-orange-500 text-orange-950 font-bold h-10 px-4 rounded-xl transition-colors"
                >
                  Connect YouTube Account
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
