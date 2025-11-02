import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { usePartnership } from "@/hooks/usePartnership";

export const SharedResources = () => {
  const { partnerships } = usePartnership();

  if (partnerships.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Shared Resources
          </CardTitle>
          <CardDescription>
            Connect with a partner to start sharing resources
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No partner connected</p>
          <p className="text-sm text-muted-foreground">Connect with a productivity partner to share resources!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Shared Resources
        </CardTitle>
        <CardDescription>
          Share links, files, and notes with your productivity partner
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center py-8">
        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Shared resources feature coming soon!</p>
        <p className="text-sm text-muted-foreground mt-2">You're connected with a partner.</p>
      </CardContent>
    </Card>
  );
};
