"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Booking } from "@/lib/data";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookingCard } from "@/components/agri/booking-card";
import { useMemo } from "react";
import { useI18n } from "@/context/i18n-provider";

export default function MyBookingsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { t } = useI18n();

    const bookingsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        // Query for bookings where the user is a participant. This is more secure and flexible.
        return query(
            collection(firestore, "bookings"),
            where("participants", "array-contains", user.uid)
        );
    }, [user, firestore]);

    const { data: allUserBookings, isLoading } = useCollection<Booking>(bookingsQuery);

    // Filter client-side to only show bookings where the user is the farmerId
    const bookings = useMemo(() => {
        if (!allUserBookings || !user) return [];
        return allUserBookings.filter(b => b.farmerId === user.uid);
    }, [allUserBookings, user]);

    const renderContent = () => {
      if (isLoading) {
        return (
          <div className="space-y-4">
            {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-lg" />)}
          </div>
        );
      }

      if (!bookings || bookings.length === 0) {
        return (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="mb-4">{t('no_equipment_booked')}</p>
                <Button asChild>
                  <Link href="/equipment">{t('browse_equipment')}</Link>
              </Button>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          {bookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">{t('my_bookings')}</CardTitle>
                <CardDescription>{t('list_of_bookings')}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderContent()}
            </CardContent>
        </Card>
    );
}
