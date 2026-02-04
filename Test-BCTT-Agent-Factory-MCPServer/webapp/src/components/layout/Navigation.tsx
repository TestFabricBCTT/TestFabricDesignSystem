import { Box, Tabs, Tab, alpha } from '@mui/material';
import { Phase } from '@/types';

interface NavigationProps {
  phases: Phase[];
  activePhase: string;
  onPhaseChange: (phaseId: string) => void;
}

export const Navigation = ({ phases, activePhase, onPhaseChange }: NavigationProps) => {
  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    onPhaseChange(newValue);
  };

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: alpha('#FFFFFF', 0.06),
        px: 3,
      }}
    >
      <Tabs
        value={activePhase}
        onChange={handleChange}
        sx={{
          '& .MuiTabs-indicator': {
            backgroundColor: 'primary.main',
          },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'primary.main',
            },
          },
        }}
      >
        {phases.map((phase) => (
          <Tab
            key={phase.id}
            value={phase.id}
            label={`${phase.icon} ${phase.name}`}
            sx={{ minHeight: 48 }}
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default Navigation;
