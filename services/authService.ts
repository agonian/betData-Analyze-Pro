import { User } from '../types';

const STORAGE_KEY = 'betdata_users';

// Initialize with default admin if empty
const initStorage = () => {
  const users = localStorage.getItem(STORAGE_KEY);
  if (!users) {
    const defaultAdmin: User = {
      username: 'admin',
      password: 'admin123', // Demo purpose only
      role: 'admin'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultAdmin]));
  }
};

export const authService = {
  getUsers: (): User[] => {
    initStorage();
    const usersStr = localStorage.getItem(STORAGE_KEY);
    return usersStr ? JSON.parse(usersStr) : [];
  },

  register: (username: string, password: string): { success: boolean; message: string; user?: User } => {
    initStorage();
    const users = authService.getUsers();
    
    if (users.find(u => u.username === username)) {
      return { success: false, message: 'Bu kullanıcı adı zaten alınmış.' };
    }

    const newUser: User = {
      username,
      password,
      role: 'free'
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    return { success: true, message: 'Kayıt başarılı.', user: newUser };
  },

  login: (username: string, password: string): { success: boolean; message: string; user?: User } => {
    initStorage();
    const users = authService.getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      return { success: false, message: 'Kullanıcı adı veya şifre hatalı.' };
    }

    if (user.role === 'banned') {
      return { success: false, message: 'Bu hesap yasaklanmıştır. Yönetici ile iletişime geçin.' };
    }

    // Check expiration logic during login
    if (user.role === 'premium' && user.premiumExpiresAt && Date.now() > user.premiumExpiresAt) {
        user.role = 'free';
        user.premiumExpiresAt = undefined;
        authService.updateUser(user);
        return { success: true, message: 'Premium süreniz doldu, ücretsiz plana geçirildiniz.', user };
    }

    return { success: true, message: 'Giriş başarılı.', user };
  },

  updateUser: (updatedUser: User): boolean => {
    const users = authService.getUsers();
    const index = users.findIndex(u => u.username === updatedUser.username);
    if (index !== -1) {
      users[index] = { ...users[index], ...updatedUser }; // Merge to preserve other fields
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      return true;
    }
    return false;
  },

  deleteUser: (username: string): boolean => {
    let users = authService.getUsers();
    const initialLength = users.length;
    users = users.filter(u => u.username !== username);
    
    if (users.length < initialLength) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
        return true;
    }
    return false;
  },

  // Helper to add time
  addPremiumTime: (username: string, durationMinutes: number) => {
    const users = authService.getUsers();
    const user = users.find(u => u.username === username);
    if (user) {
        const now = Date.now();
        // If already premium and not expired, add to existing time, else start from now
        const startTime = (user.role === 'premium' && user.premiumExpiresAt && user.premiumExpiresAt > now) 
            ? user.premiumExpiresAt 
            : now;
            
        user.role = 'premium';
        user.premiumExpiresAt = startTime + (durationMinutes * 60 * 1000);
        authService.updateUser(user);
    }
  }
};