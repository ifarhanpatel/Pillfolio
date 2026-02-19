import { useLocalSearchParams } from 'expo-router';

import { PrescriptionFormMode, PrescriptionFormScreen } from '@/src/screens/PrescriptionFormScreen';

function normalizeMode(
  mode: string | string[] | undefined,
  id: string | string[] | undefined
): PrescriptionFormMode {
  if (typeof id === 'string' && id.trim().length > 0) {
    return 'edit';
  }

  if (mode === 'edit') {
    return 'edit';
  }

  return 'add';
}

export default function AddEditPrescriptionRoute() {
  const { mode, id } = useLocalSearchParams<{ mode?: string; id?: string }>();
  const normalizedMode = normalizeMode(mode, id);
  const prescriptionId = typeof id === 'string' ? id : undefined;

  return <PrescriptionFormScreen mode={normalizedMode} prescriptionId={prescriptionId} />;
}
