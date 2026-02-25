import { render, type RenderOptions } from '@testing-library/react-native';
import React from 'react';

import { LocaleProvider } from '@/src/i18n/LocaleProvider';

export const renderWithI18n = (ui: React.ReactElement, options?: RenderOptions) => {
  return render(<LocaleProvider>{ui}</LocaleProvider>, options);
};

