import type { Preview } from '@storybook/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { bcttTheme } from '../src/theme';
import React from 'react';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#F7F9FC' },
        { name: 'white', value: '#FFFFFF' },
        { name: 'dark', value: '#333333' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={bcttTheme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;
