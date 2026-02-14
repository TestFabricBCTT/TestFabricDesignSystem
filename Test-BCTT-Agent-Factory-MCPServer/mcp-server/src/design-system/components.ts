/**
 * Component Specifications extracted from Zeroheight Design System
 * Source: https://bcttdesignsystem.zeroheight.com
 *
 * These specifications define the available components, their variants,
 * and usage guidelines for the Banco CTT Design System.
 */

export interface ComponentSpec {
  name: string;
  category: string;
  atomicLevel: 'atom' | 'molecule' | 'organism' | 'template';
  variants: string[];
  sizes?: string[];
  states?: string[];
  props: PropSpec[];
  a11y: A11ySpec;
  usage: UsageGuidelines;
  zeroheightUrl: string;
}

export interface PropSpec {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
}

export interface A11ySpec {
  wcagLevel: 'A' | 'AA' | 'AAA';
  ariaAttributes: string[];
  keyboardNavigation: string[];
  screenReaderNotes: string[];
}

export interface UsageGuidelines {
  do: string[];
  dont: string[];
  examples: string[];
}

/**
 * Design System Components extracted from Zeroheight
 */
export const componentSpecs: Record<string, ComponentSpec> = {
  // ============================================
  // BUTTONS
  // ============================================
  ButtonPrimary: {
    name: 'Button Primary',
    category: 'Buttons',
    atomicLevel: 'atom',
    variants: ['default', 'disabled', 'loading'],
    sizes: ['small', 'medium', 'large'],
    states: ['default', 'hover', 'active', 'focus', 'disabled'],
    props: [
      { name: 'variant', type: "'primary'", required: false, default: "'primary'", description: 'Button variant' },
      { name: 'size', type: "'small' | 'medium' | 'large'", required: false, default: "'medium'", description: 'Button size' },
      { name: 'disabled', type: 'boolean', required: false, default: 'false', description: 'Disable button' },
      { name: 'loading', type: 'boolean', required: false, default: 'false', description: 'Show loading state' },
      { name: 'fullWidth', type: 'boolean', required: false, default: 'false', description: 'Full width button' },
      { name: 'startIcon', type: 'React.ReactNode', required: false, description: 'Icon before text' },
      { name: 'endIcon', type: 'React.ReactNode', required: false, description: 'Icon after text' },
      { name: 'onClick', type: '() => void', required: false, description: 'Click handler' },
      { name: 'children', type: 'React.ReactNode', required: true, description: 'Button content' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-label', 'aria-disabled', 'aria-busy'],
      keyboardNavigation: ['Enter', 'Space'],
      screenReaderNotes: ['Announce button label', 'Announce disabled state', 'Announce loading state'],
    },
    usage: {
      do: [
        'Use for main call-to-action',
        'One primary button per section',
        'Use clear action verbs (Confirmar, Continuar, Submeter)',
      ],
      dont: [
        'Multiple primary buttons side by side',
        'Use for destructive actions (use ghost)',
        'Long text labels',
      ],
      examples: ['Confirmar', 'Continuar', 'Guardar', 'Submeter'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/2036a3--buttons',
  },

  ButtonSecondary: {
    name: 'Button Secondary',
    category: 'Buttons',
    atomicLevel: 'atom',
    variants: ['default', 'disabled', 'loading'],
    sizes: ['small', 'medium', 'large'],
    states: ['default', 'hover', 'active', 'focus', 'disabled'],
    props: [
      { name: 'variant', type: "'secondary'", required: false, default: "'secondary'", description: 'Button variant' },
      { name: 'size', type: "'small' | 'medium' | 'large'", required: false, default: "'medium'", description: 'Button size' },
      { name: 'disabled', type: 'boolean', required: false, default: 'false', description: 'Disable button' },
      { name: 'children', type: 'React.ReactNode', required: true, description: 'Button content' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-label', 'aria-disabled'],
      keyboardNavigation: ['Enter', 'Space'],
      screenReaderNotes: ['Announce button label'],
    },
    usage: {
      do: [
        'Use alongside primary buttons',
        'For secondary actions',
        'Can have multiple per section',
      ],
      dont: [
        'Use as main CTA',
        'Use when action is clearly secondary',
      ],
      examples: ['Cancelar', 'Voltar', 'Ver mais'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/2036a3--buttons',
  },

  ButtonGhost: {
    name: 'Button Ghost',
    category: 'Buttons',
    atomicLevel: 'atom',
    variants: ['default', 'destructive', 'disabled'],
    sizes: ['small', 'medium', 'large'],
    states: ['default', 'hover', 'active', 'focus', 'disabled'],
    props: [
      { name: 'variant', type: "'ghost'", required: false, default: "'ghost'", description: 'Button variant' },
      { name: 'destructive', type: 'boolean', required: false, default: 'false', description: 'Destructive style (red)' },
      { name: 'children', type: 'React.ReactNode', required: true, description: 'Button content' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-label', 'aria-disabled'],
      keyboardNavigation: ['Enter', 'Space'],
      screenReaderNotes: ['Announce button label', 'Announce destructive action if applicable'],
    },
    usage: {
      do: [
        'Use for tertiary actions',
        'Use destructive variant for delete/remove',
        'Inline links with action behavior',
      ],
      dont: [
        'Use as primary CTA',
        'Overuse in a single view',
      ],
      examples: ['Remover', 'Eliminar', 'Saber mais', 'Ver detalhes'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/2036a3--buttons',
  },

  ButtonIcon: {
    name: 'Button Icon Only',
    category: 'Buttons',
    atomicLevel: 'atom',
    variants: ['default', 'filled', 'outlined'],
    sizes: ['small', 'medium', 'large'],
    states: ['default', 'hover', 'active', 'focus', 'disabled'],
    props: [
      { name: 'icon', type: 'React.ReactNode', required: true, description: 'Icon to display' },
      { name: 'ariaLabel', type: 'string', required: true, description: 'Accessible label (mandatory)' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-label (required)'],
      keyboardNavigation: ['Enter', 'Space'],
      screenReaderNotes: ['MUST have aria-label since no visible text'],
    },
    usage: {
      do: [
        'Always provide aria-label',
        'Use for common actions with recognizable icons',
        'Tooltip on hover',
      ],
      dont: [
        'Use without aria-label',
        'Use for complex actions',
      ],
      examples: ['Close (X)', 'Edit (pencil)', 'Delete (trash)', 'Settings (gear)'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/2036a3--buttons',
  },

  ButtonRound: {
    name: 'Button Round',
    category: 'Buttons',
    atomicLevel: 'atom',
    variants: ['primary', 'secondary'],
    sizes: ['medium', 'large'],
    states: ['default', 'hover', 'active', 'focus', 'disabled'],
    props: [
      { name: 'icon', type: 'React.ReactNode', required: true, description: 'Icon to display' },
      { name: 'ariaLabel', type: 'string', required: true, description: 'Accessible label' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-label (required)'],
      keyboardNavigation: ['Enter', 'Space'],
      screenReaderNotes: ['MUST have aria-label'],
    },
    usage: {
      do: [
        'FAB (Floating Action Button) patterns',
        'Primary action on a page',
      ],
      dont: [
        'Multiple FABs on same screen',
        'Without aria-label',
      ],
      examples: ['Add (+)', 'New message', 'Quick action'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/2036a3--buttons',
  },

  // ============================================
  // FORMS
  // ============================================
  Input: {
    name: 'Input',
    category: 'Forms',
    atomicLevel: 'atom',
    variants: ['text', 'number', 'currency', 'password', 'email', 'phone'],
    states: ['default', 'focus', 'filled', 'error', 'disabled', 'readonly'],
    props: [
      { name: 'type', type: "'text' | 'number' | 'currency' | 'password' | 'email' | 'phone'", required: false, default: "'text'", description: 'Input type' },
      { name: 'label', type: 'string', required: true, description: 'Input label' },
      { name: 'placeholder', type: 'string', required: false, description: 'Placeholder text' },
      { name: 'helperText', type: 'string', required: false, description: 'Helper text below input' },
      { name: 'error', type: 'boolean', required: false, default: 'false', description: 'Error state' },
      { name: 'errorMessage', type: 'string', required: false, description: 'Error message' },
      { name: 'required', type: 'boolean', required: false, default: 'false', description: 'Required field' },
      { name: 'disabled', type: 'boolean', required: false, default: 'false', description: 'Disabled state' },
      { name: 'value', type: 'string', required: false, description: 'Input value' },
      { name: 'onChange', type: '(value: string) => void', required: false, description: 'Change handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-label', 'aria-describedby', 'aria-invalid', 'aria-required'],
      keyboardNavigation: ['Tab to focus', 'Type to input'],
      screenReaderNotes: ['Announce label', 'Announce required state', 'Announce error message'],
    },
    usage: {
      do: [
        'Always have visible label',
        'Use appropriate input type',
        'Show clear error messages',
        'Use helper text for formatting hints',
      ],
      dont: [
        'Placeholder as label',
        'Generic error messages',
        'Long placeholder text',
      ],
      examples: ['Nome completo', 'NIF', 'Email', 'Montante (€)'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/40a8df--forms',
  },

  Select: {
    name: 'Select',
    category: 'Forms',
    atomicLevel: 'atom',
    variants: ['default', 'multi', 'searchable'],
    states: ['default', 'focus', 'open', 'filled', 'error', 'disabled'],
    props: [
      { name: 'label', type: 'string', required: true, description: 'Select label' },
      { name: 'options', type: 'Array<{ value: string; label: string }>', required: true, description: 'Options list' },
      { name: 'placeholder', type: 'string', required: false, description: 'Placeholder text' },
      { name: 'multiple', type: 'boolean', required: false, default: 'false', description: 'Allow multiple selection' },
      { name: 'searchable', type: 'boolean', required: false, default: 'false', description: 'Enable search' },
      { name: 'error', type: 'boolean', required: false, default: 'false', description: 'Error state' },
      { name: 'disabled', type: 'boolean', required: false, default: 'false', description: 'Disabled state' },
      { name: 'value', type: 'string | string[]', required: false, description: 'Selected value(s)' },
      { name: 'onChange', type: '(value: string | string[]) => void', required: false, description: 'Change handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-label', 'aria-expanded', 'aria-haspopup', 'aria-selected'],
      keyboardNavigation: ['Tab', 'Enter to open', 'Arrow keys to navigate', 'Enter to select'],
      screenReaderNotes: ['Announce label', 'Announce options count', 'Announce selected value'],
    },
    usage: {
      do: [
        'Use for 5+ options',
        'Clear option labels',
        'Logical option ordering',
      ],
      dont: [
        'Use for 2-4 options (use radio instead)',
        'Very long option lists without search',
      ],
      examples: ['País', 'Tipo de conta', 'Mês de nascimento'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/40a8df--forms',
  },

  Search: {
    name: 'Search',
    category: 'Forms',
    atomicLevel: 'molecule',
    variants: ['default', 'with-filters'],
    states: ['default', 'focus', 'filled', 'searching'],
    props: [
      { name: 'placeholder', type: 'string', required: false, default: "'Pesquisar'", description: 'Placeholder text' },
      { name: 'value', type: 'string', required: false, description: 'Search value' },
      { name: 'onSearch', type: '(value: string) => void', required: false, description: 'Search handler' },
      { name: 'showClear', type: 'boolean', required: false, default: 'true', description: 'Show clear button' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="search"', 'aria-label'],
      keyboardNavigation: ['Tab to focus', 'Enter to search', 'Escape to clear'],
      screenReaderNotes: ['Announce search field', 'Announce results count'],
    },
    usage: {
      do: [
        'Clear search icon',
        'Show results count',
        'Clear button when filled',
      ],
      dont: [
        'Search without results feedback',
        'Auto-search on every keystroke (debounce)',
      ],
      examples: ['Pesquisar movimentos', 'Pesquisar beneficiários'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/40a8df--forms',
  },

  // ============================================
  // CONTROLS
  // ============================================
  Checkbox: {
    name: 'Checkbox',
    category: 'Controls',
    atomicLevel: 'atom',
    variants: ['default'],
    states: ['unchecked', 'checked', 'indeterminate', 'disabled'],
    props: [
      { name: 'label', type: 'string', required: true, description: 'Checkbox label' },
      { name: 'checked', type: 'boolean', required: false, default: 'false', description: 'Checked state' },
      { name: 'indeterminate', type: 'boolean', required: false, default: 'false', description: 'Indeterminate state' },
      { name: 'disabled', type: 'boolean', required: false, default: 'false', description: 'Disabled state' },
      { name: 'onChange', type: '(checked: boolean) => void', required: false, description: 'Change handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-checked', 'aria-disabled'],
      keyboardNavigation: ['Space to toggle'],
      screenReaderNotes: ['Announce label', 'Announce checked state'],
    },
    usage: {
      do: [
        'Use for multiple selections',
        'Clear labels',
        'Use indeterminate for "select all" parent',
      ],
      dont: [
        'Single option (use toggle)',
        'Too many options (use multi-select)',
      ],
      examples: ['Aceito os termos e condições', 'Receber notificações por email'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/50a5df--controls',
  },

  Radio: {
    name: 'Radio',
    category: 'Controls',
    atomicLevel: 'atom',
    variants: ['default', 'card'],
    states: ['unselected', 'selected', 'disabled'],
    props: [
      { name: 'label', type: 'string', required: true, description: 'Radio label' },
      { name: 'value', type: 'string', required: true, description: 'Radio value' },
      { name: 'checked', type: 'boolean', required: false, default: 'false', description: 'Selected state' },
      { name: 'disabled', type: 'boolean', required: false, default: 'false', description: 'Disabled state' },
      { name: 'onChange', type: '(value: string) => void', required: false, description: 'Change handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="radio"', 'aria-checked'],
      keyboardNavigation: ['Arrow keys to navigate', 'Space to select'],
      screenReaderNotes: ['Announce label', 'Announce selected state', 'Announce position in group'],
    },
    usage: {
      do: [
        'Use for mutually exclusive options',
        'Use for 2-5 options',
        'One default selected',
      ],
      dont: [
        'More than 5 options (use select)',
        'Multiple selection (use checkbox)',
      ],
      examples: ['Conta à ordem', 'Conta poupança', 'Depósito a prazo'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/50a5df--controls',
  },

  Toggle: {
    name: 'Toggle',
    category: 'Controls',
    atomicLevel: 'atom',
    variants: ['default', 'with-label'],
    states: ['off', 'on', 'disabled'],
    props: [
      { name: 'label', type: 'string', required: false, description: 'Toggle label' },
      { name: 'checked', type: 'boolean', required: false, default: 'false', description: 'Toggle state' },
      { name: 'disabled', type: 'boolean', required: false, default: 'false', description: 'Disabled state' },
      { name: 'onChange', type: '(checked: boolean) => void', required: false, description: 'Change handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="switch"', 'aria-checked'],
      keyboardNavigation: ['Space to toggle'],
      screenReaderNotes: ['Announce label', 'Announce on/off state'],
    },
    usage: {
      do: [
        'Use for instant on/off settings',
        'Clear effect description',
      ],
      dont: [
        'Use when action requires submission',
        'Confusing labels (negative statements)',
      ],
      examples: ['Notificações push', 'Modo escuro', 'Autenticação biométrica'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/50a5df--controls',
  },

  Slider: {
    name: 'Slider',
    category: 'Controls',
    atomicLevel: 'atom',
    variants: ['default', 'range'],
    states: ['default', 'dragging', 'disabled'],
    props: [
      { name: 'min', type: 'number', required: true, description: 'Minimum value' },
      { name: 'max', type: 'number', required: true, description: 'Maximum value' },
      { name: 'value', type: 'number | [number, number]', required: false, description: 'Current value' },
      { name: 'step', type: 'number', required: false, default: '1', description: 'Step increment' },
      { name: 'showLabels', type: 'boolean', required: false, default: 'true', description: 'Show min/max labels' },
      { name: 'showValue', type: 'boolean', required: false, default: 'true', description: 'Show current value' },
      { name: 'onChange', type: '(value: number | [number, number]) => void', required: false, description: 'Change handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="slider"', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow'],
      keyboardNavigation: ['Arrow keys to adjust', 'Home/End for min/max'],
      screenReaderNotes: ['Announce current value', 'Announce range'],
    },
    usage: {
      do: [
        'Use for ranges',
        'Show current value',
        'Clear min/max labels',
      ],
      dont: [
        'Precise values (use input)',
        'Too many steps',
      ],
      examples: ['Montante (€500 - €5000)', 'Prazo (1 - 12 meses)'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/50a5df--controls',
  },

  // ============================================
  // CARDS
  // ============================================
  Card: {
    name: 'Card',
    category: 'Cards',
    atomicLevel: 'molecule',
    variants: ['elevated', 'outlined', 'filled'],
    states: ['default', 'hover'],
    props: [
      { name: 'variant', type: "'elevated' | 'outlined' | 'filled'", required: false, default: "'elevated'", description: 'Card visual variant' },
      { name: 'padding', type: "'none' | 'sm' | 'md' | 'lg'", required: false, default: "'md'", description: 'Card internal padding' },
      { name: 'hoverable', type: 'boolean', required: false, default: 'false', description: 'Enable hover elevation effect' },
      { name: 'children', type: 'React.ReactNode', required: false, description: 'Card content' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="article"'],
      keyboardNavigation: ['Tab to focus if hoverable'],
      screenReaderNotes: ['Announce card content'],
    },
    usage: {
      do: [
        'Use elevated for primary content cards',
        'Use outlined for secondary/data cards',
        'Use filled for highlighted sections',
        'Cards in same row must have equal height',
      ],
      dont: [
        'Use variant="account"/"info"/"product" — these do NOT exist',
        'Mix card sizes in the same grid row',
      ],
      examples: ['Card variant="elevated" padding="lg"', 'Card variant="outlined" padding="md"'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/40a56e--cards',
  },

  // ============================================
  // FEEDBACK
  // ============================================
  Alert: {
    name: 'Alert / Feedback Block',
    category: 'Feedback',
    atomicLevel: 'molecule',
    variants: ['success', 'warning', 'error', 'info'],
    states: ['default', 'dismissible'],
    props: [
      { name: 'variant', type: "'success' | 'warning' | 'error' | 'info'", required: true, description: 'Alert type (BCTT naming)' },
      { name: 'severity', type: "'success' | 'warning' | 'error' | 'info'", required: false, description: 'Alias for variant (MUI compatibility) — accepts same values' },
      { name: 'title', type: 'string', required: false, description: 'Alert title (max 60 chars)' },
      { name: 'closable', type: 'boolean', required: false, default: 'false', description: 'Show close button' },
      { name: 'onClose', type: '() => void', required: false, description: 'Close handler (requires closable=true)' },
      { name: 'children', type: 'React.ReactNode', required: true, description: 'Alert content' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="alert"', 'aria-live="polite"'],
      keyboardNavigation: ['Tab to action/dismiss'],
      screenReaderNotes: ['Announce immediately', 'Announce type (error/warning/etc)'],
    },
    usage: {
      do: [
        'Clear, actionable messages',
        'Short titles (max 60 chars)',
        'Include next steps',
      ],
      dont: [
        'Overuse alerts',
        'Vague messages',
        'Blame the user',
      ],
      examples: ['Transferência realizada com sucesso', 'Verifique os dados inseridos'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/80a5df--feedback',
  },

  Toast: {
    name: 'Toast',
    category: 'Feedback',
    atomicLevel: 'molecule',
    variants: ['success', 'warning', 'error', 'info'],
    states: ['entering', 'visible', 'exiting'],
    props: [
      { name: 'variant', type: "'success' | 'warning' | 'error' | 'info'", required: true, description: 'Toast type' },
      { name: 'message', type: 'string', required: true, description: 'Toast message (max 60 chars)' },
      { name: 'duration', type: 'number', required: false, default: '5000', description: 'Auto-dismiss duration (ms)' },
      { name: 'action', type: '{ label: string; onClick: () => void }', required: false, description: 'Action button' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="status"', 'aria-live="polite"'],
      keyboardNavigation: ['Tab to action if present'],
      screenReaderNotes: ['Announce message', 'Do not interrupt screen reader'],
    },
    usage: {
      do: [
        'Brief, non-blocking feedback',
        'Auto-dismiss after 5s',
        'Position at bottom of screen',
      ],
      dont: [
        'Critical information (use Alert)',
        'Too long duration',
      ],
      examples: ['Dados guardados', 'Email enviado', 'Copiado para a área de transferência'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/80a5df--feedback',
  },

  Banner: {
    name: 'Banner',
    category: 'Feedback',
    atomicLevel: 'molecule',
    variants: ['info', 'warning', 'promotional'],
    states: ['default', 'dismissible'],
    props: [
      { name: 'variant', type: "'info' | 'warning' | 'promotional'", required: true, description: 'Banner type' },
      { name: 'title', type: 'string', required: true, description: 'Banner title' },
      { name: 'description', type: 'string', required: false, description: 'Banner description' },
      { name: 'action', type: '{ label: string; onClick: () => void }', required: false, description: 'Action button' },
      { name: 'dismissible', type: 'boolean', required: false, default: 'true', description: 'Allow dismiss' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="banner"', 'aria-label'],
      keyboardNavigation: ['Tab to action/dismiss'],
      screenReaderNotes: ['Announce banner content'],
    },
    usage: {
      do: [
        'Top of page for system-wide messages',
        'Promotional banners for campaigns',
        'Dismissible when not critical',
      ],
      dont: [
        'Multiple banners stacked',
        'Banner for form errors',
      ],
      examples: ['Nova funcionalidade disponível', 'Manutenção programada'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/80a5df--feedback',
  },

  // ============================================
  // NAVIGATION
  // ============================================
  Tabs: {
    name: 'Tabs',
    category: 'Navigation',
    atomicLevel: 'molecule',
    variants: ['default', 'pills'],
    states: ['default', 'selected', 'disabled'],
    props: [
      { name: 'tabs', type: 'Array<{ id: string; label: string; disabled?: boolean }>', required: true, description: 'Tab items' },
      { name: 'activeTab', type: 'string', required: true, description: 'Active tab id' },
      { name: 'variant', type: "'default' | 'pills'", required: false, default: "'default'", description: 'Tabs variant' },
      { name: 'onChange', type: '(tabId: string) => void', required: true, description: 'Tab change handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="tablist"', 'role="tab"', 'aria-selected', 'aria-controls'],
      keyboardNavigation: ['Arrow keys to navigate', 'Enter/Space to select'],
      screenReaderNotes: ['Announce tab label', 'Announce selected state', 'Announce position'],
    },
    usage: {
      do: [
        'Logical tab grouping',
        '2-5 tabs maximum',
        'Clear tab labels',
      ],
      dont: [
        'Too many tabs (use navigation menu)',
        'Long tab labels',
        'Nested tabs',
      ],
      examples: ['Movimentos | Detalhes | Documentos', 'Todos | A pagar | Pagos'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/70a5df--navigation',
  },

  TabBar: {
    name: 'Tab Bar',
    category: 'Navigation',
    atomicLevel: 'organism',
    variants: ['default'],
    states: ['default', 'selected'],
    props: [
      { name: 'items', type: 'Array<{ id: string; label: string; icon: React.ReactNode }>', required: true, description: 'Tab bar items' },
      { name: 'activeItem', type: 'string', required: true, description: 'Active item id' },
      { name: 'onChange', type: '(itemId: string) => void', required: true, description: 'Item change handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="navigation"', 'aria-current'],
      keyboardNavigation: ['Tab to navigate items'],
      screenReaderNotes: ['Announce navigation label', 'Announce current section'],
    },
    usage: {
      do: [
        'Bottom of mobile screens',
        '3-5 items maximum',
        'Icon + label for clarity',
      ],
      dont: [
        'More than 5 items',
        'Desktop layouts',
      ],
      examples: ['Início | Contas | Cartões | Mais'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/70a5df--navigation',
  },

  Stepper: {
    name: 'Stepper',
    category: 'Navigation',
    atomicLevel: 'molecule',
    variants: ['horizontal', 'vertical'],
    states: ['pending', 'active', 'completed', 'error'],
    props: [
      { name: 'steps', type: 'Array<{ id: string; label: string; optional?: boolean }>', required: true, description: 'Step items' },
      { name: 'activeStep', type: 'number', required: true, description: 'Current step index' },
      { name: 'orientation', type: "'horizontal' | 'vertical'", required: false, default: "'horizontal'", description: 'Stepper orientation' },
      { name: 'onStepClick', type: '(stepIndex: number) => void', required: false, description: 'Step click handler (for navigation)' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="navigation"', 'aria-current="step"'],
      keyboardNavigation: ['Tab to navigate if interactive'],
      screenReaderNotes: ['Announce step label', 'Announce step status', 'Announce total steps'],
    },
    usage: {
      do: [
        'Multi-step processes',
        'Show progress clearly',
        '3-7 steps maximum',
      ],
      dont: [
        'Too many steps (simplify flow)',
        'Steps without clear labels',
      ],
      examples: ['Dados | Confirmação | Código | Sucesso'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/70a5df--navigation',
  },

  // ============================================
  // LISTS
  // ============================================
  ListItem: {
    name: 'List Item',
    category: 'Lists',
    atomicLevel: 'molecule',
    variants: ['default', 'transaction', 'profile', 'display'],
    states: ['default', 'hover', 'selected', 'disabled'],
    props: [
      { name: 'variant', type: "'default' | 'transaction' | 'profile' | 'display'", required: false, default: "'default'", description: 'List item variant' },
      { name: 'primary', type: 'string', required: true, description: 'Primary text' },
      { name: 'secondary', type: 'string', required: false, description: 'Secondary text' },
      { name: 'leading', type: 'React.ReactNode', required: false, description: 'Leading element (icon, avatar)' },
      { name: 'trailing', type: 'React.ReactNode', required: false, description: 'Trailing element (amount, chevron)' },
      { name: 'onClick', type: '() => void', required: false, description: 'Click handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="listitem"', 'aria-selected'],
      keyboardNavigation: ['Tab to focus', 'Enter to select if interactive'],
      screenReaderNotes: ['Announce primary text', 'Announce secondary text'],
    },
    usage: {
      do: [
        'Consistent list item types per list',
        'Clear primary text',
        'Action feedback on interactive items',
      ],
      dont: [
        'Mix different list item types',
        'Too much text',
      ],
      examples: ['Transaction (amount, date, icon)', 'Profile (name, role, avatar)'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/60a5df--lists',
  },

  Accordion: {
    name: 'Accordion',
    category: 'Lists',
    atomicLevel: 'molecule',
    variants: ['default', 'bordered'],
    states: ['collapsed', 'expanded', 'disabled'],
    props: [
      { name: 'items', type: 'Array<{ id: string; title: string; content: React.ReactNode }>', required: true, description: 'Accordion items' },
      { name: 'expandedIds', type: 'string[]', required: false, description: 'Expanded item ids' },
      { name: 'allowMultiple', type: 'boolean', required: false, default: 'false', description: 'Allow multiple expanded' },
      { name: 'onChange', type: '(expandedIds: string[]) => void', required: false, description: 'Change handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-expanded', 'aria-controls'],
      keyboardNavigation: ['Enter/Space to toggle'],
      screenReaderNotes: ['Announce expanded state', 'Announce content when expanded'],
    },
    usage: {
      do: [
        'FAQ sections',
        'Progressive disclosure',
        'Clear section headers',
      ],
      dont: [
        'Critical information hidden',
        'Too many nested accordions',
      ],
      examples: ['FAQs', 'Termos e condições (secções)', 'Detalhes de produto'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/60a5df--lists',
  },

  // ============================================
  // OVERLAYS
  // ============================================
  Modal: {
    name: 'Modal / Popup',
    category: 'Overlays',
    atomicLevel: 'organism',
    variants: ['default', 'confirmation', 'alert', 'fullscreen'],
    states: ['closed', 'open', 'closing'],
    props: [
      { name: 'open', type: 'boolean', required: true, description: 'Modal open state' },
      { name: 'title', type: 'string', required: true, description: 'Modal title' },
      { name: 'onClose', type: '() => void', required: true, description: 'Close handler' },
      { name: 'variant', type: "'default' | 'confirmation' | 'alert' | 'fullscreen'", required: false, default: "'default'", description: 'Modal variant' },
      { name: 'primaryAction', type: '{ label: string; onClick: () => void }', required: false, description: 'Primary action' },
      { name: 'secondaryAction', type: '{ label: string; onClick: () => void }', required: false, description: 'Secondary action' },
      { name: 'children', type: 'React.ReactNode', required: true, description: 'Modal content' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="dialog"', 'aria-modal', 'aria-labelledby'],
      keyboardNavigation: ['Tab trapped inside modal', 'Escape to close'],
      screenReaderNotes: ['Announce modal title', 'Focus trapped', 'Announce close on dismiss'],
    },
    usage: {
      do: [
        'Confirmation dialogs',
        'Focused user input',
        'Clear close option',
        'Focus trap',
      ],
      dont: [
        'Modal inside modal',
        'Too much content',
        'No escape route',
      ],
      examples: ['Confirmar transferência?', 'Sessão a expirar', 'Termos e condições'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/90a5df--overlays',
  },

  Drawer: {
    name: 'Drawer',
    category: 'Overlays',
    atomicLevel: 'organism',
    variants: ['left', 'right', 'bottom'],
    states: ['closed', 'open', 'closing'],
    props: [
      { name: 'open', type: 'boolean', required: true, description: 'Drawer open state' },
      { name: 'anchor', type: "'left' | 'right' | 'bottom'", required: false, default: "'bottom'", description: 'Drawer anchor position' },
      { name: 'title', type: 'string', required: false, description: 'Drawer title' },
      { name: 'onClose', type: '() => void', required: true, description: 'Close handler' },
      { name: 'children', type: 'React.ReactNode', required: true, description: 'Drawer content' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="dialog"', 'aria-modal', 'aria-labelledby'],
      keyboardNavigation: ['Tab trapped inside drawer', 'Escape to close'],
      screenReaderNotes: ['Announce drawer title', 'Announce close on dismiss'],
    },
    usage: {
      do: [
        'Bottom drawers for mobile actions',
        'Side drawers for navigation/filters',
        'Swipe to dismiss (mobile)',
      ],
      dont: [
        'Too tall bottom drawers',
        'Critical actions without confirmation',
      ],
      examples: ['Mais opções (bottom)', 'Filtros (right)', 'Menu (left)'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/90a5df--overlays',
  },

  Tooltip: {
    name: 'Tooltip',
    category: 'Overlays',
    atomicLevel: 'atom',
    variants: ['default', 'with-arrow'],
    states: ['hidden', 'visible'],
    props: [
      { name: 'content', type: 'string', required: true, description: 'Tooltip content' },
      { name: 'placement', type: "'top' | 'bottom' | 'left' | 'right'", required: false, default: "'top'", description: 'Tooltip placement' },
      { name: 'children', type: 'React.ReactNode', required: true, description: 'Trigger element' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="tooltip"', 'aria-describedby'],
      keyboardNavigation: ['Focus to show', 'Escape to hide'],
      screenReaderNotes: ['Announce tooltip content'],
    },
    usage: {
      do: [
        'Brief clarification',
        'Icon button labels',
        'Short text only',
      ],
      dont: [
        'Long content (use popover)',
        'Critical information',
        'Interactive content',
      ],
      examples: ['Copiar', 'Editar', 'Mais informações'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/90a5df--overlays',
  },

  Popover: {
    name: 'Popover',
    category: 'Overlays',
    atomicLevel: 'molecule',
    variants: ['default', 'menu'],
    states: ['hidden', 'visible'],
    props: [
      { name: 'open', type: 'boolean', required: true, description: 'Popover open state' },
      { name: 'anchorEl', type: 'HTMLElement', required: true, description: 'Anchor element' },
      { name: 'placement', type: "'top' | 'bottom' | 'left' | 'right'", required: false, default: "'bottom'", description: 'Popover placement' },
      { name: 'onClose', type: '() => void', required: true, description: 'Close handler' },
      { name: 'children', type: 'React.ReactNode', required: true, description: 'Popover content' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-haspopup', 'aria-expanded'],
      keyboardNavigation: ['Escape to close', 'Tab within popover'],
      screenReaderNotes: ['Announce popover open', 'Announce close on dismiss'],
    },
    usage: {
      do: [
        'Rich content tooltips',
        'Dropdown menus',
        'Interactive content',
      ],
      dont: [
        'Too much content (use modal)',
        'Auto-open without user action',
      ],
      examples: ['User menu', 'More options', 'Help content'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/90a5df--overlays',
  },

  // ============================================
  // DATA VISUALIZATION
  // ============================================
  DonutChart: {
    name: 'Donut Chart',
    category: 'Data Visualization',
    atomicLevel: 'molecule',
    variants: ['default', 'with-legend'],
    props: [
      { name: 'data', type: 'Array<{ label: string; value: number; color: string }>', required: true, description: 'Chart data' },
      { name: 'centerLabel', type: 'string', required: false, description: 'Center label' },
      { name: 'showLegend', type: 'boolean', required: false, default: 'true', description: 'Show legend' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="img"', 'aria-label'],
      keyboardNavigation: ['Not applicable'],
      screenReaderNotes: ['Announce chart summary', 'Announce data values'],
    },
    usage: {
      do: [
        'Part-to-whole relationships',
        'Maximum 5-6 segments',
        'Clear legend',
      ],
      dont: [
        'Too many segments',
        'Similar colors',
      ],
      examples: ['Distribuição de despesas', 'Composição do portfolio'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/85a5df--data-visualization',
  },

  ProgressCircular: {
    name: 'Circular Progress',
    category: 'Data Visualization',
    atomicLevel: 'atom',
    variants: ['determinate', 'indeterminate'],
    props: [
      { name: 'value', type: 'number', required: false, description: 'Progress value (0-100)' },
      { name: 'variant', type: "'determinate' | 'indeterminate'", required: false, default: "'indeterminate'", description: 'Progress variant' },
      { name: 'size', type: "'small' | 'medium' | 'large'", required: false, default: "'medium'", description: 'Size' },
      { name: 'showLabel', type: 'boolean', required: false, default: 'false', description: 'Show percentage label' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="progressbar"', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
      keyboardNavigation: ['Not applicable'],
      screenReaderNotes: ['Announce progress value', 'Announce completion'],
    },
    usage: {
      do: [
        'Show loading states',
        'Goal progress (savings, limits)',
        'Clear start and end values',
      ],
      dont: [
        'Without context',
        'Multiple spinners in same area',
      ],
      examples: ['Loading...', 'Poupança: 75% do objetivo'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/85a5df--data-visualization',
  },

  // ============================================
  // AVATARS & BADGES
  // ============================================
  Avatar: {
    name: 'Avatar',
    category: 'Avatars',
    atomicLevel: 'atom',
    variants: ['image', 'initials', 'icon'],
    sizes: ['small', 'medium', 'large'],
    props: [
      { name: 'src', type: 'string', required: false, description: 'Image source' },
      { name: 'alt', type: 'string', required: true, description: 'Alt text' },
      { name: 'initials', type: 'string', required: false, description: 'Initials (fallback)' },
      { name: 'icon', type: 'React.ReactNode', required: false, description: 'Icon (fallback)' },
      { name: 'size', type: "'small' | 'medium' | 'large'", required: false, default: "'medium'", description: 'Avatar size' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="img"', 'aria-label'],
      keyboardNavigation: ['Not applicable'],
      screenReaderNotes: ['Announce alt text'],
    },
    usage: {
      do: [
        'User profile representation',
        'Fallback to initials',
        'Consistent sizes per context',
      ],
      dont: [
        'Without alt text',
        'Low quality images',
      ],
      examples: ['Profile picture', 'User initials (JD)', 'Generic user icon'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/45a5df--avatars',
  },

  Badge: {
    name: 'Badge / Category Badge',
    category: 'Badges',
    atomicLevel: 'atom',
    variants: ['default', 'primary', 'success', 'warning', 'error', 'info'],
    sizes: ['small', 'medium'],
    props: [
      { name: 'variant', type: "'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'", required: false, default: "'default'", description: 'Badge variant' },
      { name: 'size', type: "'small' | 'medium'", required: false, default: "'medium'", description: 'Badge size' },
      { name: 'children', type: 'React.ReactNode', required: true, description: 'Badge content' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="status" (if dynamic)'],
      keyboardNavigation: ['Not applicable'],
      screenReaderNotes: ['Announce badge text'],
    },
    usage: {
      do: [
        'Status indicators',
        'Category labels',
        'Short text only',
      ],
      dont: [
        'Long text',
        'Too many badges',
      ],
      examples: ['Pendente', 'Aprovado', 'Novo', 'Premium'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/55a5df--category-badges',
  },

  // ============================================
  // ADDITIONAL COMPONENTS (synced from real DS)
  // ============================================
  Chip: {
    name: 'Chip',
    category: 'Controls',
    atomicLevel: 'atom',
    variants: ['filled', 'outlined'],
    states: ['default', 'hover', 'disabled'],
    props: [
      { name: 'label', type: 'string', required: true, description: 'Chip text' },
      { name: 'variant', type: "'filled' | 'outlined'", required: false, default: "'filled'", description: 'Visual variant' },
      { name: 'icon', type: 'React.ReactElement', required: false, description: 'Chip icon' },
      { name: 'onDelete', type: '() => void', required: false, description: 'Delete handler (shows X icon)' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="option"', 'aria-selected'],
      keyboardNavigation: ['Tab to focus', 'Delete to remove'],
      screenReaderNotes: ['Announce label', 'Announce deletable state'],
    },
    usage: {
      do: ['Use for tags, filters, selections', 'Use filled for selected state', 'Use outlined for unselected'],
      dont: ['Long text in chips', 'Too many chips in a row'],
      examples: ['Filtro activo', 'Tag de categoria', 'Selecção de opção'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/50a5df--controls',
  },

  TextField: {
    name: 'TextField',
    category: 'Forms',
    atomicLevel: 'atom',
    variants: ['outlined', 'filled'],
    states: ['default', 'focus', 'filled', 'error', 'disabled'],
    props: [
      { name: 'variant', type: "'outlined' | 'filled'", required: false, default: "'outlined'", description: 'Visual variant' },
      { name: 'label', type: 'string', required: false, description: 'Field label' },
      { name: 'placeholder', type: 'string', required: false, description: 'Placeholder text' },
      { name: 'leftIcon', type: 'React.ReactNode', required: false, description: 'Icon left of input' },
      { name: 'rightIcon', type: 'React.ReactNode', required: false, description: 'Icon right of input' },
      { name: 'helperText', type: 'string', required: false, description: 'Helper text below input' },
      { name: 'errorMessage', type: 'string', required: false, description: 'Error message (activates error state)' },
      { name: 'error', type: 'boolean', required: false, default: 'false', description: 'Error state' },
      { name: 'disabled', type: 'boolean', required: false, default: 'false', description: 'Disabled state' },
      { name: 'type', type: 'string', required: false, default: "'text'", description: 'Input type (text, number, password, email)' },
      { name: 'value', type: 'string', required: false, description: 'Field value' },
      { name: 'onChange', type: '(e: ChangeEvent) => void', required: false, description: 'Change handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-label', 'aria-describedby', 'aria-invalid'],
      keyboardNavigation: ['Tab to focus', 'Type to input'],
      screenReaderNotes: ['Announce label', 'Announce error message'],
    },
    usage: {
      do: ['Use for text input with MUI TextField API', 'Supports leftIcon/rightIcon for visual hints'],
      dont: ['Use for currency input (use CurrencyInput instead)', 'Placeholder as only label'],
      examples: ['Nome completo', 'Email', 'NIF', 'Montante'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/40a8df--forms',
  },

  CurrencyInput: {
    name: 'CurrencyInput',
    category: 'Forms',
    atomicLevel: 'atom',
    variants: ['default'],
    states: ['default', 'focus', 'filled', 'error', 'disabled', 'readonly'],
    props: [
      { name: 'value', type: 'number', required: false, default: '0', description: 'Currency value' },
      { name: 'currency', type: 'string', required: false, default: "'EUR'", description: 'Currency code' },
      { name: 'min', type: 'number', required: false, description: 'Minimum value' },
      { name: 'max', type: 'number', required: false, description: 'Maximum value' },
      { name: 'readOnly', type: 'boolean', required: false, default: 'false', description: 'Read-only mode' },
      { name: 'onChange', type: '(value: number) => void', required: false, description: 'Value change handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-label', 'aria-valuemin', 'aria-valuemax'],
      keyboardNavigation: ['Tab to focus', 'Type to input'],
      screenReaderNotes: ['Announce currency', 'Announce value'],
    },
    usage: {
      do: ['Use for monetary values', 'Auto-formats with currency symbol', 'Use numeric keyboard on mobile'],
      dont: ['Use for non-monetary numbers', 'Override currency formatting'],
      examples: ['Montante (€)', 'Valor do empréstimo', 'Prestação mensal'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/40a8df--forms',
  },

  DatePicker: {
    name: 'DatePicker',
    category: 'Forms',
    atomicLevel: 'atom',
    variants: ['desktop', 'mobile'],
    states: ['default', 'focus', 'filled', 'error', 'disabled'],
    props: [
      { name: 'value', type: 'Date | null', required: false, description: 'Selected date' },
      { name: 'variant', type: "'desktop' | 'mobile'", required: false, default: "'desktop'", description: 'Visual variant' },
      { name: 'onChange', type: '(date: Date | null) => void', required: false, description: 'Date change handler' },
      { name: 'label', type: 'string', required: false, description: 'Field label' },
      { name: 'minDate', type: 'Date', required: false, description: 'Minimum selectable date' },
      { name: 'maxDate', type: 'Date', required: false, description: 'Maximum selectable date' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-label', 'aria-haspopup'],
      keyboardNavigation: ['Tab to focus', 'Arrow keys to navigate calendar'],
      screenReaderNotes: ['Announce selected date', 'Announce month/year'],
    },
    usage: {
      do: ['Use for single date selection', 'Provide min/max constraints when applicable'],
      dont: ['Use for date ranges (use DateRangePicker)'],
      examples: ['Data de nascimento', 'Data de início', 'Data de vencimento'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/40a8df--forms',
  },

  DateRangePicker: {
    name: 'DateRangePicker',
    category: 'Forms',
    atomicLevel: 'molecule',
    variants: ['single', 'range'],
    states: ['default', 'focus', 'filled', 'disabled'],
    props: [
      { name: 'startDate', type: 'Date | null', required: false, description: 'Start date' },
      { name: 'endDate', type: 'Date | null', required: false, description: 'End date' },
      { name: 'variant', type: "'single' | 'range'", required: false, default: "'single'", description: 'Selection mode' },
      { name: 'label', type: 'string', required: false, description: 'Field label' },
      { name: 'placeholder', type: 'string', required: false, description: 'Placeholder text' },
      { name: 'disabled', type: 'boolean', required: false, default: 'false', description: 'Disabled state' },
      { name: 'fullWidth', type: 'boolean', required: false, default: 'false', description: 'Full width' },
      { name: 'onChange', type: '(startDate: Date | null, endDate: Date | null) => void', required: false, description: 'Date range change handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-label', 'aria-haspopup'],
      keyboardNavigation: ['Tab between start/end', 'Arrow keys in calendar'],
      screenReaderNotes: ['Announce date range', 'Announce start and end dates'],
    },
    usage: {
      do: ['Use for filtering by date range', 'Use for period selection'],
      dont: ['Use for single date (use DatePicker)'],
      examples: ['Período de movimentos', 'Intervalo de datas', 'Filtro por período'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/40a8df--forms',
  },

  FileUpload: {
    name: 'FileUpload',
    category: 'Forms',
    atomicLevel: 'molecule',
    variants: ['single', 'multiple', 'dragdrop'],
    states: ['default', 'hover', 'uploading', 'success', 'error'],
    props: [
      { name: 'accept', type: 'string', required: false, description: "Accepted file types (e.g. 'image/*,.pdf')" },
      { name: 'maxSize', type: 'number', required: false, description: 'Max file size in bytes' },
      { name: 'multiple', type: 'boolean', required: false, default: 'false', description: 'Allow multiple files' },
      { name: 'variant', type: "'single' | 'multiple' | 'dragdrop'", required: false, default: "'single'", description: 'Upload variant' },
      { name: 'label', type: 'string', required: false, default: "'Selecionar ficheiro'", description: 'Button label' },
      { name: 'onUpload', type: '(files: File[]) => void', required: false, description: 'Upload handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-label', 'aria-describedby'],
      keyboardNavigation: ['Tab to focus', 'Enter/Space to open file dialog'],
      screenReaderNotes: ['Announce accepted types', 'Announce upload state'],
    },
    usage: {
      do: ['Show accepted file types', 'Show max file size', 'Show upload progress'],
      dont: ['Accept all file types without restriction', 'No feedback on upload'],
      examples: ['Upload de documento', 'Comprovativo de morada', 'Fotografia do documento'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/40a8df--forms',
  },

  Divider: {
    name: 'Divider',
    category: 'Layout',
    atomicLevel: 'atom',
    variants: ['horizontal', 'vertical'],
    props: [
      { name: 'variant', type: "'horizontal' | 'vertical'", required: false, default: "'horizontal'", description: 'Orientation' },
      { name: 'flexItem', type: 'boolean', required: false, default: 'false', description: 'Use as flex item' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="separator"'],
      keyboardNavigation: ['Not applicable'],
      screenReaderNotes: ['Announce separator'],
    },
    usage: {
      do: ['Separate content sections', 'Use horizontal for vertical layouts', 'Use vertical in horizontal layouts'],
      dont: ['Overuse dividers (use spacing instead)', 'Use inside cards (use spacing)'],
      examples: ['Separador de secções', 'Divider entre items de lista'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/40a8df--layout',
  },

  FilterChip: {
    name: 'FilterChip',
    category: 'Controls',
    atomicLevel: 'atom',
    variants: ['default', 'outlined'],
    states: ['default', 'selected', 'disabled'],
    props: [
      { name: 'label', type: 'string', required: true, description: 'Filter label' },
      { name: 'variant', type: "'default' | 'outlined'", required: false, default: "'default'", description: 'Visual variant' },
      { name: 'onRemove', type: '() => void', required: false, description: 'Remove filter handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="option"', 'aria-selected'],
      keyboardNavigation: ['Tab to focus', 'Enter to toggle', 'Delete to remove'],
      screenReaderNotes: ['Announce filter label', 'Announce selected/removed state'],
    },
    usage: {
      do: ['Use for active filters', 'Show removable X icon', 'Group related filters'],
      dont: ['Use for non-filter selections (use Chip)', 'Too many simultaneous filters'],
      examples: ['Filtro de tipo de movimento', 'Filtro de data', 'Filtro de valor'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/50a5df--controls',
  },

  AccountCard: {
    name: 'AccountCard',
    category: 'Cards',
    atomicLevel: 'molecule',
    variants: ['clickable', 'readonly'],
    states: ['default', 'hover', 'selected'],
    props: [
      { name: 'accountName', type: 'string', required: true, description: 'Account name' },
      { name: 'nib', type: 'string', required: true, description: 'NIB number' },
      { name: 'balance', type: 'string', required: true, description: 'Formatted balance' },
      { name: 'variant', type: "'clickable' | 'readonly'", required: false, default: "'clickable'", description: 'Interaction variant' },
      { name: 'onClick', type: '() => void', required: false, description: 'Click handler' },
      { name: 'children', type: 'React.ReactNode', required: false, description: 'Additional content' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="article"', 'aria-label'],
      keyboardNavigation: ['Tab to focus', 'Enter to select if clickable'],
      screenReaderNotes: ['Announce account name', 'Announce balance'],
    },
    usage: {
      do: ['Display account summary', 'Use clickable for navigation', 'Use readonly for display-only'],
      dont: ['Show full IBAN (truncate)', 'Mix clickable and readonly in same list'],
      examples: ['Conta à Ordem - € 2.450,00', 'Conta Poupança - € 15.000,00'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/40a56e--cards',
  },

  ResultCard: {
    name: 'ResultCard',
    category: 'Cards',
    atomicLevel: 'molecule',
    variants: ['summary', 'detail', 'comparison'],
    states: ['default'],
    props: [
      { name: 'title', type: 'string', required: true, description: 'Card title' },
      { name: 'value', type: 'string', required: true, description: 'Main value to display' },
      { name: 'description', type: 'string', required: false, description: 'Additional description' },
      { name: 'variant', type: "'summary' | 'detail' | 'comparison'", required: false, default: "'summary'", description: 'Visual variant' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="article"', 'aria-label'],
      keyboardNavigation: ['Tab to focus'],
      screenReaderNotes: ['Announce title and value'],
    },
    usage: {
      do: ['Display simulation results', 'Summary of key metrics', 'Side-by-side comparisons'],
      dont: ['Too many result cards', 'Complex layouts inside'],
      examples: ['Prestação Mensal: € 450,00', 'TAEG: 3.5%', 'Total de Juros: € 12.000,00'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/40a56e--cards',
  },

  ListTransaction: {
    name: 'ListTransaction',
    category: 'Lists',
    atomicLevel: 'molecule',
    variants: ['debit', 'credit'],
    states: ['default', 'hover'],
    props: [
      { name: 'date', type: 'string', required: true, description: 'Transaction date' },
      { name: 'description', type: 'string', required: true, description: 'Transaction description' },
      { name: 'amount', type: 'string', required: true, description: 'Formatted amount' },
      { name: 'type', type: "'debit' | 'credit'", required: false, default: "'debit'", description: 'Transaction type (affects amount color)' },
      { name: 'onClick', type: '() => void', required: false, description: 'Click handler for details' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="listitem"', 'aria-label'],
      keyboardNavigation: ['Tab to focus', 'Enter for details'],
      screenReaderNotes: ['Announce date, description, and amount', 'Announce debit/credit type'],
    },
    usage: {
      do: ['Consistent format per list', 'Red for debit, green for credit', 'Show date clearly'],
      dont: ['Mix different transaction formats', 'Too much detail per item'],
      examples: ['12/01 Compra POS - € 45,00', '10/01 Transferência recebida + € 500,00'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/60a5df--lists',
  },

  ProgressBar: {
    name: 'ProgressBar',
    category: 'Data Visualization',
    atomicLevel: 'atom',
    variants: ['determinate', 'indeterminate'],
    props: [
      { name: 'value', type: 'number', required: false, default: '0', description: 'Progress value (0-100)' },
      { name: 'variant', type: "'determinate' | 'indeterminate'", required: false, default: "'determinate'", description: 'Progress variant' },
      { name: 'label', type: 'string', required: false, description: 'Progress label' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="progressbar"', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
      keyboardNavigation: ['Not applicable'],
      screenReaderNotes: ['Announce progress percentage', 'Announce completion'],
    },
    usage: {
      do: ['Show linear progress for file uploads', 'Show goal completion', 'Use label for context'],
      dont: ['Without context', 'Use for very short operations'],
      examples: ['Upload: 75%', 'Poupança: 60% do objectivo'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/85a5df--data-visualization',
  },

  Skeleton: {
    name: 'Skeleton',
    category: 'Feedback',
    atomicLevel: 'atom',
    variants: ['text', 'rectangular', 'circular'],
    props: [
      { name: 'variant', type: "'text' | 'rectangular' | 'circular'", required: false, default: "'text'", description: 'Skeleton shape' },
      { name: 'width', type: 'number | string', required: false, description: 'Skeleton width' },
      { name: 'height', type: 'number | string', required: false, description: 'Skeleton height' },
      { name: 'animation', type: "'pulse' | 'wave' | false", required: false, default: "'pulse'", description: 'Animation type' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['aria-busy="true"'],
      keyboardNavigation: ['Not applicable'],
      screenReaderNotes: ['Announce loading state'],
    },
    usage: {
      do: ['Use instead of spinners for content loading', 'Match skeleton shape to actual content', 'Use pulse animation by default'],
      dont: ['Use for very short loading (<300ms)', 'Too many different skeleton shapes in one view'],
      examples: ['Card skeleton while loading accounts', 'Text skeleton for transaction list'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/80a5df--feedback',
  },

  SliderWithInput: {
    name: 'SliderWithInput',
    category: 'Controls',
    atomicLevel: 'molecule',
    variants: ['default'],
    states: ['default', 'dragging', 'disabled'],
    props: [
      { name: 'value', type: 'number', required: false, default: '50', description: 'Current value' },
      { name: 'min', type: 'number', required: false, default: '0', description: 'Minimum value' },
      { name: 'max', type: 'number', required: false, default: '100', description: 'Maximum value' },
      { name: 'step', type: 'number', required: false, default: '1', description: 'Step increment' },
      { name: 'label', type: 'string', required: false, description: 'Slider label' },
      { name: 'unit', type: 'string', required: false, description: "Value unit (e.g. 'EUR', 'anos')" },
      { name: 'onChange', type: '(value: number) => void', required: false, description: 'Value change handler' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="slider"', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
      keyboardNavigation: ['Arrow keys to adjust slider', 'Tab between slider and input'],
      screenReaderNotes: ['Announce current value with unit', 'Announce range'],
    },
    usage: {
      do: ['Use when both slider and precise input are needed', 'Sync slider and input bidirectionally'],
      dont: ['Use for very large ranges without step', 'Use when only precise value matters (use TextField)'],
      examples: ['Montante: € 500 — € 50.000', 'Prazo: 1 — 30 anos'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/50a5df--controls',
  },

  Timeline: {
    name: 'Timeline',
    category: 'Navigation',
    atomicLevel: 'molecule',
    variants: ['vertical', 'horizontal'],
    states: ['default', 'active'],
    props: [
      { name: 'items', type: "Array<{ label: string; description?: string }>", required: true, description: 'Timeline items' },
      { name: 'activeItem', type: 'number', required: false, default: '0', description: 'Active item index' },
      { name: 'orientation', type: "'vertical' | 'horizontal'", required: false, default: "'vertical'", description: 'Timeline orientation' },
    ],
    a11y: {
      wcagLevel: 'AA',
      ariaAttributes: ['role="list"', 'aria-current'],
      keyboardNavigation: ['Tab to navigate items'],
      screenReaderNotes: ['Announce item position', 'Announce active state'],
    },
    usage: {
      do: ['Show process history', 'Show status progression', 'Use vertical for detailed timelines'],
      dont: ['Too many items without pagination', 'Use for navigation (use Stepper)'],
      examples: ['Histórico de candidatura', 'Status do pedido', 'Evolução do processo'],
    },
    zeroheightUrl: 'https://bcttdesignsystem.zeroheight.com/styleguide/s/38857/p/70a5df--navigation',
  },
};

/**
 * Get component by name (case insensitive)
 */
export function getComponentSpec(name: string): ComponentSpec | undefined {
  const normalizedName = name.toLowerCase().replace(/[^a-z]/g, '');
  return Object.values(componentSpecs).find(
    spec => spec.name.toLowerCase().replace(/[^a-z]/g, '') === normalizedName
  );
}

/**
 * Get all components by category
 */
export function getComponentsByCategory(category: string): ComponentSpec[] {
  return Object.values(componentSpecs).filter(
    spec => spec.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get all available categories
 */
export function getCategories(): string[] {
  return [...new Set(Object.values(componentSpecs).map(spec => spec.category))];
}

/**
 * Search components by keyword
 */
export function searchComponents(keyword: string): ComponentSpec[] {
  const kw = keyword.toLowerCase();
  return Object.values(componentSpecs).filter(
    spec =>
      spec.name.toLowerCase().includes(kw) ||
      spec.category.toLowerCase().includes(kw) ||
      spec.variants.some(v => v.toLowerCase().includes(kw))
  );
}
