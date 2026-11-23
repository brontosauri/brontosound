/** The maps providers herd admins can choose with `mapsProvider` in herd settings (docs/maps.md). */
export const MAPS_PROVIDERS = {
    openstreetmap: { name: 'OpenStreetMap', keySetting: null },
    mapbox: { name: 'Mapbox', keySetting: 'mapboxToken' },
    here: { name: 'HERE', keySetting: 'hereApiKey' },
    google: { name: 'Google Maps', keySetting: 'googlemapsToken' },
} as const;

export type MapsProviderId = keyof typeof MAPS_PROVIDERS;

/** What the browser needs to show the selected provider's maps. */
export interface MapsConfig {
    provider: MapsProviderId;
    /** The provider's browser key (Mapbox, HERE, Google). Browser keys are public: restrict them to your domain. */
    key?: string;
    /** OpenStreetMap only: tile URL template. */
    tileServer?: string;
    /** OpenStreetMap only: Nominatim server for place search. */
    nominatimServer?: string;
}
