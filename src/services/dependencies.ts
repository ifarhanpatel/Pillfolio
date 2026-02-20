import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { initializeDb, openDb } from "../db";
import { STORAGE_DIRS } from "../constants/app";
import type {
  AppBoundaries,
  ClockBoundary,
  DbBoundary,
  FileStorageBoundary,
  ImageCompressionBoundary,
  ImagePickerBoundary,
  ImageSource,
  PickedImage,
} from "./boundaries";

const defaultDbBoundary: DbBoundary = {
  open: openDb,
  initialize: initializeDb,
};

const defaultClockBoundary: ClockBoundary = {
  nowIso: () => new Date().toISOString(),
};

export const resolveImagePickerMediaTypes = (): ImagePicker.MediaType[] => ["images"];

const resolveBaseDirectory = (fileSystem: Record<string, unknown>): string | null => {
  const directDocument = fileSystem.documentDirectory;
  if (typeof directDocument === "string" && directDocument.length > 0) {
    return directDocument;
  }

  const directCache = fileSystem.cacheDirectory;
  if (typeof directCache === "string" && directCache.length > 0) {
    return directCache;
  }

  const paths = fileSystem.Paths as
    | {
        document?: { uri?: string };
        cache?: { uri?: string };
      }
    | undefined;

  const pathsDocument = paths?.document?.uri;
  if (typeof pathsDocument === "string" && pathsDocument.length > 0) {
    return pathsDocument;
  }

  const pathsCache = paths?.cache?.uri;
  if (typeof pathsCache === "string" && pathsCache.length > 0) {
    return pathsCache;
  }

  return null;
};

const joinUri = (baseUri: string, segment: string): string => {
  const normalizedBase = baseUri.endsWith("/") ? baseUri.slice(0, -1) : baseUri;
  const normalizedSegment = segment.replace(/^\/+/, "").replace(/\/+$/, "");
  return `${normalizedBase}/${normalizedSegment}`;
};

const defaultFileStorageBoundary: FileStorageBoundary = {
  async saveImage(sourceUri: string, targetFileName: string): Promise<string> {
    const baseDirectory = resolveBaseDirectory(FileSystem as unknown as Record<string, unknown>);

    if (!baseDirectory) {
      throw new Error("No writable app directory is available.");
    }

    const directoryUri = joinUri(baseDirectory, STORAGE_DIRS.prescriptions);
    await FileSystem.makeDirectoryAsync(directoryUri, { intermediates: true });

    const safeFileName = targetFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const destinationUri = joinUri(directoryUri, safeFileName);

    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });

    return destinationUri;
  },
  async deleteFile(fileUri: string): Promise<void> {
    const info = await FileSystem.getInfoAsync(fileUri);

    if (!info.exists) {
      return;
    }

    await FileSystem.deleteAsync(fileUri, {
      idempotent: true,
    });
  },
};

const defaultImagePickerBoundary: ImagePickerBoundary = {
  async pickImage(source: ImageSource): Promise<PickedImage | null> {
    const imageMediaType = resolveImagePickerMediaTypes();

    if (source === "camera") {
      const existingPermission = await ImagePicker.getCameraPermissionsAsync();
      const permission =
        existingPermission.granted === true
          ? existingPermission
          : await ImagePicker.requestCameraPermissionsAsync();
      if (permission.granted !== true) {
        throw new Error("Camera permission is required.");
      }

      let result;
      try {
        result = await ImagePicker.launchCameraAsync({
          quality: 1,
          allowsEditing: false,
          mediaTypes: imageMediaType,
        });
      } catch (error) {
        const baseMessage =
          error instanceof Error ? error.message : "Unable to launch camera.";
        throw new Error(`Unable to launch camera on this Android device. ${baseMessage}`);
      }

      if (result.canceled || !result.assets[0]?.uri) {
        return null;
      }

      return { uri: result.assets[0].uri };
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.granted !== true) {
      throw new Error("Photo library permission is required.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 1,
      allowsEditing: false,
      mediaTypes: imageMediaType,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return null;
    }

    return { uri: result.assets[0].uri };
  },
};

const defaultImageCompressionBoundary: ImageCompressionBoundary = {
  async compressImage(sourceUri: string): Promise<string> {
    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return result.uri;
  },
};

export const createAppBoundaries = (
  overrides: Partial<AppBoundaries> = {}
): AppBoundaries => {
  return {
    db: overrides.db ?? defaultDbBoundary,
    fileStorage: overrides.fileStorage ?? defaultFileStorageBoundary,
    imagePicker: overrides.imagePicker ?? defaultImagePickerBoundary,
    imageCompression:
      overrides.imageCompression ?? defaultImageCompressionBoundary,
    clock: overrides.clock ?? defaultClockBoundary,
  };
};

export type AppBoundariesOverrides = Partial<AppBoundaries>;
