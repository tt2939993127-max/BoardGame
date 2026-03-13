export function shouldHideChildWindows(env = process.env) {
  return process.platform === 'win32' && env.BG_WINDOWS_HIDE !== 'false';
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
