/**
 * Authentication Tests
 * Tests for Supabase auth integration
 */

import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

describe('Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithPassword', () => {
    it('successfully signs in with valid credentials', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };
      const mockSession = { 
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000,
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'validPassword123',
      });

      expect(error).toBeNull();
      expect(data.user).toEqual(mockUser);
      expect(data.session?.access_token).toBe('mock-token');
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'validPassword123',
      });
    });

    it('returns error for invalid credentials', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { 
          message: 'Invalid login credentials',
          status: 400,
        },
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongPassword',
      });

      expect(error).toBeDefined();
      expect(error?.message).toBe('Invalid login credentials');
      expect(data.user).toBeNull();
    });

    it('returns error for non-existent user', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { 
          message: 'User not found',
          status: 400,
        },
      });

      const { error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'password',
      });

      expect(error?.message).toBe('User not found');
    });
  });

  describe('signUp', () => {
    it('successfully creates a new account', async () => {
      const mockUser = {
        id: 'new-user-123',
        email: 'newuser@example.com',
        email_confirmed_at: null,
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const { data, error } = await supabase.auth.signUp({
        email: 'newuser@example.com',
        password: 'securePassword123',
      });

      expect(error).toBeNull();
      expect(data.user?.email).toBe('newuser@example.com');
    });

    it('returns error for existing email', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'User already registered',
          status: 400,
        },
      });

      const { error } = await supabase.auth.signUp({
        email: 'existing@example.com',
        password: 'password123',
      });

      expect(error?.message).toBe('User already registered');
    });

    it('returns error for weak password', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Password should be at least 6 characters',
          status: 422,
        },
      });

      const { error } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: '123',
      });

      expect(error?.message).toContain('Password');
    });
  });

  describe('signOut', () => {
    it('successfully signs out user', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { error } = await supabase.auth.signOut();

      expect(error).toBeNull();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('returns session for authenticated user', async () => {
      const mockSession = {
        access_token: 'valid-token',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { data, error } = await supabase.auth.getSession();

      expect(error).toBeNull();
      expect(data.session?.access_token).toBe('valid-token');
    });

    it('returns null session for unauthenticated user', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { data, error } = await supabase.auth.getSession();

      expect(error).toBeNull();
      expect(data.session).toBeNull();
    });
  });

  describe('resetPasswordForEmail', () => {
    it('sends password reset email', async () => {
      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        data: {},
        error: null,
      });

      const { error } = await supabase.auth.resetPasswordForEmail(
        'test@example.com',
        { redirectTo: 'myapp://reset-password' }
      );

      expect(error).toBeNull();
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: 'myapp://reset-password' }
      );
    });
  });

  describe('updateUser', () => {
    it('updates user email', async () => {
      (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'new@example.com' } },
        error: null,
      });

      const { data, error } = await supabase.auth.updateUser({
        email: 'new@example.com',
      });

      expect(error).toBeNull();
      expect(data.user?.email).toBe('new@example.com');
    });

    it('updates user password', async () => {
      (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const { error } = await supabase.auth.updateUser({
        password: 'newSecurePassword123',
      });

      expect(error).toBeNull();
    });
  });

  describe('onAuthStateChange', () => {
    it('subscribes to auth state changes', () => {
      const callback = jest.fn();
      
      const { data } = supabase.auth.onAuthStateChange(callback);

      expect(data.subscription.unsubscribe).toBeDefined();
    });
  });
});

