import type { SqlDriver } from "../db/driver";

export type ImageSource = "camera" | "library";

export type PickedImage = {
  uri: string;
};

export interface DbBoundary {
  open(): Promise<SqlDriver>;
  initialize(driver: SqlDriver): Promise<void>;
}

export interface FileStorageBoundary {
  saveImage(sourceUri: string, targetFileName: string): Promise<string>;
  deleteFile(fileUri: string): Promise<void>;
}

export interface ImagePickerBoundary {
  pickImage(source: ImageSource): Promise<PickedImage | null>;
}

export interface ImageCompressionBoundary {
  compressImage(sourceUri: string): Promise<string>;
}

export interface ClockBoundary {
  nowIso(): string;
}

export type AppBoundaries = {
  db: DbBoundary;
  fileStorage: FileStorageBoundary;
  imagePicker: ImagePickerBoundary;
  imageCompression: ImageCompressionBoundary;
  clock: ClockBoundary;
};
