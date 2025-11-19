
export enum ChequeStatus {
  PENDING = 'PENDING',
  CLEARED = 'CLEARED',
  BOUNCED = 'BOUNCED',
  CANCELLED = 'CANCELLED'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional for display, required for auth logic
  role: UserRole;
  branch?: string;
  avatarUrl?: string;
}

export interface ChequeSplit {
  branch: string;
  amount: number;
}

export interface Cheque {
  id: string;
  chequeNumber: string;
  amount: number;
  payeeName: string;
  date: string; // YYYY-MM-DD
  status: ChequeStatus;
  lastStatusChange?: string; // ISO Date string
  bankName: string;
  branch: string; // The main branch or "Multi" if split
  splits?: ChequeSplit[]; // Optional breakdown for multi-branch cheques
  chequeBookRef?: string; // e.g., "Book A - 001-050"
  notes?: string;
  imageUrl?: string;
  createdAt: string;
  createdBy: string; // User ID
}

export interface Branch {
  id: string;
  name: string;
}

export interface ChequeBook {
  id: string;
  name: string;
  totalLeaves: number;
  dateAdded: string;
  status: 'ACTIVE' | 'ARCHIVED';
  branchId?: string;
  lowStockThreshold?: number; // Custom threshold for this book
}

export interface AuditLog {
  id: string;
  action: string; // e.g., "Added Branch", "Deleted Chequebook"
  details: string;
  timestamp: string;
  userId: string;
}

export interface DashboardStats {
  totalCount: number;
  totalAmount: number;
  clearedCount: number;
  clearedAmount: number;
  pendingCount: number;
  pendingAmount: number;
  bouncedCount: number;
  upcomingCount: number; // Due in next 5 days
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  date: string;
  userId: string;
  metadata?: {
    type: 'STOCK_LOW';
    chequeBookId: string;
  };
}

export interface NotificationSettings {
  emailAlerts: boolean;
  smsAlerts: boolean;
  defaultStockThreshold: number;
  scriptUrl?: string;
}

export type OcrResult = Partial<Cheque>;
