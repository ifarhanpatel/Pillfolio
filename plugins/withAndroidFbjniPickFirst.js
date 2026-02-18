const { withProjectBuildGradle } = require("@expo/config-plugins");

const PICK_FIRST_RULE = 'pickFirst "**/libfbjni.so"';

const withAndroidFbjniPickFirst = (config) => {
  return withProjectBuildGradle(config, (configResult) => {
    const buildGradle = configResult.modResults.contents;

    if (buildGradle.includes(PICK_FIRST_RULE)) {
      return configResult;
    }

    const patch = `

subprojects {
  afterEvaluate { project ->
    def hasAndroid = project.extensions.findByName("android") != null
    if (!hasAndroid) {
      return
    }

    project.android {
      packagingOptions {
        jniLibs {
          ${PICK_FIRST_RULE}
        }
      }
    }
  }
}
`;

    configResult.modResults.contents = `${buildGradle}${patch}`;
    return configResult;
  });
};

module.exports = withAndroidFbjniPickFirst;
