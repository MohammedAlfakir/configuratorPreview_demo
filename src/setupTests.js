// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom has no ResizeObserver, which the previewer's responsive layout observes.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
