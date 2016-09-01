import React from 'react';
import ReactDOM from 'react-dom';
import request from 'then-request';
import ms from 'ms';

const colors = [
  '#3d9df2',
  '#e673cf',
  '#8800cc',
  '#005fb3',
  '#a69d7c',
  '#397358',
  '#ffbffb',
  '#ffd580',
  '#00e2f2',
  '#9173e6',
  '#a099cc',
  '#5995b3',
  '#994d6b',
  '#2d2080',
  '#736039',
  '#0c0059',
  '#00401a',
  '#1a3320',
  '#f240ff',
  '#ff8800',
  '#00f2c2',
  '#e59173',
  '#3347cc',
  '#18b300',
  '#269954',
  '#205380',
  '#733d00',
  '#161f59',
  '#364010',
  '#332b1a',
  '#0000ff',
  '#ffc8bf',
  '#79f299',
  '#0000d9',
  '#99cca7',
  '#b29559',
  '#8c004b',
  '#7f7700',
  '#730000',
  '#305900',
  '#402200',
  '#331a1a',
  '#bfe1ff',
  '#ff0000',
  '#baf279',
  '#a3d5d9',
  '#cc8533',
  '#b38686',
  '#59468c',
  '#7f4840',
  '#66001b',
  '#134d49',
  '#401100',
  '#40bfff',
  '#ff8080',
  '#def2b6',
  '#d94c36',
  '#cc5200',
  '#a67c98',
  '#23858c',
  '#6d1d73',
  '#005266',
  '#4d3e39',
  '#330014',
  '#73ff40',
  '#f2b6c6',
  '#f2d6b6',
  '#cc3347',
  '#0000bf',
  '#29a68d',
  '#8c6246',
  '#565a73',
  '#57664d',
  '#400033',
  '#331a31',
  '#ccff00',
  '#f279aa',
  '#f20000',
  '#cc0088',
  '#b2bf00',
  '#95a653',
  '#8c7769',
  '#566973',
  '#592d39',
  '#002240',
  '#070033',
];
let colorIndex = 0;
function nextColor() {
  if (colorIndex < colors.length) {
    return colors[colorIndex++];
  } else {
    colorIndex = 0;
    return nextColor();
  }
}
let scrolledDown = false;
window.addEventListener('scroll', () => {
  scrolledDown = document.body.scrollTop > document.getElementById('log-heading').offsetTop;
}, false);

const colorsByMessage = {};
const App = React.createClass({
  _maxLogIndex: -1,
  getInitialState() {
    return {loading: true, maxUserIDProcessed: 0, rateLimits: [], log: []};
  },
  componentDidMount() {
    this._poll();
  },
  _poll() {
    request('get', '/ajax').getBody('utf8').then(JSON.parse).done(status => {
      this.setState({
        loading: false,
        maxUserIDProcessed: status.maxUserIDProcessed,
        rateLimits: status.rateLimits,
        log: (
          scrolledDown
          ? this.state.log
          : status.log.filter(logEntry => {
            if (logEntry.index > this._maxLogIndex) {
              this._maxLogIndex = logEntry.index;
              return true;
            } else {
              return false;
            }
          }).slice().reverse().concat(this.state.log)
        ),
      });
      setTimeout(this._poll, 3000);
    }, this._poll);
  },
  render() {
    if (this.state.loading) {
      return <div>Loading...</div>;
    }
    const now = Date.now() / 1000;
    return (
      <div>
        <h1>Code Mod Status</h1>
        <p>
          <strong>Max User ID Processed: </strong> {this.state.maxUserIDProcessed}
        </p>
        <h2>Rate Limits Remaining</h2>
        <div className="bar-chart">
          {
            this.state.rateLimits.map((rateLimit, i) => {
              const reset = Math.floor(rateLimit.reset - now);
              return (
                <div key={i} className="bar-chart-bar">
                  <div style={{
                    flexBasis: 0,
                    flexGrow: rateLimit.limit - rateLimit.remaining,
                    background: 'red',
                  }} />
                  <div style={{
                    flexBasis: 0,
                    flexGrow: rateLimit.remaining,
                    background: 'green',
                  }} />
                  <div className="bar-chart-stats">
                    <p style={{textAlign: 'center'}}>{reset <= 0 ? 'now' : ms(reset * 1000)}</p>
                    <p style={{textAlign: 'center'}}>{rateLimit.remaining}</p>
                  </div>
                </div>
              );
            })
          }
        </div>
        <h2 id="log-heading">Log</h2>
        <pre>
          {this.state.log.map(log => {
            if (log.level === 'error') {
              return (
                <div key={log.index}>
                  <div>{log.date} <span style={{color: 'red'}}>{log.context}</span></div>
                  <div>{log.stack}</div>
                </div>
              );
            }
            if (log.level === 'warn') {
              return (
                <div key={log.index}>
                  <div>{log.date} <span style={{color: '#9e6700'}}>{log.message}</span></div>
                </div>
              );
            }
            if (log.level === 'log') {
              const color = colorsByMessage[log.name] || (colorsByMessage[log.name] = nextColor());
              return (
                <div key={log.index}>
                  <div>{log.date} <span style={{color}}>{log.name}</span> {log.message}</div>
                </div>
              );
            }
            return <div>{log.date} </div>;
          })}
        </pre>
      </div>
    );
  },
});

ReactDOM.render(<App />, document.getElementById('container'));
