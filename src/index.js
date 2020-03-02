import React, { Component } from 'react';
import { createStore, combineReducers } from 'redux';
import { Provider, connect } from 'react-redux';
import ReactDOM from 'react-dom';
import _ from 'lodash';


function padLeft(n, char='0') {
  if (n < 10) {
    return '0' + n;
  }
  return n;
}


function renderDuration(milliseconds) {
  let seconds = Math.abs(Math.round(milliseconds / 1000));
  let minutes = Math.floor(seconds / 60);
  seconds %= 60;
  return `${padLeft(minutes)}:${padLeft(seconds)}`;
}


const makeTimer = (config={}) => {
  return {
    name: "Timer",
    initial: 0,
    last_press: Date.now(),
    active: false,
    elapsed: 0,
    ...config,
  };
}


const resetTimer = (timer) => {
  const empty = _.cloneDeep(timer);
  empty.elapsed = 0;
  return empty;
}


const initialState = () => {
  return {
    pomodoro: {
      updateHandle: 0,
      activeTimer: 0,
      // All times in milliseconds
      timers: [
        makeTimer({name: "Session", initial: 25 * 60 * 1000}),
        makeTimer({name: "Break", initial: 5 * 60 * 1000}),
      ]
    }
  };
}


const tickTimer = timer => {
  const now = Date.now();
  // If the timer is not active, ignore the time that has passsed.
  if (timer.active) {
    timer.elapsed = timer.elapsed  + now - timer.last_press;
  }
  timer.last_press = now;
  return timer;
}


const tickTimers = (old) => {
  const next = _.cloneDeep(old);
  next.timers = old.timers.map((timer, i) => {
    return tickTimer(_.clone(timer));
  });
  return next;
}


const toggleTimer = (old, callback) => {
  let next = tickTimers(old);  // deep copy
  const activeTimer = next.timers[next.activeTimer];
  activeTimer.active = !activeTimer.active;
  if (next.updateHandle) {
    clearInterval(next.updateHandle);
    next.updateHandle = 0;
  } else {
    next.updateHandle = setInterval(callback, 900);
  }
  return next;
}


const switchTimers = (old) => {
  const next = resetTimers(old);
  next.activeTimer += 1
  next.activeTimer %= next.timers.length;
  next.timers.forEach((timer, i) => {
    timer.active = next.activeTimer === i;
  });
  console.log("BEEP BEEP BEEP");
  return next;
}


const resetTimers = (old, stop=false) => {
  if (!old) return initialState().pomodoro;
  if (stop) {
    clearInterval(old.updateHandle);
    return initialState().pomodoro;
  }
  const next = _.cloneDeep(old);
  next.timers = old.timers.map(resetTimer);
  next.timers.forEach((timer, i) => {
    timer.active = !stop && timer.active;
  });
  return next;
}


const incrementTimer = (old, idx) => {
  return nudgeTimer(old, idx, 60 * 1000);
}

const decrementTimer = (old, idx) => {
  return nudgeTimer(old, idx, -60 * 1000);
}

const nudgeTimer = (old, idx, x) => {
  if (!old) {
    return initialState().pomodoro;
  }
  if (old.timers[idx].active) {
    return old;
  }
  const next = _.cloneDeep(old);
  next.timers[idx].initial = Math.max(0, next.timers[idx].initial + x);
  return next;
}


const reducers = combineReducers({
  pomodoro: (old=null, action) => {
    console.log(old, action);
    if (!old) return resetTimers(old);
    switch (action.type) {
      case 'INCREMENT':
        return incrementTimer(old, action.payload);
      case 'DECREMENT':
        return decrementTimer(old, action.payload);
      case 'RESET':
        return resetTimers(old, true);
      case 'TICK':
        let next = tickTimers(old);
        const timer = next.timers[next.activeTimer];
        if (timer.elapsed >= timer.initial) {
          next = switchTimers(next);
        }
        return next;
      case 'TOGGLE':
        return toggleTimer(old, action.payload);
      default:
        return old;
    }
  }
});


const actions = {
  reset: () => { return { type: 'RESET' }; },
  tick: () => { return { type: 'TICK' }; },
  toggle: (callback) => { return { type: 'TOGGLE', payload: callback }; },
  increment: idx => { return { type: 'INCREMENT', payload: idx }; },
  decrement: idx => { return { type: 'DECREMENT', payload: idx }; },
}


