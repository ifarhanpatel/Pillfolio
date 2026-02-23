const { AndroidConfig, withAndroidStyles } = require("@expo/config-plugins");

const APP_THEME = { name: "AppTheme" };
const MATERIAL_APP_THEME_PARENT = "Theme.MaterialComponents.DayNight.NoActionBar";

function ensureStyleGroup(xml, name, parent) {
  const styles = (xml.resources.style = xml.resources.style ?? []);
  let style = styles.find((entry) => entry?.$?.name === name);

  if (!style) {
    style = { $: { name, parent }, item: [] };
    styles.push(style);
    return style;
  }

  style.$ = style.$ ?? {};
  if (parent) {
    style.$.parent = parent;
  }
  style.item = style.item ?? [];
  return style;
}

function assignStyleItem(xml, styleGroup, name, value) {
  return AndroidConfig.Styles.assignStylesValue(xml, {
    add: true,
    parent: styleGroup,
    name,
    value,
  });
}

function withAndroidMaterialDatePickerTheme(config) {
  return withAndroidStyles(config, (modConfig) => {
    const xml = modConfig.modResults;
    xml.resources = xml.resources ?? {};
    xml.resources.style = xml.resources.style ?? [];

    // Upgrade AppTheme so Android MaterialDatePicker can resolve required attrs.
    ensureStyleGroup(xml, "AppTheme", MATERIAL_APP_THEME_PARENT);

    const appThemeItems = [
      ["colorPrimaryVariant", "#0C5FB8"],
      ["colorSecondary", "#137FEC"],
      ["colorSecondaryVariant", "#0C5FB8"],
      ["colorSurface", "#121F30"],
      ["colorOnSurface", "#EAF3FF"],
      ["materialCalendarTheme", "@style/Pillfolio.MaterialCalendar"],
      ["materialAlertDialogTheme", "@style/Pillfolio.MaterialAlertDialog"],
    ];

    for (const [name, value] of appThemeItems) {
      modConfig.modResults = assignStyleItem(modConfig.modResults, APP_THEME, name, value);
    }

    const alertDialogGroup = {
      name: "Pillfolio.MaterialAlertDialog",
      parent: "ThemeOverlay.MaterialComponents.MaterialAlertDialog",
    };
    ensureStyleGroup(modConfig.modResults, alertDialogGroup.name, alertDialogGroup.parent);
    for (const [name, value] of [
      ["colorSurface", "#121F30"],
      ["colorOnSurface", "#EAF3FF"],
      ["colorPrimary", "#137FEC"],
      ["colorOnPrimary", "#EEF6FF"],
    ]) {
      modConfig.modResults = assignStyleItem(modConfig.modResults, alertDialogGroup, name, value);
    }

    const calendarGroup = {
      name: "Pillfolio.MaterialCalendar",
      parent: "ThemeOverlay.MaterialComponents.MaterialCalendar",
    };
    ensureStyleGroup(modConfig.modResults, calendarGroup.name, calendarGroup.parent);
    for (const [name, value] of [
      ["colorSurface", "#121F30"],
      ["colorOnSurface", "#EAF3FF"],
      ["colorPrimary", "#137FEC"],
      ["colorOnPrimary", "#EEF6FF"],
      ["colorSecondary", "#137FEC"],
      ["android:windowBackground", "#121F30"],
    ]) {
      modConfig.modResults = assignStyleItem(modConfig.modResults, calendarGroup, name, value);
    }

    return modConfig;
  });
}

module.exports = withAndroidMaterialDatePickerTheme;
