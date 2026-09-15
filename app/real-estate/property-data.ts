export type PropertyListing = {
  slug: string;
  image?: string;
  photos: string[];
  coverUrl?: string;
  tag: string;
  promotion: "turbo" | "vip" | "standard";
  owner: boolean;
  title: string;
  deal: "იყიდება" | "ქირავდება";
  location: string;
  longitude: number;
  latitude: number;
  price: string;
  area: string;
  beds: string;
  phone: string;
  share: string;
  floor: string;
  bedrooms: string;
  views: number;
  description: string;
  contactName?: string;
  remote?: boolean;
};

// Production listings are loaded from Supabase. The local collection stays
// empty so sample properties never appear when the database has no rows.
export const propertyListings: PropertyListing[] = [];
