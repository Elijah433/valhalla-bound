const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withFmtFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let content = fs.readFileSync(podfilePath, 'utf-8');

      const patch = `
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
    end
`;

      const insertAfter = `:ccache_enabled => podfile_properties['apple.ccacheEnabled'] == 'true',\n    )`;

      // Remove old patch if exists and add new one
      if (content.includes('FMT_USE_CONSTEVAL')) {
        // Replace old patch block
        content = content.replace(
          /\n\s*# Fix fmt.*?end\n/s,
          patch
        );
      } else {
        content = content.replace(insertAfter, insertAfter + patch);
      }

      fs.writeFileSync(podfilePath, content);
      console.log('✅ Podfile patched for Xcode 26 fmt fix');
      return config;
    },
  ]);
};

module.exports = withFmtFix;