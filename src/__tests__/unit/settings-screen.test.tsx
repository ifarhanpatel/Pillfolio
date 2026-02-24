import { fireEvent } from '@testing-library/react-native';

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

  it('renders disabled export/backup placeholder', () => {
    const { getByTestId, getByText } = renderWithI18n(<SettingsScreen />);
    const button = getByTestId('settings-export-button');

    expect(getByText('Export/Backup (Coming Soon)')).toBeTruthy();
    expect(button).toBeDisabled();
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
