const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Keep in sync with the `expo-build-properties` → ios.deploymentTarget
// value in app.json.
const IOS_DEPLOYMENT_TARGET = '15.1';

const PATCH_START = '# >>> withFmtFix';
const PATCH_END = '# <<< withFmtFix';

const withFmtFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let content = fs.readFileSync(podfilePath, 'utf-8');

      const patch = `
    ${PATCH_START}
    # Fix fmt consteval errors under Xcode 26
    fmt_base = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      patched = content.gsub(/^#\\s*define FMT_USE_CONSTEVAL 1$/, '# define FMT_USE_CONSTEVAL 0')
      if patched != content
        File.chmod(0644, fmt_base)
        File.write(fmt_base, patched)
        puts '✅ fmt base.h patched for Xcode 26'
      end
    end

    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |cfg|
          cfg.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end

      # Resource bundle (and other) targets default to a very old deployment
      # target regardless of our Podfile platform line — bump anything below
      # ours so Xcode 26 stops erroring on the mismatch.
      target.build_configurations.each do |cfg|
        current = cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current && current.to_f < ${IOS_DEPLOYMENT_TARGET}
          cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${IOS_DEPLOYMENT_TARGET}'
        end
      end
    end
    ${PATCH_END}
`;

      const insertAfter = `:ccache_enabled => podfile_properties['apple.ccacheEnabled'] == 'true',\n    )`;

      // Idempotent re-runs: strip any previously-inserted block by marker,
      // not by a regex that can't tell one `end` from another.
      const startIdx = content.indexOf(PATCH_START);
      const endIdx = content.indexOf(PATCH_END);
      if (startIdx !== -1 && endIdx !== -1) {
        const lineStart = content.lastIndexOf('\n', startIdx);
        const lineEnd = content.indexOf('\n', endIdx + PATCH_END.length);
        content = content.slice(0, lineStart) + content.slice(lineEnd === -1 ? content.length : lineEnd);
      }

      if (content.includes(insertAfter)) {
        content = content.replace(insertAfter, insertAfter + patch);
      } else {
        console.warn('⚠️  withFmtFix: post_install anchor not found in Podfile — patch NOT applied');
      }

      fs.writeFileSync(podfilePath, content);
      console.log('✅ Podfile patched: fmt consteval fix + deployment target bump');
      return config;
    },
  ]);
};

module.exports = withFmtFix;