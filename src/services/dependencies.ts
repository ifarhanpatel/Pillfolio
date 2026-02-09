import { initializeDb, openDb } from "../db";
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

class UnimplementedBoundaryError extends Error {
  constructor(boundary: string) {
    super(`${boundary} boundary is not configured.`);
  }
}

const defaultDbBoundary: DbBoundary = {
  open: openDb,
  initialize: initializeDb,
};

const defaultClockBoundary: ClockBoundary = {
  nowIso: () => new Date().toISOString(),
};

const defaultFileStorageBoundary: FileStorageBoundary = {
  async saveImage(): Promise<string> {
    throw new UnimplementedBoundaryError("FileStorage");
  },
  async deleteFile(): Promise<void> {
    throw new UnimplementedBoundaryError("FileStorage");
  },
};

const defaultImagePickerBoundary: ImagePickerBoundary = {
  async pickImage(_source: ImageSource): Promise<PickedImage | null> {
    throw new UnimplementedBoundaryError("ImagePicker");
  },
};

const defaultImageCompressionBoundary: ImageCompressionBoundary = {
  async compressImage(): Promise<string> {
    throw new UnimplementedBoundaryError("ImageCompression");
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
