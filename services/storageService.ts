
import { Cheque, ChequeStatus, DashboardStats, User, Branch, ChequeBook, AuditLog, Notification, NotificationSettings, UserRole } from '../types';
import { INITIAL_CHEQUES, DEFAULT_BRANCHES, DEFAULT_CHEQUE_BOOKS, DEFAULT_USERS, MOCK_NOTIFICATIONS } from '../constants';

const STORAGE_KEY = 'cheque_harmony_data';
const SETTINGS_KEY = 'cheque_harmony_settings';
const NOTIF_SETTINGS_KEY = 'cheque_harmony_notif_settings';
const NOTIFICATIONS_KEY = 'cheque_harmony_notifications';
const BRANCHES_KEY = 'cheque_harmony_branches';
const BOOKS_KEY = 'cheque_harmony_books';
const USERS_KEY = 'cheque_harmony_users';
const AUDIT_KEY = 'cheque_harmony_audit';

// --- Google Sheets Sync Service ---

const api = {
  getUrl: () => {
    const s = localStorage.getItem(SETTINGS_KEY);
    return s ? JSON.parse(s).scriptUrl : '';
  },
  
  push: async (action: string, payload: any) => {
    const url = api.getUrl();
    if (!url) return;
    
    // Use no-cors to allow firing requests to Google Apps Script without strict CORS preflight issues
    // The backend script must handle the doPost
    try {
      fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' }, // text/plain avoids preflight options
        body: JSON.stringify({ action, ...payload })
      }).catch(err => console.error('Sync Push Error (Background):', err));
    } catch (e) {
      console.error("Sync Push Error:", e);
    }
  },

  fetchAll: async (): Promise<any> => {
    const url = api.getUrl();
    if (!url) return null;

    try {
      const response = await fetch(`${url}?action=getAll`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (e) {
      console.error("Sync Fetch Error:", e);
      return null;
    }
  }
};

// --- Data Loaders (Sync with Backend) ---

export const loadFromBackend = async (): Promise<boolean> => {
  const data = await api.fetchAll();
  if (data) {
    if(data.cheques) localStorage.setItem(STORAGE_KEY, JSON.stringify(data.cheques));
    if(data.branches) localStorage.setItem(BRANCHES_KEY, JSON.stringify(data.branches));
    if(data.chequeBooks) localStorage.setItem(BOOKS_KEY, JSON.stringify(data.chequeBooks));
    if(data.users) localStorage.setItem(USERS_KEY, JSON.stringify(data.users));
    // Notifications and Logs might be local-only or synced depending on preference. 
    // For this template, we'll keep them local or merged.
    return true;
  }
  return false;
};

// --- Cheques ---

export const getCheques = (): Cheque[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    return JSON.parse(data);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CHEQUES));
  return INITIAL_CHEQUES;
};

export const saveCheque = (cheque: Cheque): void => {
  const cheques = getCheques();
  const index = cheques.findIndex(c => c.id === cheque.id);
  let isNew = false;
  if (index >= 0) {
    cheques[index] = cheque;
  } else {
    cheques.push(cheque);
    isNew = true;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cheques));
  
  // Sync
  api.push('SAVE_CHEQUE', { cheque });
  
  // Trigger stock check whenever a cheque is saved (pages used)
  checkAndTriggerStockAlerts();
};

export const saveChequesBatch = (newCheques: Cheque[]): void => {
  const cheques = getCheques();
  const updatedList = [...cheques, ...newCheques];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

  // Sync Batch
  api.push('SAVE_BATCH_CHEQUES', { cheques: newCheques });

  checkAndTriggerStockAlerts();
};

export const deleteCheque = (id: string): void => {
  const cheques = getCheques();
  const filtered = cheques.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  
  // Sync
  api.push('DELETE_CHEQUE', { id });

  // Stock might change (if deleted), trigger check
  checkAndTriggerStockAlerts();
};

// --- Branches ---

export const getBranches = (): Branch[] => {
  const data = localStorage.getItem(BRANCHES_KEY);
  if (data) return JSON.parse(data);
  
  // Seed default branches
  const defaults = DEFAULT_BRANCHES.map(name => ({
    id: crypto.randomUUID(),
    name
  }));
  localStorage.setItem(BRANCHES_KEY, JSON.stringify(defaults));
  return defaults;
};

export const saveBranch = (branch: Branch): void => {
  const branches = getBranches();
  const index = branches.findIndex(b => b.id === branch.id);
  if (index >= 0) {
    branches[index] = branch;
    addAuditLog('Updated Branch', `Updated branch: ${branch.name}`);
  } else {
    branches.push(branch);
    addAuditLog('Added Branch', `Added new branch: ${branch.name}`);
  }
  localStorage.setItem(BRANCHES_KEY, JSON.stringify(branches));
  api.push('SAVE_BRANCH', { branch });
};

