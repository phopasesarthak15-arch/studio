"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Tractor, CalendarCheck, Wrench, ClipboardList, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/context/i18n-provider";

// Define the user data type inline to avoid complex imports
interface AppUserData {
    roles?: string[];
    driverStatus?: 'NONE' | 'PENDING' | 'VERIFIED';
    [key: string]: any;
}

const NavLink = ({ href, icon: Icon, label, badgeCount }: { href: string; icon: React.ElementType; label: string; badgeCount?: number }) => {
    const pathname = usePathname();
    const isActive = pathname.startsWith(href);

    return (
        <Link href={href} className={cn(
            "relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
            isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
        )}>
            <div className="relative p-1">
                <Icon className="h-5 w-5" />
                 {badgeCount && badgeCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                        {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                 )}
            </div>
            <span className="text-xs font-medium tracking-tight">{label}</span>
        </Link>
    );
}

export function BottomNav({ userData, availableJobsCount }: { userData?: AppUserData | null, availableJobsCount?: number }) {
    const { t } = useI18n();
    const roles = userData?.roles || [];
    const isFarmer = roles.includes('FARMER');
    const isOwner = roles.includes('EQUIPMENT_OWNER');
    const isDriver = userData?.driverStatus === 'VERIFIED';

    const navItems = [
        { href: "/dashboard", icon: House, label: t('home'), show: true },
        { href: "/equipment", icon: Tractor, label: t('equipment'), show: true },
        { href: "/my-bookings", icon: CalendarCheck, label: t('my_bookings'), show: isFarmer },
        { href: "/my-equipment", icon: Wrench, label: t('my_equipment'), show: isOwner },
        { href: "/owner-bookings", icon: ClipboardList, label: t('bookings'), show: isOwner },
        { href: "/driver-dashboard", icon: Briefcase, label: "Jobs", show: isDriver, badgeCount: availableJobsCount },
    ].filter(item => item.show);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t bg-background/95 backdrop-blur-sm md:hidden">
            <nav className="flex items-stretch justify-around h-full">
                {navItems.map(item => (
                    <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} badgeCount={(item as any).badgeCount} />
                ))}
            </nav>
        </div>
    );
}
