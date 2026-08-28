export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface TourPackage {
  id: number;
  title: string;
  slug: string;
  destination: string;
  description: string;
  duration: string;
  price: number;
  image: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface GalleryImage {
  id: number;
  title: string;
  description?: string | null;
  image: string;
  package_id: number | null;
  package_title?: string;
  destination?: string | null;
  price?: number | null;
  is_featured: number | boolean;
  display_order: number;
  created_at: string;
  updated_at?: string;
}

export interface TeamMember {
  id: number;
  name: string;
  designation: string;
  bio: string;
  image: string | null;
  created_at: string;
}

export interface Message {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  is_read: number;
  created_at: string;
}
