import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import LocationAddressSheet from '@/pages/map-location-select/ui/location-address-sheet/LocationAddressSheet';

const noAddress = { address: null, roadAddress: null, jibunAddress: null, latitude: 34.9, longitude: 125.1 };

it.each(['unsupported', 'error'] as const)(
  '주소가 없는 자리(%s)는 지원하지 않는 주소라고 보이고 그 위치를 적용할 수 있다',
  (status) => {
    render(<LocationAddressSheet selected={noAddress} status={status} onConfirm={vi.fn()} />);
    expect(screen.getByText('지원하지 않는 주소입니다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이 위치로 저장' })).toBeEnabled();
  },
);

it('주소를 확인하는 동안에는 적용하지 못한다', () => {
  render(<LocationAddressSheet selected={noAddress} status="geocoding" onConfirm={vi.fn()} />);
  expect(screen.getByText('주소를 확인하는 중이에요')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '이 위치로 저장' })).toBeDisabled();
});
