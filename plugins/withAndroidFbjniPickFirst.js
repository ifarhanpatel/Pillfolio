const { withProjectBuildGradle } = require("@expo/config-plugins");

const PICK_FIRST_RULE = 'pickFirst "**/libfbjni.so"';
const MODERN_SNIPPET_MARKER = 'plugins.withId("com.android.application")';

const withAndroidFbjniPickFirst = (config) => {
  return withProjectBuildGradle(config, (configResult) => {
    const buildGradle = configResult.modResults.contents;

    if (buildGradle.includes(MODERN_SNIPPET_MARKER) && buildGradle.includes(PICK_FIRST_RULE)) {
      return configResult;
    }

    const patch = `

subprojects {
  plugins.withId("com.android.application") {
    android {
      packagingOptions {
        jniLibs {
          ${PICK_FIRST_RULE}
        }
      }
    }
  }

  plugins.withId("com.android.library") {
    android {
      packagingOptions {
        jniLibs {
          ${PICK_FIRST_RULE}
        }
      }
    }
  }
}
`;

    const legacyMarker = "afterEvaluate { project ->";
    if (buildGradle.includes(legacyMarker) && buildGradle.includes(PICK_FIRST_RULE)) {
      const trailingSubprojectsIndex = buildGradle.lastIndexOf("\nsubprojects {");
      if (trailingSubprojectsIndex !== -1) {
        const withoutLegacy = buildGradle.slice(0, trailingSubprojectsIndex).trimEnd();
        configResult.modResults.contents = `${withoutLegacy}${patch}`;
        return configResult;
      }

      configResult.modResults.contents = `${buildGradle}\n${patch}`;
      return configResult;
    }

    configResult.modResults.contents = `${buildGradle}${patch}`;
    return configResult;
  });
};

module.exports = withAndroidFbjniPickFirst;
