'use client'
import OTAPanel from '@/components/ui/OTAPanel'
import { useLanguage } from '@/context/LanguageContext';

export default function UpdatePage() {
  const { t } = useLanguage();
  
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-black mb-2">
          {t.firm_mag}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t.update_desc}
        </p>
      </div>

      <div className="space-y-6">
        <OTAPanel />
      </div>
    </div>
  )
}