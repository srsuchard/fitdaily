// Mock the native AsyncStorage so modules that import it (e.g. progressStore)
// load cleanly in the Node test environment. Pure logic under test doesn't
// touch storage; this just prevents the native module from throwing on import.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
