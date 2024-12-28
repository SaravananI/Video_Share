/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import Navigation from './app/navigations/Navigation';
import {ThemeProvider} from './app/themes/ThemeProvider';

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <Navigation />
    </ThemeProvider>
  );
}

export default App;
