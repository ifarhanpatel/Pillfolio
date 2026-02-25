/**
 * Resolves the E2E fixture image to a local file URI for use with
 * imageCompression/fileStorage. Only used when the prescription form photo
 * field is set to the magic value "e2e-fixture" in E2E tests.
 *
 * On Android release builds, bundled asset URIs can be incompatible with
 * expo-image-manipulator (Context.renderAsync), so we generate a tiny valid
 * PNG in app storage and reuse its file:// URI.
 */
import * as FileSystem from 'expo-file-system/legacy';

let cachedUri: string | null = null;
const E2E_FIXTURE_FILE = 'e2e-fixture.png';
// 1x1 transparent PNG
const E2E_FIXTURE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0yQAAAAASUVORK5CYII=';

export async function resolveE2EFixtureUri(): Promise<string> {
  if (cachedUri) {
    return cachedUri;
  }

  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error('No writable directory is available for the E2E fixture.');
  }

  const targetUri = `${baseDir}${E2E_FIXTURE_FILE}`;
  const existing = await FileSystem.getInfoAsync(targetUri);
  if (!existing.exists) {
    await FileSystem.writeAsStringAsync(targetUri, E2E_FIXTURE_BASE64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  cachedUri = targetUri;
  return targetUri;
}
