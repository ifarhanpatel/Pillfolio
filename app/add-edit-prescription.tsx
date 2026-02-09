import { useLocalSearchParams } from 'expo-router';

import { PrescriptionFormMode, PrescriptionFormScreen } from '@/src/screens/PrescriptionFormScreen';

function normalizeMode(mode: string | string[] | undefined): PrescriptionFormMode {
  if (mode === 'edit') {
    return 'edit';
  }

  return 'add';
}

export default function AddEditPrescriptionRoute() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const normalizedMode = normalizeMode(mode);

  return <PrescriptionFormScreen mode={normalizedMode} />;
}
