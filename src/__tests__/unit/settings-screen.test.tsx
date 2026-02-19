import { render } from '@testing-library/react-native';

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

  it('renders disabled export/backup placeholder', () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);
    const button = getByTestId('settings-export-button');

    expect(getByText('Export/Backup (Coming Soon)')).toBeTruthy();
    expect(button).toBeDisabled();
  });

  it('renders app version', () => {
    const { getByTestId } = render(<SettingsScreen />);

    expect(getByTestId('settings-version')).toHaveTextContent('App Version: 1.2.3');
  });
});
