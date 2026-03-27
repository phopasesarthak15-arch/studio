"use client";

import { useState, useMemo, useEffect } from "react";
import { EquipmentCard } from "@/components/agri/equipment-card";
import { VoiceSearch } from "@/components/agri/voice-search";
import type { Equipment } from "@/lib/data";
import type { User } from "@/lib/data-types";
import type { VoiceEquipmentSearchOutput } from "@/ai/flows/voice-equipment-search";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import { useI18n } from "@/context/i18n-provider";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

const equipmentTypes = ["Tractor", "Mini Tractor", "Rotavator", "Plough", "Harvester", "Sprayer", "General Farm Equipment"];

const EquipmentPageSkeleton = () => (
    <div className="space-y-6">
      <div className="space-y-4 p-4 bg-card rounded-lg border">
        <Skeleton className="h-10 w-full" />
        <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({length: 8}).map((_, i) => (
             <CardSkeleton key={i} />
        ))}
      </div>
    </div>
);


const CardSkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <div className="space-y-2 p-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
        </div>
    </div>
);

// Haversine formula to calculate distance
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}


export default function EquipmentPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const firestore = useFirestore();
  const { user } = useUser();
  const { t } = useI18n();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: currentUserData, isLoading: isUserLoading } = useDoc<User>(userDocRef);

  const equipmentColRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'equipment');
  }, [firestore]);

  const { data: allEquipment, isLoading: isEquipmentLoading } = useCollection<Equipment>(equipmentColRef);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const equipmentList = useMemo(() => {
    if (!allEquipment || !currentUserData) return [];
    
    let equipment = allEquipment;

    // Filter by location radius first
    if (currentUserData.latitude && currentUserData.longitude) {
        equipment = equipment.filter(e => {
            if (e.latitude && e.longitude) {
                const distance = getDistanceInKm(
                    currentUserData.latitude!,
                    currentUserData.longitude!,
                    e.latitude,
                    e.longitude
                );
                return distance <= 15;
            }
            return false;
        });
    } else {
        // If user has no location, show no equipment by radius
        return [];
    }
    
    if (selectedType) {
      equipment = equipment.filter(e => e.type === selectedType);
    }

    if (searchQuery) {
        const searchTerms = searchQuery.toLowerCase().split(' ').filter(term => term);
        if (searchTerms.length > 0) {
            equipment = equipment.filter(e => {
                const equipmentText = `${e.name.toLowerCase()} ${e.description?.toLowerCase() || ''}`;
                return searchTerms.every(term => equipmentText.includes(term));
            });
        }
    }

    return equipment;
  }, [allEquipment, searchQuery, selectedType, currentUserData]);
  
  const handleVoiceSearch = (filters: VoiceEquipmentSearchOutput | null) => {
    if (!filters) {
        setSelectedType(null);
        setSearchQuery("");
        return;
    }

    if (filters.equipmentType && filters.equipmentType !== "General Farm Equipment") {
      setSelectedType(filters.equipmentType);
    } else {
      setSelectedType(null);
    }
    
    setSearchQuery(filters.keywords?.join(' ') || "");
  };

  const isLoading = isEquipmentLoading || isUserLoading;
  const isFiltering = !!searchQuery || !!selectedType;

  if (!isMounted || isLoading) {
    return <EquipmentPageSkeleton />;
  }

  if (!currentUserData?.latitude || !currentUserData?.longitude) {
      return (
          <div className="col-span-full text-center py-10">
              <Alert>
                  <MapPin className="h-4 w-4" />
                  <AlertTitle>Location Not Set</AlertTitle>
                  <AlertDescription>
                      Please set your location in your profile to see nearby equipment.
                      <Button asChild variant="link" className="p-1 h-auto">
                        <Link href="/profile">Go to Profile</Link>
                      </Button>
                  </AlertDescription>
              </Alert>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Section */}
      <div className="space-y-4 p-4 bg-card rounded-lg border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder={t('search_placeholder')}
            className="pl-10 text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{t('filters')}</span>
          <Button
            size="sm"
            variant={!selectedType ? "default" : "outline"}
            onClick={() => setSelectedType(null)}
          >
            {t('all')}
          </Button>
          {equipmentTypes.map(type => (
            <Button
              size="sm"
              key={type}
              variant={selectedType === type ? "default" : "outline"}
              onClick={() => setSelectedType(type)}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading && Array.from({length: 8}).map((_, i) => (
             <CardSkeleton key={i} />
        ))}
        {equipmentList && equipmentList.map((item) => (
          <EquipmentCard key={item.id} equipment={item} isOwner={user?.uid === item.ownerId} />
        ))}
        {!isLoading && equipmentList?.length === 0 && (
            <div className="col-span-full text-center py-10">
                <p className="text-lg text-muted-foreground">{isFiltering ? t('no_equipment_matching') : 'No equipment found within 15km of your location.'}</p>
                {isFiltering && <Button variant="link" onClick={() => { setSearchQuery(""); setSelectedType(null); }} className="mt-2">{t('clear_filters')}</Button>}
            </div>
        )}
      </div>

      <VoiceSearch onSearch={handleVoiceSearch} />
    </div>
  );
}
