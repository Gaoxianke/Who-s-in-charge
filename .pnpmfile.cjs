function readPackage(pkg, context) {
  let blockedPackages = [];
  try {
    // 从 devkit 加载受限包列表（JSON 文件，无需编译，pnpm install 时始终可用）
    const config = require('./packages/devkit/pnpm-config.json');
    blockedPackages = config.blockedPackages ?? [];
  } catch {}

  const blocked = blockedPackages.find(b => b.name === pkg.name);
  if (blocked) {
    context.log(`Blocked installation of ${pkg.name}`);
    throw new Error(`Restricted: ${blocked.reason}`);
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage
  }
};
