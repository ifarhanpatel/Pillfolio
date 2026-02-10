import { useRouter } from 'expo-router';

import { TimelineScreen } from '@/src/screens/TimelineScreen';

export default function TimelineRoute() {
  const router = useRouter();

  return (
    <TimelineScreen
      onOpenPrescription={(prescriptionId) =>
        router.push({
          pathname: '/prescription-detail',
          params: { id: prescriptionId },
        })
      }
    />
  );
}
