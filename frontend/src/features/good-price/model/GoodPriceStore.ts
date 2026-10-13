export type GoodPriceStore = {
  id: number;
  name: string;
  businessType: string;
  phone: string | null;
  address: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  menus: Array<{ name: string; price: string | null }>;
};

export type GoodPriceResult = {
  center: { latitude: number; longitude: number };
  radius: 500 | 1000 | 2000;
  count: number;
  dataAsOf: string | null;
  stores: GoodPriceStore[];
};

export const formatStoreDistance = (meters: number): string =>
  meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
