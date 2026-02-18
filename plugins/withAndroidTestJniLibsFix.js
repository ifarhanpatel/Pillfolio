const { withProjectBuildGradle } = require("@expo/config-plugins");

const START_MARKER = "// @generated begin withAndroidTestJniLibsFix";
const END_MARKER = "// @generated end withAndroidTestJniLibsFix";

const FIX_BLOCK = `${START_MARKER}
subprojects { subproject ->
    afterEvaluate { project ->
        if (project.extensions.findByName("android") != null) {
            project.android {
                packagingOptions {
                    jniLibs {
                        pickFirsts += ['**/libfbjni.so']
                    }
                }
            }
        }
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
