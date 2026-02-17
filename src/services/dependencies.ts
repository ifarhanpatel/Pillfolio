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

const loadImagePicker = async () => {
  try {
    return await import("expo-image-picker");
  } catch {
    throw new Error(
      "expo-image-picker is required for camera/gallery support."
    );
  }
};

const loadImageManipulator = async () => {
  try {
    return await import("expo-image-manipulator");
  } catch {
    throw new Error("expo-image-manipulator is required for image compression.");
  }
};

const loadFileSystem = async () => {
  try {
    return await import("expo-file-system/legacy");
  } catch {
    throw new Error("expo-file-system legacy API is required for image storage.");
  }
};

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
    const fileSystem = await loadFileSystem();
    const baseDirectory = resolveBaseDirectory(fileSystem as unknown as Record<string, unknown>);

    if (!baseDirectory) {
      throw new Error("No writable app directory is available.");
    }

    const directoryUri = joinUri(baseDirectory, STORAGE_DIRS.prescriptions);
    await fileSystem.makeDirectoryAsync(directoryUri, { intermediates: true });

    const safeFileName = targetFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const destinationUri = joinUri(directoryUri, safeFileName);

    await fileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });

    return destinationUri;
  },
  async deleteFile(fileUri: string): Promise<void> {
    const fileSystem = await loadFileSystem();
    const info = await fileSystem.getInfoAsync(fileUri);

    if (!info.exists) {
      return;
    }

    await fileSystem.deleteAsync(fileUri, {
      idempotent: true,
    });
  },
};

const defaultImagePickerBoundary: ImagePickerBoundary = {
  async pickImage(source: ImageSource): Promise<PickedImage | null> {
    const imagePicker = await loadImagePicker();

    if (source === "camera") {
      const permission = await imagePicker.requestCameraPermissionsAsync();
      if (permission.granted !== true) {
        throw new Error("Camera permission is required.");
      }

      const result = await imagePicker.launchCameraAsync({
        quality: 1,
        allowsEditing: false,
        mediaTypes: imagePicker.MediaTypeOptions.Images,
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return null;
      }

      return { uri: result.assets[0].uri };
    }

    const permission = await imagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.granted !== true) {
      throw new Error("Photo library permission is required.");
    }

    const result = await imagePicker.launchImageLibraryAsync({
      quality: 1,
      allowsEditing: false,
      mediaTypes: imagePicker.MediaTypeOptions.Images,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return null;
    }

    return { uri: result.assets[0].uri };
  },
};

const defaultImageCompressionBoundary: ImageCompressionBoundary = {
  async compressImage(sourceUri: string): Promise<string> {
    const imageManipulator = await loadImageManipulator();
    const result = await imageManipulator.manipulateAsync(
      sourceUri,
      [],
      {
        compress: 0.7,
        format: imageManipulator.SaveFormat.JPEG,
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
