import { http } from 'msw';

import stores from '../fixtures/goodPriceStores.json';
import { success } from '../mockStore';

// 004-good-price-stores-sample.sql에서 추출한 42곳. 좌표·메뉴·가격은 원본을 유지한다.
export const goodPriceHandlers = [
  http.get('*/api/maps/good-price-stores', ({ request }) => {
    const params = new URL(request.url).searchParams;
    const latitude = Number(params.get('latitude'));
    const longitude = Number(params.get('longitude'));
    const radius = Number(params.get('radius'));
    const rad = (degrees: number) => (degrees * Math.PI) / 180;
    const nearby = stores
      .map((store) => {
        const a =
          Math.sin(rad(store.latitude - latitude) / 2) ** 2 +
          Math.cos(rad(latitude)) * Math.cos(rad(store.latitude)) * Math.sin(rad(store.longitude - longitude) / 2) ** 2;
        return { ...store, distanceMeters: 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) };
      })
      .filter((store) => store.distanceMeters <= radius)
      .sort((a, b) => a.distanceMeters - b.distanceMeters || a.id - b.id)
      .map((store) => ({ ...store, distanceMeters: Math.round(store.distanceMeters) }));
    return success({
      center: { latitude, longitude },
      radius,
      count: nearby.length,
      dataAsOf: '2026-06-30',
      stores: nearby,
    });
  }),
];
