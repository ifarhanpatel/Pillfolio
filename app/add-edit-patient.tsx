import { useLocalSearchParams } from "expo-router";

import { PatientFormMode, PatientFormScreen } from "@/src/screens/PatientFormScreen";

function normalizeMode(id: string | string[] | undefined): PatientFormMode {
  if (typeof id === "string" && id.trim().length > 0) {
    return "edit";
  }

  return "add";
}

export default function AddEditPatientRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const mode = normalizeMode(id);
  const patientId = typeof id === "string" ? id : undefined;

  return <PatientFormScreen mode={mode} patientId={patientId} />;
}
