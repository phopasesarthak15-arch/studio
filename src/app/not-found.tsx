"use client";
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/context/i18n-provider';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <h2 className="text-3xl font-bold font-headline mb-4">{t('page_not_found')}</h2>
      <p className="text-muted-foreground mb-6">{t('page_not_found_desc')}</p>
      <Button asChild>
        <Link href="/dashboard">{t('return_home')}</Link>
      </Button>
    </div>
  )
}
