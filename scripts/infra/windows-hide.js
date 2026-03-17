export function shouldHideChildWindows(env = process.env) {
  if (process.platform !== 'win32') {
    return false;
  }

  if (env.BG_WINDOWS_HIDE === 'false') {
    return false;
  }

  if (env.BG_WINDOWS_HIDE === 'true') {
    return true;
  }

  // Codex Windows 环境下，隐藏子进程窗口会触发 spawn EPERM。
  if (env.CODEX_MANAGED_BY_NPM === '1') {
    return false;
  }

  return true;
}

export function withWindowsHide(options = {}, env = process.env) {
  if (!shouldHideChildWindows(env)) {
    return options;
  }

  return {
    ...options,
    windowsHide: true,
  };
}
