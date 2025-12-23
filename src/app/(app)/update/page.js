import OTAPanel from '@/components/ui/OTAPanel'
import { useLanguage } from '@/context/LanguageContext';

export const metadata = {
  title: 'Firmware Update | Smart Posture Assistant',
  description: 'Manage firmware updates for your posture monitoring device'
}

export default function UpdatePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-black mb-2">
          Firmware Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Update your Posture Bot remotely over-the-air
        </p>
      </div>

      <div className="space-y-6">
        <OTAPanel />
      </div>
    </div>
  )
}