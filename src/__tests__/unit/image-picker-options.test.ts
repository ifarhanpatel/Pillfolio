import { resolveImagePickerMediaTypes } from "../../services/dependencies";

describe("image picker options", () => {
  test("uses image-only media type array for picker APIs", () => {
    expect(resolveImagePickerMediaTypes()).toEqual(["images"]);
  });
});
