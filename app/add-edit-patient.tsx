import { useLocalSearchParams } from "expo-router";

import { PatientFormMode, PatientFormScreen } from "@/src/screens/PatientFormScreen";

const firstParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

function normalizeMode(id: string | string[] | undefined): PatientFormMode {
  const normalizedId = firstParam(id);

  if (normalizedId && normalizedId.trim().length > 0) {
    return "edit";
  }

  return "add";
}

export default function AddEditPatientRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const mode = normalizeMode(id);
  const patientId = firstParam(id);

  return <PatientFormScreen mode={mode} patientId={patientId} />;
}
