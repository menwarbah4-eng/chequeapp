import { Cheque, ChequeStatus, User, UserRole, Notification } from './types';

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Alex Morgan',
  email: 'alex@chequeharmony.com',
  role: UserRole.ADMIN,
  avatarUrl: 'https://picsum.photos/200',
  branch: 'Menwar 01'
};

// Initial seed data for the application
export const DEFAULT_BRANCHES = ['Menwar 01', 'JN24', 'Menwar 02'];

export const DEFAULT_CHEQUE_BOOKS = [
  { name: 'Menwar Chequebook', totalLeaves: 50 },
  { name: 'Zakia Chequebook', totalLeaves: 50 }
];

export const DEFAULT_USERS: User[] = [
  {
    id: 'u1',
    name: 'Alex Morgan',
    email: 'alex@chequeharmony.com',
    password: 'admin',
    role: UserRole.ADMIN,
    branch: 'Menwar 01',
    avatarUrl: 'https://picsum.photos/200'
  },
  {
    id: 'u2',
    name: 'Sarah Manager',
    email: 'sarah@chequeharmony.com',
    password: 'user123',
    role: UserRole.MANAGER,
    branch: 'JN24'
  },
  {
    id: 'u3',
    name: 'John User',
    email: 'john@chequeharmony.com',
    password: 'user123',
    role: UserRole.USER,
    branch: 'Menwar 02'
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'Approaching Due Date',
    message: 'Cheque #4552 (Global Supplies) is due tomorrow.',
    type: 'warning',
    read: false,
    date: new Date().toISOString(),
    userId: 'u1'
  },
  {
    id: 'n2',
    title: 'Backend Sync',
    message: 'Your recent changes have been synced to Google Sheets.',
    type: 'success',
    read: true,
    date: new Date(Date.now() - 86400000).toISOString(),
    userId: 'u1'
  },
  {
    id: 'n3',
    title: 'Cheque Bounced',
    message: 'Cheque #000125 was marked as BOUNCED by bank update.',
    type: 'error',
    read: false,
    date: new Date(Date.now() - 172800000).toISOString(),
    userId: 'u1'
  }
];

// Seed data for first run
export const INITIAL_CHEQUES: Cheque[] = [
  {
    id: 'c1',
    chequeNumber: '000123',
    amount: 5000.00,
    payeeName: 'Global Supplies Ltd',
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days from now
    status: ChequeStatus.PENDING,
    bankName: '',
    branch: 'Menwar 01',
    chequeBookRef: 'Menwar Chequebook',
    createdAt: new Date().toISOString(),
    createdBy: 'u1'
  },
  {
    id: 'c2',
    chequeNumber: '000124',
    amount: 1250.50,
    payeeName: 'Office Depot',
    date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], // 5 days ago
    status: ChequeStatus.CLEARED,
    bankName: '',
    branch: 'JN24',
    chequeBookRef: 'Menwar Chequebook',
    createdAt: new Date().toISOString(),
    createdBy: 'u1'
  },
  {
    id: 'c3',
    chequeNumber: '000125',
    amount: 3200.00,
    payeeName: 'Tech Solutions Inc',
    date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    status: ChequeStatus.BOUNCED,
    bankName: '',
    branch: 'Menwar 02',
    chequeBookRef: 'Zakia Chequebook',
    createdAt: new Date().toISOString(),
    createdBy: 'u1'
  },
  {
    id: 'c4',
    chequeNumber: '000126',
    amount: 750.00,
    payeeName: 'Cleaning Services Co',
    date: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
    status: ChequeStatus.PENDING,
    bankName: '',
    branch: 'Menwar 01',
    chequeBookRef: 'Zakia Chequebook',
    createdAt: new Date().toISOString(),
    createdBy: 'u1'
  }
];