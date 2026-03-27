"use client";

import { useMemo } from "react";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Booking } from "@/lib/data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OwnerBookingCard } from "@/components/agri/owner-booking-card";
import { OwnerBookingHistoryCard } from "@/components/agri/owner-booking-history-card";
import { useI18n } from "@/context/i18n-provider";

export default function OwnerBookingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { t } = useI18n();

  const bookingsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;

    return query(
      collection(firestore, "bookings"),
      where("ownerId", "==", user.uid)
    );
  }, [user, firestore]);

  const { data: ownerBookings, isLoading } = useCollection<Booking>(bookingsQuery);

  const { pendingBookings, otherBookings } = useMemo(() => {
    if (!ownerBookings) {
      return { pendingBookings: [], otherBookings: [] };
    }

    const pending = ownerBookings
      .filter((b) => b.status === "pending")
      .sort(
        (a, b) =>
          (b.createdAt?.toDate?.().getTime?.() || 0) -
          (a.createdAt?.toDate?.().getTime?.() || 0)
      );

    const others = ownerBookings
      .filter((b) => b.status !== "pending")
      .sort(
        (a, b) =>
          (b.createdAt?.toDate?.().getTime?.() || 0) -
          (a.createdAt?.toDate?.().getTime?.() || 0)
      );

    return {
      pendingBookings: pending,
      otherBookings: others,
    };
  }, [ownerBookings]);

  return (
    <div className="space-y-8">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{t('pending_requests')}</CardTitle>
          <CardDescription>
            {t('new_booking_requests')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading && <Skeleton className="h-24 w-full" />}

          {!isLoading && pendingBookings.length > 0 &&
            pendingBookings.map((booking) => (
              <OwnerBookingCard key={booking.id} booking={booking} />
            ))}

          {!isLoading && pendingBookings.length === 0 && (
            <Alert>
              <AlertTitle>{t('all_caught_up')}</AlertTitle>
              <AlertDescription>
                {t('no_pending_requests')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Booking History */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{t('booking_history')}</CardTitle>
          <CardDescription>
            {t('history_of_bookings')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}

          {!isLoading && otherBookings.length > 0 &&
            otherBookings.map((booking) => (
              <OwnerBookingHistoryCard key={booking.id} booking={booking} />
            ))}

          {!isLoading && otherBookings.length === 0 && (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
              {t('no_historical_bookings')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
