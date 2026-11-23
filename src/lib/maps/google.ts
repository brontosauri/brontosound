import { LocationLinkType } from '$lib/dbEntities/location';
import { newLocation, placeLinks, type Place, type PlaceLink } from '$lib/maps/place';

type GoogleAddressComponent = {
    long_name: string,
    short_name: string,
    types: string[],
};

/** The parts of a Google Places (legacy) result we use. */
export type GooglePlace = {
    place_id: string,
    geometry: { location: { lat(): number, lng(): number } },
    formatted_address: string,
    name: string,
    address_components: GoogleAddressComponent[],
    url?: string,
    website?: string,
    international_phone_number?: string,
};

export function googlePlaceToPlace(place: GooglePlace): Place {
    const component = (type: string) => place.address_components.find(c => c.types.includes(type))?.long_name;
    const location = newLocation({
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
        formattedAddress: place.formatted_address,
        poiName: place.name,
        googlemapsPlaceId: place.place_id,
        streetNumber: component('street_number'),
        street: component('route'),
        city: component('locality'),
        postalCode: component('postal_code'),
        country: component('country'),
    });

    const placePage: PlaceLink[] = place.url ? [{ type: LocationLinkType.GOOGLE_MAPS_URL, value: place.url }] : [];
    return { location, links: [...placePage, ...placeLinks({ website: place.website, phone: place.international_phone_number })] };
}

let loading: Promise<void> | null = null;

/** Loads the Google Maps JavaScript API, with Places, once per page. */
export function loadGoogleMaps(apiKey: string): Promise<void> {
    loading ??= new Promise((resolve, reject) => {
        const callback = 'brontoGoogleMapsReady';
        const global = window as unknown as Record<string, unknown>;
        global[callback] = () => { delete global[callback]; resolve(); };

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key: apiKey, libraries: 'places', callback })}`;
        script.async = true;
        script.onerror = () => { loading = null; reject(new Error("Couldn't load Google Maps")); };
        document.head.append(script);
    });
    return loading;
}
