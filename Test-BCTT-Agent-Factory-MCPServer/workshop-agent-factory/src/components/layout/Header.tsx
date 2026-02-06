import { Box, Typography, Chip, alpha } from '@mui/material';
import { Factory as FactoryIcon } from '@mui/icons-material';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header = ({
  title = 'Fábrica Evolutiva',
  subtitle = 'Governação com Agentes AI'
}: HeaderProps) => {
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 3,
        borderBottom: 1,
        borderColor: alpha('#FFFFFF', 0.06),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #C8102E 0%, #9B0C24 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FactoryIcon sx={{ color: 'white', fontSize: 28 }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        </Box>
      </Box>
      <Chip
        label="Banco CTT"
        size="small"
        sx={{
          bgcolor: alpha('#C8102E', 0.1),
          color: '#C8102E',
          fontWeight: 500,
          border: `1px solid ${alpha('#C8102E', 0.2)}`,
        }}
      />
    </Box>
  );
};

export default Header;
