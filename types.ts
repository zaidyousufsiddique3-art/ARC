export type Role = 'student' | 'admin' | 'super_admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  photoURL?: string;
  createdAt: number;
  phone?: string;
  targetCountry?: string;
  targetCourse?: string;
  budget?: string;
  highestQualification?: string;
  assignedAdminId?: string;
  profileCompletion?: number;
}

export interface DocumentItem {
  id: string;
  studentId: string;
  name: string;
  type: 'passport' | 'transcript' | 'ielts' | 'resume' | 'financials' | 'other';
  url: string;
  status: 'pending' | 'approved' | 'rejected' | 'requested';
  uploadedAt: number;
  adminNote?: string;
}

export type ApplicationStage =
  | 'Document Collection'
  | 'Application Review'
  | 'University Submission'
  | 'Offer Received'
  | 'Visa Processing'
  | 'Completed';

export interface ApplicationProgress {
  studentId: string;
  currentStage: ApplicationStage;
  history: {
    stage: ApplicationStage;
    timestamp: number;
    completed: boolean;
  }[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string; // studentId
  assignedBy: string; // adminId
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: number;
  createdAt: number;
  subtasks?: { id: string; title: string; completed: boolean }[];
}

export interface Message {
  id: string;
  threadId: string; // usually studentId + adminId
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  timestamp: number;
  tags?: ('urgent' | 'document_request')[];
  read: boolean;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: number;
  seen: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface PSTemplate {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  uploadedAt: number;
  uploadedBy: string;
}

export interface GeneratedPS {
  id: string;
  studentId: string;
  content: string; // Markdown/Text content
  createdAt: number;
  university: string;
  course: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  performedBy: string; // userId
  timestamp: number;
}

export type DocumentType =
  | 'Personal Statement'
  | 'CV'
  | 'Gap Supporting Letter'
  | 'Reference Letter'
  | 'Academic Certificates'
  | 'Predicted Grades'
  | 'Passport'
  | 'Other';

export interface ApplicationDocument {
  id: string;
  name: string; // Original filename
  type: DocumentType;
  customName?: string; // if type is 'Other'
  url: string;
  uploadedAt: number;
  status?: 'Pending' | 'Verified' | 'Rejected';
}

export type ApplicationStatus =
  | 'Pending'
  | 'In Review'
  | 'Submitted'
  | 'Accepted'
  | 'Rejected'
  | 'Missing Docs';

export interface Application {
  id: string;
  studentId: string;
  applicationNumber: string;
  passportNumber?: string;
  fullName: string;
  targetCourses: string[]; // up to 3
  targetUniversities: string[]; // up to 3
  countries: string[]; // up to 3
  budgetPerYear: string;
  highestQualification: string;
  documents: ApplicationDocument[];
  status: ApplicationStatus;
  percentageCompleted: number;
  createdAt: number;
  lastUpdated: number;

  addendums?: {
    id: string;
    text: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    createdAt: number;
    createdBy: string;
    authorName: string;
  }[];
  cancellationRequest?: {
    reason: string;
    requestedAt: number;
    approved: boolean;
    reviewedBy?: string;
    reviewedAt?: number;
  };
}

export interface PersonalStatement {
  id: string;
  studentName: string;
  country: string;
  course: string;
  university: string;
  details: string;
  content: string;
  generatedBy: string; // userId
  createdAt: number;
}