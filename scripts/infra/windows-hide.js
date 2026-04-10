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
