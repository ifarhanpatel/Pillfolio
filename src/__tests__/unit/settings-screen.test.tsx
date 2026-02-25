import { fireEvent, waitFor } from '@testing-library/react-native';

import { SettingsScreen } from '@/src/screens/SettingsScreen';
import { renderWithI18n } from '@/src/__tests__/helpers/renderWithI18n';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '1.2.3',
    },
  },
}));

describe('SettingsScreen', () => {
  it('renders privacy warning and about section', () => {
    const { getByText, getByTestId } = renderWithI18n(<SettingsScreen />);

    expect(getByText('Settings')).toBeTruthy();
    expect(getByTestId('settings-privacy')).toBeTruthy();
    expect(getByText('Your data is stored only on this device. No cloud sync is enabled.')).toBeTruthy();
    expect(getByTestId('settings-about')).toBeTruthy();
  });

  it('renders export/restore actions', () => {
    const { getByTestId, getByText } = renderWithI18n(<SettingsScreen />);
    const exportButton = getByTestId('settings-export-button');
    const saveToDeviceFilesButton = getByTestId('settings-save-device-files-button');
    const restoreButton = getByTestId('settings-restore-button');

    expect(getByText('Export Backup')).toBeTruthy();
    expect(getByText('Save Backup to Device Files')).toBeTruthy();
    expect(getByText('Restore Backup')).toBeTruthy();
    expect(exportButton).toBeEnabled();
    expect(saveToDeviceFilesButton).toBeEnabled();
    expect(restoreButton).toBeEnabled();
  });

  it('calls export handler', async () => {
    const onExport = jest.fn(async () => undefined);

    const { getByTestId } = renderWithI18n(<SettingsScreen onExport={onExport} />);
    fireEvent.press(getByTestId('settings-export-button'));

    await waitFor(() => {
      expect(onExport).toHaveBeenCalledTimes(1);
    });
  });

  it('calls restore handler', async () => {
    const onRestore = jest.fn(async () => undefined);

    const { getByTestId } = renderWithI18n(<SettingsScreen onRestore={onRestore} />);
    fireEvent.press(getByTestId('settings-restore-button'));

    await waitFor(() => {
      expect(onRestore).toHaveBeenCalledTimes(1);
    });
  });

  it('calls save to device files handler', async () => {
    const onSaveToDeviceFiles = jest.fn(async () => undefined);

    const { getByTestId } = renderWithI18n(<SettingsScreen onSaveToDeviceFiles={onSaveToDeviceFiles} />);
    fireEvent.press(getByTestId('settings-save-device-files-button'));

    await waitFor(() => {
      expect(onSaveToDeviceFiles).toHaveBeenCalledTimes(1);
    });
  });

  it('renders app version', () => {
    const { getByTestId } = renderWithI18n(<SettingsScreen />);

    expect(getByTestId('settings-version')).toHaveTextContent('App Version: 1.2.3');
  });

  it('changes language selection', async () => {
    const { getByTestId, findByText } = renderWithI18n(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-language-option-hi'));

    expect(getByTestId('settings-language-current')).toBeTruthy();
    await findByText('सेटिंग्स');
  });
});
