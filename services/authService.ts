import { User } from '../types';

const SESSION_KEY = 'betdata_user_session';

export const authService = {
  // Load user from local storage on app start
  getCurrentUser: (): User | null => {
    try {
      const storedUser = localStorage.getItem(SESSION_KEY);
      if (storedUser) {
        return JSON.parse(storedUser);
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  // Fetch users from API (Force fresh data)
  getUsers: async (): Promise<User[]> => {
    try {
      // Add timestamp to prevent browser caching
      const res = await fetch(`/api/users?t=${Date.now()}`, {
        headers: { 
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error("Error fetching users:", e);
      return [];
    }
  },

  register: async (username: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
    // We do NOT fetch all users here anymore. We let the server handle the check.
    const newUser: User = {
      username,
      password,
      role: 'free'
    };

    try {
        const res = await fetch('/api/users', {
            method: 'POST',
            body: JSON.stringify({
                action: 'register',
                user: newUser
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            return { success: true, message: 'Kayıt başarılı.', user: newUser };
        } else {
            return { success: false, message: data.message || 'Kayıt başarısız.' };
        }
    } catch (e) {
        return { success: false, message: 'Sunucu hatası.' };
    }
  },

  login: async (username: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
    // For login, we still fetch the list to check credentials client-side for simplicity,
    // but relying on getUsers() which now forces a fresh fetch.
    const users = await authService.getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      return { success: false, message: 'Kullanıcı adı veya şifre hatalı.' };
    }

    if (user.role === 'banned') {
      return { success: false, message: 'Bu hesap yasaklanmıştır. Yönetici ile iletişime geçin.' };
    }

    // Check expiration logic
    if (user.role === 'premium' && user.premiumExpiresAt && Date.now() > user.premiumExpiresAt) {
        // Update user on server
        const updatedUser = { ...user, role: 'free' as const, premiumExpiresAt: undefined };
        await authService.updateUser(updatedUser);
        
        // Save updated session
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
        return { success: true, message: 'Premium süreniz doldu, ücretsiz plana geçirildiniz.', user: updatedUser };
    }

    // Save Session
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));

    return { success: true, message: 'Giriş başarılı.', user };
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  updateUser: async (updatedUser: User): Promise<boolean> => {
    try {
      const res = await fetch('/api/users', {
          method: 'POST',
          body: JSON.stringify({
              action: 'update',
              user: updatedUser
          }),
          headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      return data.success;
    } catch (e) {
        console.error("Update error:", e);
        return false;
    }
  },

  deleteUser: async (username: string): Promise<boolean> => {
    try {
        const res = await fetch('/api/users', {
            method: 'POST',
            body: JSON.stringify({
                action: 'delete',
                username: username
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        return data.success;
    } catch (e) {
        console.error("Delete error:", e);
        return false;
    }
  },

  addPremiumTime: async (username: string, durationMinutes: number) => {
    const users = await authService.getUsers();
    const user = users.find(u => u.username === username);
    
    if (user) {
        const now = Date.now();
        const startTime = (user.role === 'premium' && user.premiumExpiresAt && user.premiumExpiresAt > now) 
            ? user.premiumExpiresAt 
            : now;
            
        user.role = 'premium';
        user.premiumExpiresAt = startTime + (durationMinutes * 60 * 1000);
        
        await authService.updateUser(user);
    }
  }
};