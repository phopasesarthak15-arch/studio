'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/context/i18n-provider';

interface LocationAutocompleteProps {
  onLocationSelect: (location: { address: string; lat: number | null; lng: number | null }) => void;
  initialValue?: string;
  placeholder?: string;
}

// Define libraries as a stable constant outside the component
const libraries: ('maps' | 'places')[] = ['maps', 'places'];

export function LocationAutocomplete({ onLocationSelect, initialValue = '', placeholder = 'Enter a location' }: LocationAutocompleteProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-maps-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [inputValue, setInputValue] = useState(initialValue);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    if (initialValue) {
        setInputValue(initialValue);
    }
  }, [initialValue]);

  const setupAutocomplete = useCallback(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current) {
        geocoder.current = new window.google.maps.Geocoder();
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: 'in' },
            fields: ['formatted_address', 'geometry.location', 'name'],
            types: ['geocode', 'establishment'],
        });
        autocompleteRef.current = autocomplete;

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location && place.formatted_address) {
                setInputValue(place.formatted_address);
                onLocationSelect({
                    address: place.formatted_address,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                });
            } else if (place.name) {
                // Fallback for when geometry is not available
                setInputValue(place.name);
                 onLocationSelect({
                    address: place.name,
                    lat: null,
                    lng: null,
                });
            }
        });
    }
  }, [isLoaded, onLocationSelect]);

  useEffect(() => {
      setupAutocomplete();
  }, [isLoaded, setupAutocomplete]);

  const handleDetectLocation = () => {
    setDetectingLocation(true);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            if (!geocoder.current) {
                 if (window.google && window.google.maps) {
                    geocoder.current = new window.google.maps.Geocoder();
                } else {
                    toast({ variant: "destructive", title: t('toast_error'), description: 'Google Maps scripts not loaded yet.'});
                    setDetectingLocation(false);
                    return;
                }
            }

            geocoder.current.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
                 if (status === 'OK' && results && results[0]) {
                    const address = results[0].formatted_address;
                    setInputValue(address);
                    onLocationSelect({
                        address,
                        lat: latitude,
                        lng: longitude,
                    });
                    toast({ title: t('toast_address_found'), description: address });
                } else {
                    if (status === window.google.maps.GeocoderStatus.REQUEST_DENIED) {
                         toast({
                            variant: "destructive",
                            title: t('toast_geocoding_api_denied_title'),
                            description: t('toast_geocoding_api_denied_desc'),
                            duration: 9000,
                        });
                    } else {
                        toast({ variant: "destructive", title: t('toast_address_not_found'), description: t('toast_address_not_found_desc') });
                    }
                    console.error(`Geocoding failed due to: ${status}`);
                }
                setDetectingLocation(false);
            });
        }, (error) => {
            toast({ variant: "destructive", title: t('toast_location_error'), description: t('toast_location_error_desc') });
            console.error("Geolocation error:", error);
            setDetectingLocation(false);
        });
    } else {
        toast({ variant: "destructive", title: t('toast_unsupported'), description: t('toast_unsupported_browser_desc') });
        setDetectingLocation(false);
    }
  };

  if (loadError) return <div>Error loading maps. Please ensure your Google Maps API key is configured correctly and the required APIs are enabled.</div>;
  if (!isLoaded) return <div className="h-10 w-full rounded-md bg-muted animate-pulse" />;

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => {
            // When user clicks away, if the input value is not a valid google place, we should still use it.
            if(inputValue && autocompleteRef.current) {
              const place = autocompleteRef.current.getPlace();
              if(!place || place.formatted_address !== inputValue){
                 onLocationSelect({ address: inputValue, lat: null, lng: null });
              }
            }
          }}
          placeholder={placeholder}
          className="flex-grow"
        />
        <Button variant="outline" size="icon" onClick={handleDetectLocation} aria-label={t('detect_location')} disabled={detectingLocation}>
            {detectingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
