import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

interface Partnership {
  _id: string;
  user1Id: any;
  user2Id: any;
  status: string;
  createdAt: string;
}

export const usePartnership = () => {
  const { user } = useAuth();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPartnerships();
    }
  }, [user]);

  const fetchPartnerships = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.partnerships.getAll();
      setPartnerships(data);
    } catch (err: any) {
      console.error('Failed to fetch partnerships:', err);
      setError(err.message || 'Failed to load partnerships');
      setPartnerships([]);
    } finally {
      setLoading(false);
    }
  };

  const connectWithPartner = async (partnerEmail: string) => {
    try {
      const partnership = await api.partnerships.create(partnerEmail);
      setPartnerships([...partnerships, partnership]);
      toast.success('Successfully connected with partner!');
      return partnership;
    } catch (err: any) {
      console.error('Failed to connect with partner:', err);
      const errorMsg = err.message || 'Failed to connect with partner';
      toast.error(errorMsg);
      throw err;
    }
  };

  const removePartnership = async (partnershipId: string) => {
    try {
      await api.partnerships.delete(partnershipId);
      setPartnerships(partnerships.filter(p => p._id !== partnershipId));
      toast.success('Partnership removed');
    } catch (err: any) {
      console.error('Failed to remove partnership:', err);
      toast.error('Failed to remove partnership');
      throw err;
    }
  };

  return {
    partnerships,
    loading,
    error,
    connectWithPartner,
    removePartnership,
    refetch: fetchPartnerships,
  };
};
