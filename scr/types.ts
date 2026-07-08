/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Flat {
  number: number;
  status: 'vacant' | 'occupied';
  residentId: string | null;
  residentName: string | null;
}

export interface Floor {
  number: number;
  flats: Flat[];
}

export interface Building {
  name: string;
  floors: Floor[];
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  contact: string;
  rating: number;
}

export interface Society {
  id: string;
  name: string;
  address: string;
  referralCode: string;
  buildings: Building[];
  workers: Worker[];
}

export interface User {
  id: string;
  name: string;
  email?: string;
  password?: string;
  mobile: string;
  role: 'manager' | 'admin' | 'resident';
  status: 'pending' | 'approved' | 'rejected';
  societyId?: string;
  flatInfo?: {
    building: string;
    floor: number;
    flat: number;
  };
  token?: string;
}

export interface JoinRequest {
  id: string;
  residentName: string;
  mobile: string;
  societyId: string;
  referralCode: string;
  building: string;
  floor: number;
  flat: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Query {
  id: string;
  societyId: string;
  residentId: string;
  residentName: string;
  flatInfo: string;
  type: string;
  customText?: string;
  status: 'Submitted' | 'Received by Society Secretary' | 'Under Review' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed' | 'pending' | 'resolved';
  createdAt: string;
}

export interface DatabaseSchema {
  societies: Society[];
  users: User[];
  joinRequests: JoinRequest[];
  queries?: Query[];
  managerSessionToken?: string;
  managerProfile?: {
    isFingerprintEnrolled?: boolean;
    isFaceEnrolled?: boolean;
  };
}
