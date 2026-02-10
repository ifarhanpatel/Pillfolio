import { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getPrescriptionById } from "@/src/db/prescriptions";
import type { Prescription } from "@/src/db/types";
import { createAppBoundaries } from "@/src/services";

type PrescriptionDetailScreenProps = {
  prescriptionId?: string;
};

export function PrescriptionDetailScreen({
  prescriptionId,
}: PrescriptionDetailScreenProps) {
  const boundaries = useMemo(() => createAppBoundaries(), []);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [message, setMessage] = useState("Loading prescription...");

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!prescriptionId) {
        setMessage("Prescription ID was not provided.");
        return;
      }

      try {
        const driver = await boundaries.db.open();
        await boundaries.db.initialize(driver);
        const found = await getPrescriptionById(driver, prescriptionId);

        if (!active) {
          return;
        }

        if (!found) {
          setMessage("Prescription not found.");
          return;
        }

        setPrescription(found);
        setMessage("");
      } catch (error) {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Unable to load prescription.");
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [boundaries, prescriptionId]);

  return (
    <ThemedView style={styles.container} testID="prescription-detail-screen">
      <ThemedText type="title">Prescription Detail</ThemedText>
      {message ? (
        <ThemedText type="default">{message}</ThemedText>
      ) : (
        <>
          <ThemedText type="default" testID="prescription-detail-photo-uri">
            Photo: {prescription?.photoUri}
          </ThemedText>
          <ThemedText type="default">Doctor: {prescription?.doctorName}</ThemedText>
          <ThemedText type="default">Condition: {prescription?.condition}</ThemedText>
          <ThemedText type="default">Tags: {prescription?.tags.join(", ")}</ThemedText>
          <ThemedText type="default">Visit Date: {prescription?.visitDate}</ThemedText>
        </>
      )}
      <ThemedView style={styles.actions} testID="prescription-detail-actions">
        <ThemedText type="subtitle">Edit</ThemedText>
        <ThemedText type="subtitle">Delete</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  actions: {
    marginTop: 8,
    gap: 8,
  },
});
