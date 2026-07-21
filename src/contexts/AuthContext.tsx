import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Customer } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  customer: Customer | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name?: string, phone?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
  updateCustomerProfile: (fields: Partial<Customer>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      checkAdminStatus(session?.user ?? null);
      ensureCustomer(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        checkAdminStatus(session?.user ?? null);
        ensureCustomer(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (user: User | null) => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      setIsAdmin(!!data && !error);
    } catch {
      setIsAdmin(false);
    }
  };

  // Load the customer profile linked to this auth user; create it on first
  // login using the name/phone stashed in user_metadata at signup.
  const ensureCustomer = async (user: User | null) => {
    if (!user) {
      setCustomer(null);
      return;
    }
    try {
      const { data: existing } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        setCustomer(existing as Customer);
        return;
      }

      const meta = (user.user_metadata || {}) as { name?: string; phone?: string };
      const { data: created, error } = await supabase
        .from('customers')
        .insert({
          user_id: user.id,
          name: meta.name || user.email?.split('@')[0] || 'Customer',
          email: user.email ?? null,
          phone: meta.phone || '',
        })
        .select()
        .single();

      if (!error && created) setCustomer(created as Customer);
    } catch {
      setCustomer(null);
    }
  };

  const refreshCustomer = useCallback(async () => {
    const { data: { user: current } } = await supabase.auth.getUser();
    await ensureCustomer(current ?? null);
  }, []);

  const updateCustomerProfile = async (fields: Partial<Customer>) => {
    if (!customer) return { error: new Error('No customer profile') };
    const { data, error } = await supabase
      .from('customers')
      .update(fields)
      .eq('id', customer.id)
      .select()
      .single();
    if (!error && data) setCustomer(data as Customer);
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name?: string, phone?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || '', phone: phone || '' } },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCustomer(null);
    setIsAdmin(false);
  };

  const value = {
    user,
    session,
    isAdmin,
    customer,
    loading,
    signIn,
    signUp,
    signOut,
    refreshCustomer,
    updateCustomerProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
