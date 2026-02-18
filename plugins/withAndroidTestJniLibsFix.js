const { withProjectBuildGradle } = require("@expo/config-plugins");

const START_MARKER = "// @generated begin withAndroidTestJniLibsFix";
const END_MARKER = "// @generated end withAndroidTestJniLibsFix";

const FIX_BLOCK = `${START_MARKER}
subprojects { subproject ->
    def applyJniPickFirst = {
        subproject.android {
            packagingOptions {
                jniLibs {
                    pickFirsts += ['**/libfbjni.so']
                }
            }
        }
    }

    subproject.plugins.withId("com.android.application") {
        applyJniPickFirst()
    }

    subproject.plugins.withId("com.android.library") {
        applyJniPickFirst()
    }
}
${END_MARKER}`;

module.exports = function withAndroidTestJniLibsFix(config) {
  return withProjectBuildGradle(config, (configMod) => {
    const contents = configMod.modResults.contents;

    if (contents.includes(START_MARKER)) {
      return configMod;
    }

    configMod.modResults.contents = `${contents.trimEnd()}\n\n${FIX_BLOCK}\n`;
    return configMod;
  });
};
