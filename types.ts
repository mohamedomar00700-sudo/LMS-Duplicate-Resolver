
export interface RawUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role?: string; // 'student', 'teacher', 'admin'
  lastLogin?: string; // ISO date string
  courses?: CourseProgress[];
  completedCourseNames: string[]; // List of column headers where status is 'Completed'
  platform: 'Talent' | 'Pharmacy' | 'Master';
  metadata?: Record<string, any>; // Extra fields
}

export interface CourseProgress {
  courseName: string;
  progress: number; // 0-100
  completionStatus?: 'Not Started' | 'In Progress' | 'Completed';
}

export interface MasterEmployee {
  employeeCode: string;
  fullName: string;
  officialEmail: string;
  personalEmail?: string;
  jobTitle?: string;
  branch?: string;
}

export enum EmailType {
  OFFICIAL = 'Official',
  PERSONAL = 'Personal',
  UNKNOWN = 'Unknown'
}

export interface AppSettings {
  fuzzyThreshold: number; // 0.0 to 1.0
  checkIntraPlatform: boolean; // Check A vs A and B vs B
  normalizeArabic: boolean; // Ignore Alef/Taa Marbuta differences
}

export interface ProcessedDuplicate {
  id: string;
  type: 'Inter-Platform' | 'Intra-Talent' | 'Intra-Pharmacy';
  matchReason: 'Exact Email' | 'Same Phone' | 'Fuzzy Name Match';
  matchScore: number; // 0-100
  
  // User Data
  name: string;
  employeeCode?: string;
  
  // Accounts
  accountA?: RawUser; // Talent
  accountB?: RawUser; // Pharmacy
  
  // Email Classification
  emailA_Type?: EmailType;
  emailB_Type?: EmailType;
  
  // Decision
  primaryAccount: 'Talent' | 'Pharmacy' | 'Review Needed';
  primaryEmail: string;
  secondaryEmail: string;
  decisionReason: string;
  
  // Recommendations
  shouldDeleteSecondary: boolean;
  deletionReason: string;
  migrationSteps: MigrationStep[];
  
  warnings: string[];

  // AI Generated Content
  aiAnalysis?: string;
  emailDraft?: string;
}

export interface MigrationStep {
  courseName: string;
  primaryProgress: number;
  secondaryProgress: number;
  action: string;
}

export interface FileData {
  name: string;
  content: string; // CSV content
}
