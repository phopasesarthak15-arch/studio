'use client';

import { useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Booking, User } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User as UserIcon, Tractor } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const containerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: 'var(--radius)',
};

const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
};

// Data URI for a simple tractor SVG icon. The color is dark green.
const tractorIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23166534" width="48px" height="48px"><path d="M0 0h24v24H0z" fill="none"/><path d="M20.56 10.88l-2.45-2.45c-.32-.32-.73-.5-1.15-.5H14V5c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1v3H7.41c-.89 0-1.34 1.08-.71 1.71l2.45 2.45c.32.32.73.5 1.15.5H13v3.05c-1.48.54-2.5 1.94-2.5 3.52 0 2.13 1.73 3.87 3.87 3.87 2.13 0 3.87-1.73 3.87-3.87 0-1.58-1.02-2.98-2.5-3.52V13h2.59c.89 0 1.34-1.08.71-1.71zM11 10H8.5L6.25 7.75 5.5 8.5v2H4c-.55 0-1 .45-1 1s.45 1 1 1h1.5v3h1V10zm2 8.62c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
const tractorIcon = `data:image/svg+xml,${tractorIconSvg}`;

// Libraries must match across all useJsApiLoader calls
const libraries: ('maps' | 'places')[] = ['maps', 'places'];

// The main tracker component
export function LiveBookingTracker({ booking }: { booking: Booking }) {
    const firestore = useFirestore();

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-maps-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const driverDocRef = useMemoFirebase(() => (firestore && booking.driverId ? doc(firestore, 'users', booking.driverId) : null), [firestore, booking.driverId]);
    const { data: driver, isLoading: isDriverLoading } = useDoc<User>(driverDocRef);
    
    const ownerDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'users', booking.ownerId) : null), [firestore, booking.ownerId]);
    const { data: owner, isLoading: isOwnerLoading } = useDoc<User>(ownerDocRef);

    const farmerDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'users', booking.farmerId) : null), [firestore, booking.farmerId]);
    const { data: farmer, isLoading: isFarmerLoading } = useDoc<User>(farmerDocRef);

    const mapCenter = useMemo(() => {
        if (driver?.latitude && driver?.longitude) {
            return { lat: driver.latitude, lng: driver.longitude };
        }
        if (farmer?.latitude && farmer?.longitude) {
            return { lat: farmer.latitude, lng: farmer.longitude };
        }
        if (owner?.latitude && owner?.longitude) {
            return { lat: owner.latitude, lng: owner.longitude };
        }
        return { lat: 28.6139, lng: 77.2090 }; // Fallback to Delhi
    }, [driver, farmer, owner]);

    const isLoading = isDriverLoading || isOwnerLoading || isFarmerLoading;

    if (loadError) {
        return <Card><CardContent><p className="p-4 text-destructive">Error: Could not load Google Maps. Please ensure the API key is correct.</p></CardContent></Card>;
    }

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                    <Tractor className="h-5 w-5" />
                    Active Job: {booking.equipmentName}
                </CardTitle>
                <CardDescription>Live tracking for your current booking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Map View */}
                {!isLoaded || isLoading ? (
                    <Skeleton style={containerStyle} />
                ) : (
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={mapCenter}
                        zoom={12}
                        options={mapOptions}
                    >
                        {owner?.latitude && owner?.longitude && (
                            <MarkerF position={{ lat: owner.latitude, lng: owner.longitude }} title="Start (Owner)" icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: "#4ade80", // green
                                fillOpacity: 1,
                                strokeColor: "white",
                                strokeWeight: 2,
                            }} />
                        )}
                         {farmer?.latitude && farmer?.longitude && (
                            <MarkerF position={{ lat: farmer.latitude, lng: farmer.longitude }} title="End (Farmer)" icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: "#f87171", // red
                                fillOpacity: 1,
                                strokeColor: "white",
                                strokeWeight: 2,
                            }} />
                        )}
                        {driver?.latitude && driver?.longitude && (
                           <MarkerF
                                position={{ lat: driver.latitude, lng: driver.longitude }}
                                title="Driver"
                                icon={{
                                    url: tractorIcon,
                                    scaledSize: new window.google.maps.Size(48, 48),
                                    anchor: new window.google.maps.Point(24, 24),
                                }}
                            />
                        )}
                    </GoogleMap>
                )}
                
                <div className="pt-3 border-t">
                    {isLoading ? (
                        <Skeleton className="h-10 w-full" />
                    ) : (
                         driver && (
                            <div className="flex items-center gap-3">
                                 <Avatar>
                                    <AvatarImage src={driver.profilePictureUrl || undefined} />
                                    <AvatarFallback><UserIcon /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{driver.name} (Driver)</p>
                                    <p className="text-sm text-muted-foreground">{driver.contactPhoneNumber}</p>
                                    {driver.latitude && driver.longitude ? (
                                         <p className="text-xs text-green-600 font-mono">
                                            Live at: {driver.latitude.toFixed(4)}, {driver.longitude.toFixed(4)}
                                         </p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">Location not available</p>
                                    )}
                                </div>
                            </div>
                        )
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
