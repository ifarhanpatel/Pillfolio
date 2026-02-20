import { Platform } from 'react-native';

const brandBlue = '#137FEC';

export const Colors = {
  light: {
    text: '#0D1B2A',
    background: '#F4F8FF',
    tint: brandBlue,
    icon: '#6F8098',
    tabIconDefault: '#6F8098',
    tabIconSelected: brandBlue,
  },
  dark: {
    text: '#EAF3FF',
    background: '#07101D',
    tint: '#7FBEFF',
    icon: '#7D93B0',
    tabIconDefault: '#7D93B0',
    tabIconSelected: '#7FBEFF',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "'Manrope', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
