export interface SOSRequestPayload {
  reporterPhone: string;
  content: string;
  latitude: number;
  longitude: number;
}

export interface SOSResponse {
  id: string;
  reporterPhone?: string;
  content?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SOSFormValues {
  reporterPhone: string;
  content: string;
  latitude: number;
  longitude: number;
  locationAddress?: string;
}

export interface LocationIQSuggestion {
  place_id: string;
  osm_id?: string;
  osm_type?: string;
  lat: string;
  lon: string;
  display_name: string;
  display_place?: string;
  display_address?: string;
  address?: {
    name?: string;
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}
