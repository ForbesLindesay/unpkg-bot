let index = 0;
const logEntries = [];
for (let i = 0; i < 500; i++) {
  logEntries.push(null);
}

export function getLog() {
  return logEntries;
}
export function log(name, message) {
  logEntries.shift();
  logEntries.push({
    index: index++,
    date: (new Date()).toISOString(),
    level: 'log',
    name,
    message,
  });
}
export function warn(message) {
  logEntries.shift();
  logEntries.push({
    index: index++,
    date: (new Date()).toISOString(),
    level: 'warn',
    message,
  });
}
export function error(context, stack = '') {
  if (
    /The listed users and repositories cannot be searched/.test(stack)
  ) {
    stack = 'The listed user cannot be searched';
  }
  logEntries.shift();
  logEntries.push({
    index: index++,
    date: (new Date()).toISOString(),
    level: 'error',
    context,
    stack,
  });
  console.error(context + '\n' + stack);
}
