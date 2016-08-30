const log = [];
for (let i = 0; i < 50; i++) {
  log.push('');
}
function method(name) {
  const base = console[name];
  console[name] = (message, ...args) => {
    log.shift();
    log.push((new Date()).toISOString() + ' ' + name.toUpperCase() + ': ' + message);
    base.call(console, message, ...args);
  };
}
method('log');
method('warn');
method('error');

export default function getLog() {
  return log;
}
