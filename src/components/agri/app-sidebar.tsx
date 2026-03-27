
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Tractor, CalendarCheck, Wrench, ClipboardList, Users, Briefcase, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/context/i18n-provider";


// Define the user data type inline to avoid complex imports
interface AppUserData {
    roles?: string[];
    sahayakStatus?: 'NONE' | 'PENDING' | 'VERIFIED';
    driverStatus?: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
    [key: string]: any;
}

const NavLink = ({ href, icon: Icon, label, exact = false, badgeCount }: { href: string; icon: React.ElementType; label: string; exact?: boolean; badgeCount?: number}) => {
    const pathname = usePathname();
    const isActive = exact ? pathname === href : pathname.startsWith(href);

    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
            )}
        >
            <Icon className="h-5 w-5" />
            {label}
            {badgeCount && badgeCount > 0 && (
                 <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
                    {badgeCount}
                </span>
            )}
        </Link>
    );
};

export function AppSidebar({ userData, availableJobsCount }: { userData?: AppUserData | null, availableJobsCount?: number }) {
    const { t } = useI18n();
    const roles = userData?.roles || [];
    const isFarmer = roles.includes('FARMER');
    const isOwner = roles.includes('EQUIPMENT_OWNER');
    const isDriver = userData?.driverStatus === 'VERIFIED';
    const isSahayakVerified = userData?.sahayakStatus === 'VERIFIED';
    const isAdmin = roles.includes('ADMIN');

    return (
        <nav className="grid items-start p-2 text-sm font-medium">
            <Link href="/dashboard" className="mb-2 flex items-center justify-center">
                <img
                  src="https://image2url.com/r2/default/images/1771448027626-30acbb98-1ed9-40fa-a44e-8edfcbad9400.jpeg"
                  alt="Agri Saadhan Logo"
                  className="w-auto h-auto max-w-full rounded-md"
                />
            </Link>

            {isAdmin && <NavLink href="/admin/dashboard" icon={Shield} label="Admin Panel" />}

            <NavLink href="/dashboard" icon={Home} label={t('home')} exact />
            <NavLink href="/equipment" icon={Tractor} label={t('equipment')} />

            {isFarmer && (
                 <NavLink href="/my-bookings" icon={CalendarCheck} label={t('my_bookings')} />
            )}

            {isOwner && (
                <>
                    <NavLink href="/my-equipment" icon={Wrench} label={t('my_equipment')} />
                    <NavLink href="/owner-bookings" icon={ClipboardList} label={t('bookings')} />
                </>
            )}

            {isDriver && (
                <NavLink href="/driver-dashboard" icon={Briefcase} label={t('driver_dashboard')} badgeCount={availableJobsCount} />
            )}

            {isSahayakVerified && (
                <NavLink href="/sahayak" icon={Users} label={t('sahayak_dashboard')} />
            )}
        </nav>
    );
}
