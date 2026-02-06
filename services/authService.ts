import { User } from '../types';

export const authService = {
  // Fetch users from API
  getUsers: async (): Promise<User[]> => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error("Error fetching users:", e);
      return [];
    }
  },

  register: async (username: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
    const users = await authService.getUsers();
    
    if (users.find(u => u.username === username)) {
      return { success: false, message: 'Bu kullanıcı adı zaten alınmış.' };
    }

    const newUser: User = {
      username,
      password,
      role: 'free'
    };

    const newUsers = [...users, newUser];

    try {
        await fetch('/api/users', {
            method: 'POST',
            body: JSON.stringify(newUsers),
            headers: { 'Content-Type': 'application/json' }
        });
        return { success: true, message: 'Kayıt başarılı.', user: newUser };
    } catch (e) {
        return { success: false, message: 'Sunucu hatası.' };
    }
  },

  login: async (username: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
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
        return { success: true, message: 'Premium süreniz doldu, ücretsiz plana geçirildiniz.', user: updatedUser };
    }

    return { success: true, message: 'Giriş başarılı.', user };
  },

  updateUser: async (updatedUser: User): Promise<boolean> => {
    const users = await authService.getUsers();
    const index = users.findIndex(u => u.username === updatedUser.username);
    if (index !== -1) {
      users[index] = { ...users[index], ...updatedUser };
      await fetch('/api/users', {
          method: 'POST',
          body: JSON.stringify(users),
          headers: { 'Content-Type': 'application/json' }
      });
      return true;
    }
    return false;
  },

  deleteUser: async (username: string): Promise<boolean> => {
    let users = await authService.getUsers();
    const initialLength = users.length;
    users = users.filter(u => u.username !== username);
    
    if (users.length < initialLength) {
        await fetch('/api/users', {
            method: 'POST',
            body: JSON.stringify(users),
            headers: { 'Content-Type': 'application/json' }
        });
        return true;
    }
    return false;
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