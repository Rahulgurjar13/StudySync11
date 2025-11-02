import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, Users, Target, Calendar, Info, CheckCircle, X, Check, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

interface Partnership {
  _id: string;
  user1Id: any;
  user2Id: any;
  status: string;
  createdAt: string;
  acceptedAt?: string;
}

interface PendingRequest {
  _id: string;
  user1Id: {
    _id: string;
    email: string;
    fullName: string;
    profile?: any;
  };
  status: string;
  createdAt: string;
}

export const PartnerConnection = () => {
  const { user } = useAuth();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      console.log('[PartnerConnection] Fetching all partnership data...');
      
      const [partnershipsData, pendingData, sentData] = await Promise.all([
        api.partnerships.getAll(),
        api.partnerships.getPending(),
        api.partnerships.getSent()
      ]);
      
      console.log('[PartnerConnection] Partnerships:', partnershipsData);
      console.log('[PartnerConnection] Pending:', pendingData);
      console.log('[PartnerConnection] Sent:', sentData);
      
      setPartnerships(partnershipsData || []);
      setPendingRequests(pendingData || []);
      setSentRequests(sentData || []);
    } catch (error: any) {
      console.error('[PartnerConnection] Error fetching data:', error);
      toast.error(error.message || 'Failed to load partnerships');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!partnerEmail.trim()) {
      toast.error("Please enter your partner's email");
      return;
    }

    const cleanEmail = partnerEmail.trim().toLowerCase();
    
    if (cleanEmail === user?.email?.toLowerCase()) {
      toast.error("You cannot connect with yourself!");
      return;
    }

    setConnecting(true);
    try {
      console.log('[PartnerConnection] Sending request to:', cleanEmail);
      const response = await api.partnerships.create(cleanEmail);
      console.log('[PartnerConnection] Request sent successfully:', response);
      toast.success(response.message || "Partnership request sent successfully!");
      setPartnerEmail("");
      await fetchAllData(); // Refresh data
    } catch (error: any) {
      console.error('[PartnerConnection] Error sending request:', error);
      toast.error(error.message || "Failed to send request");
    } finally {
      setConnecting(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      console.log('[PartnerConnection] Accepting request:', requestId);
      const response = await api.partnerships.accept(requestId);
      console.log('[PartnerConnection] Request accepted:', response);
      toast.success(response.message || "Partnership accepted!");
      await fetchAllData(); // Refresh data
    } catch (error: any) {
      console.error('[PartnerConnection] Error accepting request:', error);
      toast.error(error.message || "Failed to accept request");
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      console.log('[PartnerConnection] Declining request:', requestId);
      const response = await api.partnerships.decline(requestId);
      console.log('[PartnerConnection] Request declined:', response);
      toast.success(response.message || "Partnership declined");
      await fetchAllData(); // Refresh data
    } catch (error: any) {
      console.error('[PartnerConnection] Error declining request:', error);
      toast.error(error.message || "Failed to decline request");
    }
  };

  const handleRemove = async (partnershipId: string) => {
    if (!confirm("Are you sure you want to remove this partnership?")) {
      return;
    }
    
    try {
      await api.partnerships.delete(partnershipId);
      toast.success("Partnership removed");
      fetchAllData(); // Refresh data
    } catch (error) {
      toast.error("Failed to remove partnership");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Partner Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading partnerships...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* My Email Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong>Your email:</strong> {user?.email}
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Share this with friends
          </Badge>
        </AlertDescription>
      </Alert>

      {/* Pending Requests (Received) */}
      {pendingRequests.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Clock className="w-5 h-5" />
              Pending Requests ({pendingRequests.length})
            </CardTitle>
            <CardDescription>Partnership requests waiting for your response</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request._id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-orange-100 text-orange-700">
                        {request.user1Id?.fullName?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{request.user1Id?.fullName || "Unknown User"}</p>
                      <p className="text-sm text-muted-foreground">{request.user1Id?.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => handleAccept(request._id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDecline(request._id)}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sent Requests (Waiting) */}
      {sentRequests.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Send className="w-5 h-5" />
              Sent Requests ({sentRequests.length})
            </CardTitle>
            <CardDescription>Waiting for response</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sentRequests.map((request) => (
                <div key={request._id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {request.user2Id?.fullName?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{request.user2Id?.fullName || "Unknown User"}</p>
                      <p className="text-sm text-muted-foreground">{request.user2Id?.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Partners */}
      {partnerships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Active Partners ({partnerships.length})
            </CardTitle>
            <CardDescription>Your connected study partners</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {partnerships.map((partnership) => {
                const partner = partnership.user1Id?._id === user?.id ? partnership.user2Id : partnership.user1Id;
                return (
                  <div key={partnership._id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50/50 border-green-200">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-green-100 text-green-700">
                          {partner?.fullName?.charAt(0) || "P"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {partner?.fullName || partner?.email || "Partner"}
                          </h3>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{partner?.email}</p>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(partnership._id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connect New Partner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Connect with a Partner
          </CardTitle>
          <CardDescription>
            Enter your study partner's email to send a connection request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partner-email">Partner's Email</Label>
              <Input
                id="partner-email"
                type="email"
                placeholder="partner@example.com"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleConnect()}
              />
            </div>
            <Button 
              onClick={handleConnect} 
              disabled={connecting}
              className="w-full"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending Request...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Connection Request
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {partnerships.length === 0 && pendingRequests.length === 0 && sentRequests.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Get started!</strong> Enter your partner's email above to send them a connection request.
            <br />
            They'll need to sign up first if they don't have an account.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
