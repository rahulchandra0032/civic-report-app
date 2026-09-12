import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

export const locationService = {
  requestPermission: async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  getCurrentLocation: async (): Promise<LocationData | null> => {
    try {
      const hasPermission = await locationService.requestPermission();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const address = await locationService.reverseGeocode(
        location.coords.latitude,
        location.coords.longitude
      );

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address,
        accuracy: location.coords.accuracy ?? undefined,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  },

  reverseGeocode: async (lat: number, lng: number): Promise<string> => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const r = results[0];
        return [r.name, r.street, r.district, r.city, r.region]
          .filter(Boolean)
          .join(', ');
      }
    } catch {}
    return '';
  },

  watchLocation: (
    callback: (location: LocationData) => void
  ): Location.LocationSubscription | null => {
    let subscription: Location.LocationSubscription | null = null;

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
        });
      }
    ).then((sub) => {
      subscription = sub;
    });

    return subscription;
  },
};