const mapStateToProps = (state) => {
  return state
};


// Play Pause Reset buttons
const Controls = (props) => {
  const { reset, tick, toggle } = props;

  const handleClick = (event) => {
    switch (event.target.id) {
      case 'start_stop':
      case 'pause':
        toggle(tick);
        break;
      case 'reset':
        reset();
        break;
      default:
        console.log('unknown target: ', event.target);
    }
  }

  // const myAudio = useRef();
  // const playBeep = () => {
    // if (myAudio.current !== null) {
      // myAudio.current.play()
    // }
  // }

  return (
    <div>
      <div className="controls">
        <i
          id="start_stop"
          className="big play circle outline icon"
          onClick={handleClick}
        ></i>
        <i
          id="pause"
          className="big pause circle outline icon"
          onClick={handleClick}
        ></i>
        <i
          id="reset"
          className="big redo icon"
          onClick={handleClick}
        ></i>
      </div>
      <div>
        <audio
          id="beep"
          type="audio"
          src="https://goo.gl/65cBl1"
          // ref={myAudio}
        />
      </div>
    </div>
  )
}

const WrappedControls = connect(
    mapStateToProps,
    actions
)(Controls);

// DISPLAY COMPONENT
const Display = (props) => {

  const display = renderDuration(props.timer.initial - props.timer.elapsed);
  return(
    <div className="outer-display-container">
      <div className="display-container">
        <h3
          id="timer-label"
          className="ui header">
          { props.timer.name }
        </h3>
        <div
          id="time-left"
          className="display">
          { display }
        </div>
        <WrappedControls />
      </div>
    </div>
  )
}

const mapDisplayToProps = (state) => {
  const timer = state.pomodoro.timers[state.pomodoro.activeTimer];
  return { timer };
}

const WrappedDisplay = connect(
    mapDisplayToProps
)(Display);

// SESSION COMPONENT

const Session = (props) => {

  const display = props.timer.initial / (60 * 1000);

  const increment = (event) => {
    props.increment(props.idx);
  }

  const decrement = (event) => {
    props.decrement(props.idx);
  }

  return (
    <div className="session">
      <h4 id={`${props.title.toLowerCase()}-label`} className="ui large header">{ props.timer.name } Length</h4>
      <div className="session-display-container">
        <i
          id={`${props.title.toLowerCase()}-increment`}
          className="session-item big arrow alternate circle up outline icon"
          onClick={ increment }
        ></i>
        <div
          id={`${props.title.toLowerCase()}-length`}
          className="session-item session-display">
          { display }
        </div>
        <i
          id={`${props.title.toLowerCase()}-decrement`}
          className="session-item big arrow alternate circle down outline icon"
          onClick={ decrement }
        ></i>
      </div>
    </div>
  )
}

const mapSessionToProps = (state, ownProps) => {
  return {
    timer: state.pomodoro.timers[ownProps.idx],
  }
}

const WorkSession = connect(
  mapSessionToProps,
  actions,
)(Session);

const BreakSession = connect(
  mapSessionToProps,
  actions,
)(Session);


// SESSIONLIST COMPONENT
const SessionList = (props) => {
    return (
        <div className="sessions-container">
            <WorkSession title="Session" idx={0} />
            <BreakSession title="Break" idx={1} />
        </div>
    )
}

const WrappedSessionList = connect()(SessionList);

class App extends Component {

  render() {
    return (
      <div className="container">
        <div className="inner-container ui teal inverted segment">
          <div className="outer-row">
            <h1 className="ui centered huge header">Pomodoro</h1>
          </div>
          <div className="outer-row">
            <WrappedSessionList />
          </div>
          <div className="outer-row">
            <WrappedDisplay />
          </div>
        </div>
      </div>
    );
  }
}


const Wrapp = connect(
  mapStateToProps,
  actions,
)(App);


const store = createStore(
  reducers,
  initialState(),
  // window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);


ReactDOM.render(
  <Provider store={store}>
    <Wrapp />
  </Provider>,
  document.querySelector('#root'));