export const deleteBranch = (id: string): void => {
  const branches = getBranches();
  const toDelete = branches.find(b => b.id === id);
  const filtered = branches.filter(b => b.id !== id);
  localStorage.setItem(BRANCHES_KEY, JSON.stringify(filtered));
  if (toDelete) addAuditLog('Deleted Branch', `Deleted branch: ${toDelete.name}`);
  api.push('DELETE_BRANCH', { id });
};

// --- Chequebooks ---

export const getChequeBooks = (): ChequeBook[] => {
  const data = localStorage.getItem(BOOKS_KEY);
  if (data) return JSON.parse(data);

  // Seed default chequebooks
  const defaults = DEFAULT_CHEQUE_BOOKS.map(book => ({
    id: crypto.randomUUID(),
    name: book.name,
    totalLeaves: book.totalLeaves,
    dateAdded: new Date().toISOString(),
    status: 'ACTIVE' as const,
    lowStockThreshold: 5 // Default seed threshold
  }));
  localStorage.setItem(BOOKS_KEY, JSON.stringify(defaults));
  return defaults;
};

export const saveChequeBook = (book: ChequeBook): void => {
  const books = getChequeBooks();
  const index = books.findIndex(b => b.id === book.id);
  if (index >= 0) {
    books[index] = book;
    addAuditLog('Updated Chequebook', `Updated chequebook: ${book.name}`);
  } else {
    books.push(book);
    addAuditLog('Added Chequebook', `Added new chequebook: ${book.name}`);
  }
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
  api.push('SAVE_CHEQUEBOOK', { chequeBook: book });
  
  // Trigger check in case threshold changed or total leaves updated
  checkAndTriggerStockAlerts();
};

export const deleteChequeBook = (id: string): void => {
  const books = getChequeBooks();
  const toDelete = books.find(b => b.id === id);
  const filtered = books.filter(b => b.id !== id);
  localStorage.setItem(BOOKS_KEY, JSON.stringify(filtered));
  if (toDelete) addAuditLog('Deleted Chequebook', `Deleted chequebook: ${toDelete.name}`);
  api.push('DELETE_CHEQUEBOOK', { id });
};

// --- Users ---

export const getUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  if (data) return JSON.parse(data);
  
  // Seed default users
  localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
    addAuditLog('Updated User', `Updated details for user: ${user.name}`);
  } else {
    users.push(user);
    addAuditLog('Added User', `Created new user: ${user.name} (${user.role})`);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  api.push('SAVE_USER', { user });
};

export const deleteUser = (id: string): void => {
  const users = getUsers();
  const toDelete = users.find(u => u.id === id);
  const filtered = users.filter(u => u.id !== id);
  localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
  if (toDelete) addAuditLog('Deleted User', `Deleted user: ${toDelete.name}`);
  api.push('DELETE_USER', { id });
};

// --- Notifications ---

export const getNotifications = (userId?: string): Notification[] => {
  const data = localStorage.getItem(NOTIFICATIONS_KEY);
  let allNotifs: Notification[] = [];
  
  if (data) {
    allNotifs = JSON.parse(data);
  } else {
    // Seed mock data on first load
    allNotifs = MOCK_NOTIFICATIONS;
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(allNotifs));
  }

  if (userId) {
    return allNotifs.filter(n => n.userId === userId);
  }
  return allNotifs;
};

export const markNotificationRead = (notifId: string): void => {
  const notifications = getNotifications();
  const updated = notifications.map(n => n.id === notifId ? { ...n, read: true } : n);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
};

export const createNotification = (notification: Omit<Notification, 'id' | 'read' | 'date'>): void => {
  const notifications = getNotifications();
  const newNotif: Notification = {
    ...notification,
    id: crypto.randomUUID(),
    read: false,
    date: new Date().toISOString()
  };
  // Prepend new notification
  const updated = [newNotif, ...notifications];
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
};

export const getNotificationSettings = (): NotificationSettings => {
  const data = localStorage.getItem(NOTIF_SETTINGS_KEY);
  if (data) return JSON.parse(data);
  
  return {
    emailAlerts: false,
    smsAlerts: false,
    defaultStockThreshold: 5
  };
};

export const saveNotificationSettings = (settings: NotificationSettings): void => {
  localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(settings));
};

// --- Logic: Stock Alerts ---

