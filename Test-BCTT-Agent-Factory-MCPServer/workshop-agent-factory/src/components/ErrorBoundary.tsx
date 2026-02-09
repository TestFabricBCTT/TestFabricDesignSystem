import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, alpha } from '@mui/material';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Rendering error caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" variant="h6" gutterBottom>
            Ocorreu um erro ao renderizar.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: alpha('#fff', 0.5) }}>
            {this.state.error?.message}
          </Typography>
          <Button variant="outlined" color="primary" onClick={this.handleReset}>
            Tentar novamente
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
