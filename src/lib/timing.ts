export function sleep(milliseconds: number): Promise<void> {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new RangeError("O tempo de espera deve ser um número não negativo.");
  }

  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function debounce<Arguments extends unknown[]>(
  callback: (...args: Arguments) => void,
  delay: number,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return (...args: Arguments): void => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), delay);
  };
}
