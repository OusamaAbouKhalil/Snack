import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export function useAdminUsers() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminUsers(data || []);
    } catch (error) {
      console.error('Error fetching admin users:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAdminUser = async (email: string): Promise<boolean> => {
    try {
      // First check if user exists in auth.users
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        // Fallback: try to add directly (user might exist but we can't list them)
        const { error } = await supabase
          .from('admin_users')
          .insert({
            email: email,
            is_active: true
          });

        if (error) {
          if (error.code === '23505') {
            alert('User is already an admin.');
          } else {
            alert('Failed to add admin user. Please ensure the user has an account.');
          }
          return false;
        }
      } else {
        // Find user by email
        const user = users.find(u => u.email === email);
        
        if (!user) {
          alert('User not found. Please make sure the user has an account.');
          return false;
        }

        // Add to admin_users table
        const { error } = await supabase
          .from('admin_users')
          .insert({
            user_id: user.id,
            email: email,
            is_active: true
          });

        if (error) {
          if (error.code === '23505') {
            alert('User is already an admin.');
          } else {
            alert('Failed to add admin user.');
          }
          return false;
        }
      }

      await fetchAdminUsers();
      return true;
    } catch (error) {
      console.error('Error adding admin user:', error);
      alert('Failed to add admin user.');
      return false;
    }
  };

  const removeAdminUser = async (adminId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      await fetchAdminUsers();
      return true;
    } catch (error) {
      console.error('Error removing admin user:', error);
      return false;
    }
  };

  const toggleAdminStatus = async (adminId: string, isActive: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: isActive })
        .eq('id', adminId);

      if (error) throw error;

      await fetchAdminUsers();
      return true;
    } catch (error) {
      console.error('Error updating admin status:', error);
      return false;
    }
  };

  return {
    adminUsers,
    loading,
    addAdminUser,
    removeAdminUser,
    toggleAdminStatus,
    refetch: fetchAdminUsers
  };
}