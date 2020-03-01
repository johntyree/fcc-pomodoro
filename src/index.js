import React, { Component } from 'react';
import { createStore, combineReducers } from 'redux';
import { Provider, connect } from 'react-redux';
import ReactDOM from 'react-dom';
import _ from 'lodash';


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


const initialState = () => {
  return {
    pomodoro: {
      updateHandle: 0,
      activeTimer: 0,
      // All times in milliseconds
      timers: [
        makeTimer({name: "Work", initial: 5000}),
        makeTimer({name: "Break", initial: 5000}),
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
    next.updateHandle = setInterval(callback, 100);
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
  if (!old) {
    return initialState().pomodoro;
  }
  const next = _.cloneDeep(old);
  next.timers = initialState().pomodoro.timers;
  if (stop) {
    next.activeTimer = 0;
    clearInterval(next.updateHandle);
    next.updateHandle = 0;
  }
  next.timers.forEach((timer, i) => {
    timer.active = !stop && old.timers[i].active;
  });
  return next;
}


const reducers = combineReducers({
  pomodoro: (old=null, action) => {
    console.log(old, action);
    if (!old) return resetTimers(old);
    switch (action.type) {
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
  next: () => { return { type: 'NEXT' }; },
  reset: () => { return { type: 'RESET' }; },
  switch: id => { return { type: 'SWITCH', payload: id }; },
  toggle: (callback) => { return { type: 'TOGGLE', payload: callback }; },
  tick: () => { return { type: 'TICK' }; },
}


class App extends Component {

  renderTimer(timer) {
    return (
      timer.name + ': ' +
      this.renderDuration(timer.initial - timer.elapsed, false)
    );
  }

  renderDuration(milliseconds, negativeOK=true) {
    let sign = milliseconds < 0 ? '-' : '';
    if (sign && !negativeOK) return '0s';
    let seconds = Math.abs(Math.round(milliseconds / 1000));
    let display = sign + seconds + 's';
    let minutes = Math.floor(seconds / 60);
    seconds %= 60;
    if (minutes) display = sign + minutes + 'm ' + display;
    let hours = Math.floor(minutes / 60);
    minutes %= 60;
    if (hours) display = sign + hours + 'h ' + display;
    return display;
  }

  render() {
    if (!this.props.pomodoro) return;
    const timers = this.props.pomodoro.timers;
    const toggle = () => this.props.toggle(this.props.tick);
    return (
      <div>
        { this.props.pomodoro.activeTimer }
        <p/>
        <button onClick={toggle}>
          Start / Pause
        </button>
        <button onClick={() => this.props.reset()}>
          Reset
        </button>
        <p/>
        { this.renderTimer(timers[0]) }
        <p/>
        { Date(timers[0].last_press).toString() }
        <p/>
        <p/>
        { this.renderTimer(timers[1]) }
        <p/>
        { Date(timers[1].last_press).toString() }
      </div>
    );
  }
}


const mapStateToProps = (state) => {
  return state
};


const Wrapp = connect(
  mapStateToProps,
  actions,
)(App);


const store = createStore(
  reducers,
  initialState(),
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);


ReactDOM.render(
  <Provider store={store}>
    <Wrapp />
  </Provider>,
  document.querySelector('#root'));
