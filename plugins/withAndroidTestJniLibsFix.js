const { withAppBuildGradle } = require("@expo/config-plugins");

const JNI_PICK_FIRST_BLOCK = `packagingOptions {
        jniLibs {
            pickFirsts += ['**/libfbjni.so']
        }
    }`;

module.exports = function withAndroidTestJniLibsFix(config) {
  return withAppBuildGradle(config, (configMod) => {
    const contents = configMod.modResults.contents;

    if (contents.includes("pickFirsts += ['**/libfbjni.so']")) {
      return configMod;
    }

    const androidBlockMatch = contents.match(/android\s*\{/m);
    if (!androidBlockMatch) {
      return configMod;
    }

    const insertIndex = androidBlockMatch.index + androidBlockMatch[0].length;
    configMod.modResults.contents =
      contents.slice(0, insertIndex) +
      `\n    ${JNI_PICK_FIRST_BLOCK}\n` +
      contents.slice(insertIndex);

    return configMod;
  });
};
