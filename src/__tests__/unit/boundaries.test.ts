import { createAppBoundaries } from "../../services";
import { createTestBoundaries } from "../helpers/mockBoundaries";

describe("service boundaries", () => {
  test("test boundaries expose deterministic clock via DI", () => {
    const { boundaries } = createTestBoundaries();

    expect(boundaries.clock.nowIso()).toBe("2025-02-01T10:00:00.000Z");
  });

  test("test boundaries stub image picker, compression, and file storage", async () => {
    const { boundaries, mocks } = createTestBoundaries();

    const picked = await boundaries.imagePicker.pickImage("library");
    const compressedUri = await boundaries.imageCompression.compressImage(
      picked!.uri
    );
    const storedUri = await boundaries.fileStorage.saveImage(
      compressedUri,
      "rx-1.jpg"
    );
    await boundaries.fileStorage.deleteFile(storedUri);

    expect(mocks.imagePicker.picks).toEqual(["library"]);
    expect(mocks.imageCompression.compressedImages).toEqual([picked!.uri]);
    expect(mocks.fileStorage.savedImages).toEqual([
      { sourceUri: `${picked!.uri}.compressed`, targetFileName: "rx-1.jpg" },
    ]);
    expect(mocks.fileStorage.deletedFiles).toEqual([storedUri]);
  });

  test("default boundaries keep db and clock configured", () => {
    const boundaries = createAppBoundaries();

    expect(typeof boundaries.db.open).toBe("function");
    expect(typeof boundaries.db.initialize).toBe("function");
    expect(typeof boundaries.clock.nowIso()).toBe("string");
    expect(typeof boundaries.imagePicker.pickImage).toBe("function");
    expect(typeof boundaries.imageCompression.compressImage).toBe("function");
    expect(typeof boundaries.fileStorage.saveImage).toBe("function");
  });
});
