// Theme
export { bcttTheme, colors, typography, borderRadius, shadows, spacing, spacingTokens, layoutSpacing } from './theme';

// BCTT Components (custom wrappers with BCTT identity)
export {
  Button,
  type ButtonProps,
  TextField,
  type TextFieldProps,
  Card,
  CardContent,
  CardActions,
  CardHeader,
  CardMedia,
  type CardProps,
  Badge,
  type BadgeProps,
  Alert,
  AlertTitle,
  type AlertProps,
  Chip,
  type ChipProps,
  Skeleton,
  type SkeletonProps,
  Divider,
  type DividerProps,
  DateRangePicker,
  type DateRangePickerProps,
} from './components';

// MUI Layout Primitives (re-exported for single-source imports)
// Note: Chip, Skeleton, Divider are now BCTT wrappers (exported from ./components above)
export {
  Box,
  Typography,
  Grid,
  Stack,
  Container,
  Paper,
  Toolbar,
  IconButton,
  CircularProgress,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Collapse,
  Fade,
  ThemeProvider,
  CssBaseline,
} from '@mui/material';

// MUI styled/alpha utilities
export { alpha, styled } from '@mui/material/styles';

// MUI UI Components (re-exported until DSLA creates proper BCTT wrappers)
export {
  AppBar,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Switch,
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Tooltip,
  Menu,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stepper,
  Step,
  StepLabel,
  Breadcrumbs,
  Link,
  Badge as MuiBadge,
} from '@mui/material';
