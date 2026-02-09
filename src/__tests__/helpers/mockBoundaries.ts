import type { SqlDriver } from "../../db/driver";
import type {
  AppBoundaries,
  ClockBoundary,
  DbBoundary,
  FileStorageBoundary,
  ImageCompressionBoundary,
  ImagePickerBoundary,
  ImageSource,
  PickedImage,
} from "../../services";
import { createAppBoundaries } from "../../services";
import { FakeDriver } from "./fakeDriver";

export class MockClockBoundary implements ClockBoundary {
  constructor(private readonly isoNow: string = "2025-02-01T10:00:00.000Z") {}

  nowIso(): string {
    return this.isoNow;
  }
}

export class MockDbBoundary implements DbBoundary {
  public readonly driver: SqlDriver;
  public initializeCalls = 0;

  constructor(driver?: SqlDriver) {
    this.driver = driver ?? new FakeDriver();
  }

  async open(): Promise<SqlDriver> {
    return this.driver;
  }

  async initialize(): Promise<void> {
    this.initializeCalls += 1;
  }
}

export class MockFileStorageBoundary implements FileStorageBoundary {
  public savedImages: { sourceUri: string; targetFileName: string }[] = [];
  public deletedFiles: string[] = [];

  async saveImage(sourceUri: string, targetFileName: string): Promise<string> {
    this.savedImages.push({ sourceUri, targetFileName });
    return `file://mock-storage/${targetFileName}`;
  }

  async deleteFile(fileUri: string): Promise<void> {
    this.deletedFiles.push(fileUri);
  }
}

export class MockImagePickerBoundary implements ImagePickerBoundary {
  public picks: ImageSource[] = [];
  public nextResult: PickedImage | null = { uri: "file://picked/image.jpg" };

  async pickImage(source: ImageSource): Promise<PickedImage | null> {
    this.picks.push(source);
    return this.nextResult;
  }
}

export class MockImageCompressionBoundary implements ImageCompressionBoundary {
  public compressedImages: string[] = [];

  async compressImage(sourceUri: string): Promise<string> {
    this.compressedImages.push(sourceUri);
    return `${sourceUri}.compressed`;
  }
}

export type MockBoundarySet = {
  db: MockDbBoundary;
  fileStorage: MockFileStorageBoundary;
  imagePicker: MockImagePickerBoundary;
  imageCompression: MockImageCompressionBoundary;
  clock: MockClockBoundary;
};

export const createMockBoundarySet = (
  overrides: Partial<MockBoundarySet> = {}
): MockBoundarySet => ({
  db: overrides.db ?? new MockDbBoundary(),
  fileStorage: overrides.fileStorage ?? new MockFileStorageBoundary(),
  imagePicker: overrides.imagePicker ?? new MockImagePickerBoundary(),
  imageCompression:
    overrides.imageCompression ?? new MockImageCompressionBoundary(),
  clock: overrides.clock ?? new MockClockBoundary(),
});

export const createTestBoundaries = (
  overrides: Partial<AppBoundaries> = {}
): { boundaries: AppBoundaries; mocks: MockBoundarySet } => {
  const mocks = createMockBoundarySet();
  const boundaries = createAppBoundaries({
    db: overrides.db ?? mocks.db,
    fileStorage: overrides.fileStorage ?? mocks.fileStorage,
    imagePicker: overrides.imagePicker ?? mocks.imagePicker,
    imageCompression: overrides.imageCompression ?? mocks.imageCompression,
    clock: overrides.clock ?? mocks.clock,
  });

  return { boundaries, mocks };
};
