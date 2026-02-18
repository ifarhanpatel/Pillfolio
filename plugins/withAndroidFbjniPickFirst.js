const { withProjectBuildGradle } = require("@expo/config-plugins");

const EXCLUDE_SNIPPET = `

subprojects { project ->
  if (project.name == "react-native-gesture-handler") {
    project.configurations.configureEach {
      exclude group: "com.facebook.fbjni", module: "fbjni"
    }
  }
}
`;

const withAndroidFbjniPickFirst = (config) => {
  return withProjectBuildGradle(config, (configResult) => {
    const buildGradle = configResult.modResults.contents;

    if (
      buildGradle.includes('project.name == "react-native-gesture-handler"') &&
      buildGradle.includes('module: "fbjni"')
    ) {
      return configResult;
    }

    configResult.modResults.contents = `${buildGradle}${EXCLUDE_SNIPPET}`;
    return configResult;
  });
};

module.exports = withAndroidFbjniPickFirst;
