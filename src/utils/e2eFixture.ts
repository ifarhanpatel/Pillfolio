/**
 * Resolves the bundled E2E fixture image to a local file URI for use with
 * imageCompression/fileStorage. Only used when the prescription form photo
 * field is set to the magic value "e2e-fixture" in E2E tests.
 */
import { Asset } from 'expo-asset';

let cachedUri: string | null = null;

export async function resolveE2EFixtureUri(): Promise<string> {
  if (cachedUri) {
    return cachedUri;
  }

  const asset = Asset.fromModule(require('../../assets/e2e-fixture.png'));
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error('E2E fixture asset has no local or remote URI');
  }
  cachedUri = uri;
  return uri;
}
