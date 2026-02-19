import { useLocalSearchParams } from 'expo-router';

import { PrescriptionFormMode, PrescriptionFormScreen } from '@/src/screens/PrescriptionFormScreen';

const firstParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

function normalizeMode(
  mode: string | string[] | undefined,
  id: string | string[] | undefined
): PrescriptionFormMode {
  const normalizedId = firstParam(id);
  const normalizedMode = firstParam(mode);

  if (normalizedId && normalizedId.trim().length > 0) {
    return 'edit';
  }

  if (normalizedMode === 'edit') {
    return 'edit';
  }

  return 'add';
}

export default function AddEditPrescriptionRoute() {
  const { mode, id } = useLocalSearchParams<{ mode?: string | string[]; id?: string | string[] }>();
  const normalizedMode = normalizeMode(mode, id);
  const prescriptionId = firstParam(id);

  return <PrescriptionFormScreen mode={normalizedMode} prescriptionId={prescriptionId} />;
}
