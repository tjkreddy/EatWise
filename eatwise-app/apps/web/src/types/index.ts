export interface PantryItem {
  id: number;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  expirationDate?: string;
  addedDate?: string;
  notes?: string;
}

export interface HouseholdMember {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'member';
  joinedDate?: string;
  avatarColor?: string;
}

export interface Household {
  id: number;
  name: string;
  members: HouseholdMember[];
  createdDate?: string;
}

export interface AlertItem {
  id: number;
  itemId: number;
  itemName: string;
  expirationDate: string;
  daysUntilExpiry: number;
  severity: 'critical' | 'warning' | 'info';
}

export interface DashboardStats {
  totalItems: number;
  expiringInWeek: number;
  expiredItems: number;
  householdMembers: number;
}
