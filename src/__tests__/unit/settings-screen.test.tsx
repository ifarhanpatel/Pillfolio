import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { SettingsScreen } from '@/src/screens/SettingsScreen';

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
    const { getByText, getByTestId } = render(<SettingsScreen />);

    expect(getByText('Settings')).toBeTruthy();
    expect(getByTestId('settings-privacy')).toBeTruthy();
    expect(getByText('Your data is stored only on this device. No cloud sync is enabled.')).toBeTruthy();
    expect(getByTestId('settings-about')).toBeTruthy();
  });

  it('renders export/restore actions', () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);
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

    const { getByTestId } = render(<SettingsScreen onExport={onExport} />);
    fireEvent.press(getByTestId('settings-export-button'));

    await waitFor(() => {
      expect(onExport).toHaveBeenCalledTimes(1);
    });
  });

  it('calls restore handler', async () => {
    const onRestore = jest.fn(async () => undefined);

    const { getByTestId } = render(<SettingsScreen onRestore={onRestore} />);
    fireEvent.press(getByTestId('settings-restore-button'));

    await waitFor(() => {
      expect(onRestore).toHaveBeenCalledTimes(1);
    });
  });

  it('calls save to device files handler', async () => {
    const onSaveToDeviceFiles = jest.fn(async () => undefined);

    const { getByTestId } = render(<SettingsScreen onSaveToDeviceFiles={onSaveToDeviceFiles} />);
    fireEvent.press(getByTestId('settings-save-device-files-button'));

    await waitFor(() => {
      expect(onSaveToDeviceFiles).toHaveBeenCalledTimes(1);
    });
  });

  it('renders app version', () => {
    const { getByTestId } = render(<SettingsScreen />);

    expect(getByTestId('settings-version')).toHaveTextContent('App Version: 1.2.3');
  });
});
