import { useLocalSearchParams, useRouter } from 'expo-router';

import { PrescriptionDetailScreen } from '@/src/screens/PrescriptionDetailScreen';

const firstParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

export default function PrescriptionDetailRoute() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{
    id?: string | string[];
    photoUri?: string | string[];
    patientName?: string | string[];
    doctorName?: string | string[];
    doctorSpecialty?: string | string[];
    condition?: string | string[];
    tags?: string | string[];
    visitDate?: string | string[];
    notes?: string | string[];
  }>();
  const id = firstParam(rawParams.id);
  const photoUri = firstParam(rawParams.photoUri);
  const patientName = firstParam(rawParams.patientName);
  const doctorName = firstParam(rawParams.doctorName);
  const doctorSpecialty = firstParam(rawParams.doctorSpecialty);
  const condition = firstParam(rawParams.condition);
  const tags = firstParam(rawParams.tags);
  const visitDate = firstParam(rawParams.visitDate);
  const notes = firstParam(rawParams.notes);

  const previewPrescription =
    !id && photoUri && doctorName && condition && visitDate
      ? {
          photoUri,
          patientName: patientName ?? null,
          doctorName,
          doctorSpecialty: doctorSpecialty ?? null,
          condition,
          tags: tags ? tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
          visitDate,
          notes: notes ?? null,
        }
      : undefined;

  return (
    <PrescriptionDetailScreen
      prescriptionId={id}
      previewPrescription={previewPrescription}
      onBack={() => router.back()}
      onEditPrescription={(prescriptionId) =>
        router.push({
          pathname: '/add-edit-prescription',
          params: {
            mode: 'edit',
            id: prescriptionId,
          },
        })
      }
      onDeletedPrescription={() => router.replace('/(tabs)/timeline')}
    />
  );
}