export const checkAndTriggerStockAlerts = (): void => {
  const books = getChequeBooks();
  const settings = getNotificationSettings();
  const users = getUsers();
  const notifications = getNotifications(); // Get all to check duplicates

  books.forEach(book => {
    if (book.status !== 'ACTIVE') return;

    const { used, total } = getChequeBookUsage(book.name);
    const remaining = total - used;
    const threshold = book.lowStockThreshold !== undefined ? book.lowStockThreshold : settings.defaultStockThreshold;

    if (remaining <= threshold) {
      // Identify target users: Admins + Manager of the specific branch
      const targetUsers = users.filter(u => {
        if (u.role === UserRole.ADMIN) return true;
        if (u.role === UserRole.MANAGER && u.branch && book.branchId) {
          // Find branch name for book
          const branches = getBranches();
          const bookBranch = branches.find(b => b.id === book.branchId);
          return bookBranch && bookBranch.name === u.branch;
        }
        return false;
      });

      targetUsers.forEach(user => {
        // Check if an unread alert already exists for this book to avoid spam
        const exists = notifications.some(n => 
          n.userId === user.id && 
          !n.read && 
          n.metadata?.type === 'STOCK_LOW' && 
          n.metadata?.chequeBookId === book.id
        );

        if (!exists) {
          createNotification({
            userId: user.id,
            title: 'Low Stock Alert',
            message: `Chequebook "${book.name}" has only ${remaining} pages remaining (Threshold: ${threshold}).`,
            type: 'warning',
            metadata: {
              type: 'STOCK_LOW',
              chequeBookId: book.id
            }
          });
        }
      });
    }
  });
};


// --- Usage Stats ---

export const getChequeBookUsage = (bookName: string): { used: number, total: number } => {
  const cheques = getCheques();
  const used = cheques.filter(c => c.chequeBookRef === bookName).length;
  
  const books = getChequeBooks();
  const book = books.find(b => b.name === bookName);
  const total = book ? book.totalLeaves : 50; // Default to 50 if not found

  return { used, total };
};

// --- Audit Log ---

export const getAuditLogs = (): AuditLog[] => {
  const data = localStorage.getItem(AUDIT_KEY);
  return data ? JSON.parse(data) : [];
};

export const addAuditLog = (action: string, details: string) => {
  const logs = getAuditLogs();
  const newLog: AuditLog = {
    id: crypto.randomUUID(),
    action,
    details,
    timestamp: new Date().toISOString(),
    userId: 'u1' // Mock User ID
  };
  // Keep last 100 logs
  const updatedLogs = [newLog, ...logs].slice(0, 100);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(updatedLogs));
};

// --- Settings ---

export const syncToBackend = async (data: any): Promise<void> => {
  // Deprecated in favor of direct API calls in save/delete methods
  // Kept for backward compatibility if needed
  console.log('syncToBackend called (legacy)');
};

export const getSettings = () => {
  const s = localStorage.getItem(SETTINGS_KEY);
  return s ? JSON.parse(s) : { scriptUrl: '' };
}

export const saveSettings = (settings: any) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export const calculateStats = (cheques: Cheque[]): DashboardStats => {
  const now = new Date();
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(now.getDate() + 5);

  const stats: DashboardStats = {
    totalCount: cheques.length,
    totalAmount: 0,
    clearedCount: 0,
    clearedAmount: 0,
    pendingCount: 0,
    pendingAmount: 0,
    bouncedCount: 0,
    upcomingCount: 0
  };

  cheques.forEach(c => {
    stats.totalAmount += c.amount;
    
    if (c.status === ChequeStatus.CLEARED) {
      stats.clearedCount++;
      stats.clearedAmount += c.amount;
    } else if (c.status === ChequeStatus.PENDING) {
      stats.pendingCount++;
      stats.pendingAmount += c.amount;
      
      const cDate = new Date(c.date);
      if (cDate >= now && cDate <= fiveDaysFromNow) {
        stats.upcomingCount++;
      }
    } else if (c.status === ChequeStatus.BOUNCED) {
      stats.bouncedCount++;
    }
  });

  return stats;
};

export const exportToCSV = (cheques: Cheque[]) => {
  const headers = ['ID', 'Cheque Number', 'Payee', 'Amount', 'Date', 'Status', 'Last Status Change', 'Branch', 'Split Details', 'Chequebook'];
  const rows = cheques.map(c => {
    let splitDetails = '';
    if (c.splits && c.splits.length > 0) {
        splitDetails = c.splits.map(s => `${s.branch}:${s.amount}`).join(' | ');
    }

    return [
      c.id,
      c.chequeNumber,
      `"${c.payeeName}"`,
      c.amount.toFixed(3),
      c.date,
      c.status,
      c.lastStatusChange || '',
      c.branch,
      `"${splitDetails}"`,
      c.chequeBookRef || ''
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `cheques_export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};