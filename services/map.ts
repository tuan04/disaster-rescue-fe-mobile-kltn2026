import { MapPointRes } from '@/types/map';
import { get } from './api';

export const getMapPoints = async (): Promise<MapPointRes[]> => {
  const response = await get<MapPointRes[]>('/api/v1/map-points');
  return response.data;
};
