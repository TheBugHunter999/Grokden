export function consumeTerminalInput(data: string, buffer: string): { forward: string; buffer: string } {
  let nextBuffer = buffer;
  let forward = "";

  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    const code = char.charCodeAt(0);

    if (char === "\x1b" && data[i + 1] === "[") {
      let j = i + 2;
      while (j < data.length && !/[A-Za-z]/.test(data[j])) j++;
      forward += data.slice(i, j + 1);
      i = j;
      continue;
    }

    if (char === "\r" || char === "\n") {
      nextBuffer = "";
      forward += char;
      continue;
    }

    if (char === "\x7f" || char === "\b") {
      nextBuffer = nextBuffer.slice(0, -1);
      forward += char;
      continue;
    }

    if (code === 3 || code === 4) {
      nextBuffer = "";
      forward += char;
      continue;
    }

    if (char === "\t") {
      continue;
    }

    if (code < 32) {
      forward += char;
      continue;
    }

    nextBuffer += char;
    forward += char;
  }

  return { forward, buffer: nextBuffer };
}

export function appendToBuffer(buffer: string, text: string): string {
  return buffer + text;
}