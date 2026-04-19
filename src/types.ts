export type UserRole = 'admin' | 'manager' | 'staff';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  gender?: string;
  phone?: string | null;
  phoneNumber?: string | null;
  profilePicture?: string | null;
  branch_id?: string;
  status?: UserStatus;
  createdAt?: string;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  staff_id: string;
  shift_id: string;
  assignment_id?: string;
  attendance_date: string;
  clock_in_time?: string;
  clock_out_time?: string;
  status: string;
  lat?: number;
  lng?: number;
}

export interface Shift {
  id: string;
  name: string;
  branch_id: string;
  start_time: string;
  end_time: string;
  grace_minutes?: number;
}

export interface ShiftAssignment {
  id: string;
  staff_id: string;
  shift_id: string;
  branch_id: string;
  date: string;
  status: 'SCHEDULED' | 'CANCELLED';
  staff?: User;
  shift?: Shift;
  branch?: Branch;
  createdAt?: string;
}

export interface Activity {
  id: string;
  title: string;
  message: string;
  icon: string;
  createdAt: string;
}
