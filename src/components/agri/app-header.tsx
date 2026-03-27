"use client";

import { useState, useEffect } from "react";
import { CircleUser, LogOut, User as UserIcon, Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth, useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useI18n, Language } from "@/context/i18n-provider";
import { NotificationBell } from "./notification-bell";

const pageTitleKeys: { [key: string]: string } = {
  "/dashboard": "dashboard",
  "/equipment": "equipment_marketplace",
  "/my-bookings": "my_bookings",
  "/my-equipment": "my_equipment",
  "/owner-dashboard": "my_equipment", // Using same as my-equipment
  "/owner-bookings": "bookings_received",
  "/sahayak": "sahayak_dashboard",
  "/driver-dashboard": "driver_dashboard",
  "/equipment/[id]": "equipment_details",
  "/booking/[id]": "book_equipment",
  "/profile": "your_profile",
  "/my-equipment/add": "add_equipment",
};

const languages: { name: string; code: Language }[] = [
  { name: "English", code: "en" },
  { name: "हिन्दी", code: "hi" },
  { name: "मराठी", code: "mr" },
  { name: "తెలుగు", code: "te" },
  { name: "ਪੰਜਾਬੀ", code: "pa" },
  { name: "ગુજરાતી", code: "gu" },
];

const HeaderSkeleton = () => (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-sidebar-border bg-sidebar px-4 md:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 md:hidden bg-sidebar-accent" />
            <Skeleton className="h-6 w-32 bg-sidebar-accent" />
        </div>
        <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full bg-sidebar-accent" />
        </div>
    </header>
);

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { t, setLanguage, language: currentLanguage } = useI18n();
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);
  
  const beneficiaryId = searchParams.get('beneficiaryId');
  const isWorkMode = isMounted && !!beneficiaryId;
  
  const getTitle = () => {
    if (isWorkMode) return t("booking_for_farmer");
    const matchingPath = Object.keys(pageTitleKeys).find(path => {
        const regexPath = `^${path.replace(/\[.*?\]/g, '[^/]+')}$`;
        return new RegExp(regexPath).test(pathname);
    });
    const titleKey = matchingPath ? pageTitleKeys[matchingPath] : "agri_saadhan";
    return t(titleKey);
  }
  
  const title = getTitle();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  }

  const isLoading = isUserLoading || isUserDataLoading;

  const formattedRoles = userData?.roles
    ?.map((role: string) =>
      role
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
    )
    .join(", ");

  if (!isMounted) {
    return <HeaderSkeleton />;
  }

  return (
    <header className={cn(
        "flex h-16 shrink-0 items-center justify-between gap-4 border-b border-sidebar-border bg-sidebar text-sidebar-foreground px-4 md:px-6 sticky top-0 z-30",
        isWorkMode && "bg-amber-600 text-white border-amber-700"
    )}>
      <div className="flex items-center gap-2">
        <SidebarTrigger className={cn("md:hidden", isWorkMode && "border-amber-400 text-white hover:bg-amber-500")} />
        <h1 className={cn("text-lg font-semibold md:text-xl", isWorkMode && "text-white")}>{title}</h1>
      </div>
      
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                <Globe className="h-5 w-5" />
                <span className="sr-only">Change language</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Change Language</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {languages.map((lang) => (
                  <DropdownMenuItem
                      key={lang.code}
                      onSelect={() => setLanguage(lang.code)}
                  >
                      <span className={cn("flex items-center justify-between w-full", currentLanguage === lang.code && "font-semibold")}>
                        {lang.name}
                        {currentLanguage === lang.code && <Check className="h-4 w-4 ml-2" />}
                      </span>
                  </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userData?.profilePictureUrl || undefined} alt={userData?.name} />
                  <AvatarFallback>
                    {isLoading ? (
                      <Skeleton className="h-8 w-8 rounded-full" />
                    ) : (
                      userData?.name ? userData.name[0].toUpperCase() : <CircleUser className="h-5 w-5" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">{t('toggle_user_menu')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : userData?.name ? (
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userData.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.phoneNumber}
                    </p>
                  </div>
                ) : t('my_account')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>{t('profile')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('log_out')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {formattedRoles && (
          <p className="text-[10px] text-sidebar-foreground/80 whitespace-nowrap mt-1">
              Logged in as {formattedRoles}
          </p>
          )}
      </div>
    </header>
  );
}
