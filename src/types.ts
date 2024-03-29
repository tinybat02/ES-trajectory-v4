export interface MapOptions {
  center_lat: number;
  center_lon: number;
  tile_url: string;
  tile_other: string;
  zoom_level: number;
  other_floor: number;
  showRadius: boolean;
}

export const defaults: MapOptions = {
  center_lat: 48.262725,
  center_lon: 11.66725,
  tile_url: '',
  tile_other: '',
  zoom_level: 18,
  other_floor: 1,
  showRadius: true,
};
