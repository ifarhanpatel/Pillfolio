import { useLocalSearchParams } from 'expo-router';

import { PrescriptionDetailScreen } from '@/src/screens/PrescriptionDetailScreen';

export default function PrescriptionDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return <PrescriptionDetailScreen prescriptionId={id} />;
}
