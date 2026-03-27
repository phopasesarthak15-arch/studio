import type { Timestamp } from 'firebase/firestore';

export type UserRole = "FARMER" | "EQUIPMENT_OWNER" | "DRIVER" | "SAHAYAK";
export type VerificationStatus = "NONE" | "PENDING" | "VERIFIED";

export interface User {
    id: string;
    name: string;
    contactPhoneNumber: string;
    villageTehsil: string;
    preferredLanguage: string;
    profilePictureUrl?: string;
    gender?: "Male" | "Female" | "Other" | "Prefer not to say";
    roles: UserRole[];
    sahayakStatus: VerificationStatus;
    driverLicenseImageUrl?: string;
    driverStatus: VerificationStatus;
    commissionRate?: number;
    farmSize?: number;
    farmSizeUnit?: 'acre' | 'guntha' | 'hectare';
    latitude?: number;
    longitude?: number;
    geohash?: string;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  description: string;
  read: boolean;
  href?: string;
  createdAt: Timestamp;
}
