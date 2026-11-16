export type TattooSize = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface TattooImage {
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  alt: string;
  blurDataUrl: string;
}

export interface Tattoo {
  id: string;
  slug: string;
  title: string;
  description: string;
  size: TattooSize;
  estimatedPrice: number | null;
  style: string | null;
  placement: string | null;
  image: TattooImage;
  createdAt: string;
}

export interface AdminTattoo extends Tattoo {
  imageAlt: string;
  isPublished: boolean;
  isFeatured: boolean;
  featuredOrder: number | null;
  updatedAt: string;
}

export interface SizeCounts {
  ALL: number;
  SMALL: number;
  MEDIUM: number;
  LARGE: number;
}

export interface PortfolioMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  counts: SizeCounts;
}

export interface ProcessStep {
  title: string;
  body: string;
}
export interface Faq {
  question: string;
  answer: string;
}

export interface SiteSettings {
  artistName: string;
  brandName: string;
  tagline: string;
  homepageIntroduction: string;
  biography: string;
  philosophy: string;
  experience: string;
  styles: string[];
  phone: string;
  whatsappNumber: string;
  instagramUrl: string;
  contactEmail: string;
  location: string;
  portrait: { url: string; width: number; height: number; alt: string } | null;
  processSteps: ProcessStep[];
  faqs: Faq[];
  updatedAt: string;
}

export interface AdminSettings extends SiteSettings {
  portraitAlt?: string;
  featuredLimit: number;
}

export interface TattooDetail {
  tattoo: Tattoo;
  previous: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  related: Tattoo[];
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  idea: string;
  preferredSize: TattooSize | null;
  placement: string | null;
  contactMethod: 'WHATSAPP' | 'PHONE' | 'EMAIL';
  tattooTitle: string | null;
  tattooSlug: string | null;
  status: 'NEW' | 'HANDLED';
  createdAt: string;
}
