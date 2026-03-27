
import type { Timestamp } from 'firebase/firestore';

export interface Attachment {
  name: string;
  pricePerHour?: number;
  pricePerDay?: number;
  imageUrl?: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: 'Tractor' | 'Mini Tractor' | 'Rotavator' | 'Plough' | 'Harvester' | 'Sprayer' | 'General Farm Equipment';
  attachments?: Attachment[];
  description: string;
  ownerId: string;
  village: string;
  verified: boolean;
  pricePerHour?: number;
  pricePerDay?: number;
  latitude: number;
  longitude: number;
  geohash: string;
  availabilityStatus: 'available' | 'maintenance';
  imageUrl: string;
  imageHint: string;
  createdAt: Timestamp;
}

export interface Booking {
    id: string;
    equipmentId: string;
    equipmentName: string;
    equipmentImageUrl: string;
    equipmentVillage: string;
    equipmentAttachments?: Attachment[];
    ownerId: string;
    farmerId: string; 
    createdBy: string;
    participants: string[];
    
    bookingType: 'hourly' | 'daily';
    startDate: Timestamp;
    endDate: Timestamp;
    duration: number; // in hours or days depending on bookingType
    totalPrice: number;
    driverCharges?: number;
    paymentStatus: 'pending' | 'completed';

    status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completion_pending' | 'completed';
    completionOtp?: string;
    rating?: number;
    ratingDescription?: string;

    driverId?: string;
    drivingJobId?: string;

    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface DrivingJob {
    id: string;
    bookingId: string;
    equipmentId: string;
    equipmentName: string;
    equipmentVillage: string;
    farmerId: string;
    ownerId: string;
    driverId?: string;
    status: 'open' | 'accepted' | 'completed';
    rejectedBy?: string[];
    createdAt: Timestamp;
    updatedAt?: Timestamp;
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

    
