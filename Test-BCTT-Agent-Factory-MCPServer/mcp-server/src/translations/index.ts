/**
 * Translations Module for DA (Design Agent)
 *
 * Generates translations for UI copy in PT and EN,
 * and exports to Excel format.
 */

import ExcelJS from 'exceljs';

/**
 * Translation entry structure
 */
export interface TranslationEntry {
  componentCode: string;      // React component code/key
  description: string;        // Description of where this text appears
  valuePT: string;            // Portuguese value
  valueEN: string;            // English value
  screen?: string;            // Screen where it appears
  userStory?: string;         // Related user story
}

/**
 * Screen copy structure
 */
export interface ScreenCopy {
  screenId: string;
  screenName: string;
  userStory: string;
  translations: TranslationEntry[];
}

/**
 * Standard translations for common UI elements
 */
export const standardTranslations: Record<string, { pt: string; en: string }> = {
  // Buttons
  'button.confirm': { pt: 'Confirmar', en: 'Confirm' },
  'button.cancel': { pt: 'Cancelar', en: 'Cancel' },
  'button.continue': { pt: 'Continuar', en: 'Continue' },
  'button.back': { pt: 'Voltar', en: 'Back' },
  'button.submit': { pt: 'Submeter', en: 'Submit' },
  'button.save': { pt: 'Guardar', en: 'Save' },
  'button.edit': { pt: 'Editar', en: 'Edit' },
  'button.delete': { pt: 'Eliminar', en: 'Delete' },
  'button.close': { pt: 'Fechar', en: 'Close' },
  'button.done': { pt: 'Concluído', en: 'Done' },
  'button.next': { pt: 'Seguinte', en: 'Next' },
  'button.previous': { pt: 'Anterior', en: 'Previous' },
  'button.retry': { pt: 'Tentar novamente', en: 'Try again' },
  'button.seeMore': { pt: 'Ver mais', en: 'See more' },
  'button.seeAll': { pt: 'Ver todos', en: 'See all' },
  'button.search': { pt: 'Pesquisar', en: 'Search' },
  'button.filter': { pt: 'Filtrar', en: 'Filter' },
  'button.clear': { pt: 'Limpar', en: 'Clear' },
  'button.apply': { pt: 'Aplicar', en: 'Apply' },

  // Form labels
  'form.required': { pt: 'Obrigatório', en: 'Required' },
  'form.optional': { pt: 'Opcional', en: 'Optional' },
  'form.email': { pt: 'Email', en: 'Email' },
  'form.password': { pt: 'Palavra-passe', en: 'Password' },
  'form.name': { pt: 'Nome', en: 'Name' },
  'form.fullName': { pt: 'Nome completo', en: 'Full name' },
  'form.phone': { pt: 'Telefone', en: 'Phone' },
  'form.mobile': { pt: 'Telemóvel', en: 'Mobile' },
  'form.address': { pt: 'Morada', en: 'Address' },
  'form.postalCode': { pt: 'Código postal', en: 'Postal code' },
  'form.city': { pt: 'Cidade', en: 'City' },
  'form.country': { pt: 'País', en: 'Country' },
  'form.date': { pt: 'Data', en: 'Date' },
  'form.dateOfBirth': { pt: 'Data de nascimento', en: 'Date of birth' },
  'form.amount': { pt: 'Montante', en: 'Amount' },
  'form.description': { pt: 'Descrição', en: 'Description' },
  'form.notes': { pt: 'Notas', en: 'Notes' },
  'form.nif': { pt: 'NIF', en: 'Tax ID' },
  'form.iban': { pt: 'IBAN', en: 'IBAN' },
  'form.bic': { pt: 'BIC/SWIFT', en: 'BIC/SWIFT' },

  // Validation messages
  'validation.required': { pt: 'Este campo é obrigatório', en: 'This field is required' },
  'validation.invalidEmail': { pt: 'Email inválido', en: 'Invalid email' },
  'validation.invalidPhone': { pt: 'Número de telefone inválido', en: 'Invalid phone number' },
  'validation.invalidIban': { pt: 'IBAN inválido', en: 'Invalid IBAN' },
  'validation.invalidNif': { pt: 'NIF inválido', en: 'Invalid tax ID' },
  'validation.minLength': { pt: 'Mínimo {min} caracteres', en: 'Minimum {min} characters' },
  'validation.maxLength': { pt: 'Máximo {max} caracteres', en: 'Maximum {max} characters' },
  'validation.minValue': { pt: 'Valor mínimo: {min}', en: 'Minimum value: {min}' },
  'validation.maxValue': { pt: 'Valor máximo: {max}', en: 'Maximum value: {max}' },
  'validation.invalidFormat': { pt: 'Formato inválido', en: 'Invalid format' },
  'validation.passwordMismatch': { pt: 'As palavras-passe não coincidem', en: 'Passwords do not match' },

  // Feedback messages
  'feedback.success': { pt: 'Sucesso', en: 'Success' },
  'feedback.error': { pt: 'Erro', en: 'Error' },
  'feedback.warning': { pt: 'Aviso', en: 'Warning' },
  'feedback.info': { pt: 'Informação', en: 'Information' },
  'feedback.loading': { pt: 'A carregar...', en: 'Loading...' },
  'feedback.processing': { pt: 'A processar...', en: 'Processing...' },
  'feedback.saving': { pt: 'A guardar...', en: 'Saving...' },
  'feedback.noResults': { pt: 'Sem resultados', en: 'No results' },
  'feedback.noData': { pt: 'Sem dados', en: 'No data' },
  'feedback.emptyList': { pt: 'Lista vazia', en: 'Empty list' },
  'feedback.operationSuccess': { pt: 'Operação realizada com sucesso', en: 'Operation completed successfully' },
  'feedback.operationError': { pt: 'Ocorreu um erro. Tente novamente.', en: 'An error occurred. Please try again.' },
  'feedback.savedSuccess': { pt: 'Dados guardados com sucesso', en: 'Data saved successfully' },
  'feedback.deletedSuccess': { pt: 'Eliminado com sucesso', en: 'Deleted successfully' },

  // Error messages (UX Writing Guidelines)
  'error.timeout': { pt: 'Algo demorou mais do que o esperado', en: 'Something took longer than expected' },
  'error.serviceUnavailable': { pt: 'Serviço temporariamente indisponível', en: 'Service temporarily unavailable' },
  'error.sessionExpired': { pt: 'A sua sessão expirou', en: 'Your session has expired' },
  'error.insufficientFunds': { pt: 'Saldo insuficiente', en: 'Insufficient funds' },
  'error.notEligible': { pt: 'Não é possível continuar', en: 'Unable to continue' },
  'error.networkError': { pt: 'Erro de ligação à rede', en: 'Network connection error' },
  'error.unknownError': { pt: 'Erro desconhecido', en: 'Unknown error' },

  // Navigation
  'nav.home': { pt: 'Início', en: 'Home' },
  'nav.accounts': { pt: 'Contas', en: 'Accounts' },
  'nav.cards': { pt: 'Cartões', en: 'Cards' },
  'nav.transfers': { pt: 'Transferências', en: 'Transfers' },
  'nav.payments': { pt: 'Pagamentos', en: 'Payments' },
  'nav.settings': { pt: 'Definições', en: 'Settings' },
  'nav.profile': { pt: 'Perfil', en: 'Profile' },
  'nav.help': { pt: 'Ajuda', en: 'Help' },
  'nav.logout': { pt: 'Sair', en: 'Logout' },
  'nav.more': { pt: 'Mais', en: 'More' },

  // Dates and time
  'date.today': { pt: 'Hoje', en: 'Today' },
  'date.yesterday': { pt: 'Ontem', en: 'Yesterday' },
  'date.tomorrow': { pt: 'Amanhã', en: 'Tomorrow' },
  'date.thisWeek': { pt: 'Esta semana', en: 'This week' },
  'date.lastWeek': { pt: 'Semana passada', en: 'Last week' },
  'date.thisMonth': { pt: 'Este mês', en: 'This month' },
  'date.lastMonth': { pt: 'Mês passado', en: 'Last month' },

  // Currency
  'currency.eur': { pt: '€', en: '€' },
  'currency.available': { pt: 'Disponível', en: 'Available' },
  'currency.balance': { pt: 'Saldo', en: 'Balance' },
  'currency.total': { pt: 'Total', en: 'Total' },

  // Common terms
  'common.yes': { pt: 'Sim', en: 'Yes' },
  'common.no': { pt: 'Não', en: 'No' },
  'common.or': { pt: 'ou', en: 'or' },
  'common.and': { pt: 'e', en: 'and' },
  'common.from': { pt: 'De', en: 'From' },
  'common.to': { pt: 'Para', en: 'To' },
  'common.by': { pt: 'Por', en: 'By' },
  'common.at': { pt: 'em', en: 'at' },
  'common.on': { pt: 'em', en: 'on' },
  'common.all': { pt: 'Todos', en: 'All' },
  'common.none': { pt: 'Nenhum', en: 'None' },
  'common.other': { pt: 'Outro', en: 'Other' },
  'common.select': { pt: 'Selecionar', en: 'Select' },
  'common.selected': { pt: 'Selecionado', en: 'Selected' },
  'common.details': { pt: 'Detalhes', en: 'Details' },
};

/**
 * Generate translation key from component code
 */
export function generateTranslationKey(
  screenId: string,
  componentType: string,
  elementName: string
): string {
  const normalized = elementName
    .toLowerCase()
    .replace(/[áàâã]/g, 'a')
    .replace(/[éèê]/g, 'e')
    .replace(/[íìî]/g, 'i')
    .replace(/[óòôõ]/g, 'o')
    .replace(/[úùû]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return `${screenId.toLowerCase()}.${componentType}.${normalized}`;
}

/**
 * Generate screen translations
 */
export function generateScreenTranslations(
  screenId: string,
  screenName: string,
  userStory: string,
  elements: Array<{
    type: 'header' | 'button' | 'label' | 'placeholder' | 'helper' | 'error' | 'title' | 'description';
    name: string;
    valuePT: string;
    valueEN: string;
  }>
): ScreenCopy {
  const translations: TranslationEntry[] = elements.map(el => ({
    componentCode: generateTranslationKey(screenId, el.type, el.name),
    description: `${el.type} - ${el.name}`,
    valuePT: el.valuePT,
    valueEN: el.valueEN,
    screen: screenId,
    userStory,
  }));

  return {
    screenId,
    screenName,
    userStory,
    translations,
  };
}

/**
 * Generate Excel file with translations
 */
export async function generateTranslationsExcel(
  bdevCode: string,
  screens: ScreenCopy[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DA (Design Agent)';
  workbook.created = new Date();

  // Main translations sheet
  const mainSheet = workbook.addWorksheet('Translations', {
    properties: { tabColor: { argb: 'E00024' } },
  });

  // Set up columns
  mainSheet.columns = [
    { header: 'Component Code', key: 'componentCode', width: 40 },
    { header: 'PT (Português)', key: 'valuePT', width: 40 },
    { header: 'EN (English)', key: 'valueEN', width: 40 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Screen', key: 'screen', width: 15 },
    { header: 'User Story', key: 'userStory', width: 15 },
  ];

  // Style header row
  mainSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  mainSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'E00024' }, // Primary color
  };
  mainSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  mainSheet.getRow(1).height = 30;

  // Add translations
  screens.forEach(screen => {
    screen.translations.forEach(t => {
      mainSheet.addRow({
        componentCode: t.componentCode,
        valuePT: t.valuePT,
        valueEN: t.valueEN,
        description: t.description,
        screen: t.screen,
        userStory: t.userStory,
      });
    });
  });

  // Auto-filter
  mainSheet.autoFilter = {
    from: 'A1',
    to: 'F1',
  };

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: '00BFB4' } },
  });

  summarySheet.columns = [
    { header: 'BDEV', key: 'bdev', width: 20 },
    { header: 'Screen ID', key: 'screenId', width: 15 },
    { header: 'Screen Name', key: 'screenName', width: 30 },
    { header: 'User Story', key: 'userStory', width: 15 },
    { header: 'Translation Count', key: 'count', width: 20 },
  ];

  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '00BFB4' }, // Success color
  };

  screens.forEach(screen => {
    summarySheet.addRow({
      bdev: bdevCode,
      screenId: screen.screenId,
      screenName: screen.screenName,
      userStory: screen.userStory,
      count: screen.translations.length,
    });
  });

  // Add total row
  const totalRow = summarySheet.addRow({
    bdev: '',
    screenId: '',
    screenName: 'TOTAL',
    userStory: '',
    count: screens.reduce((sum, s) => sum + s.translations.length, 0),
  });
  totalRow.font = { bold: true };

  // Standard translations sheet
  const standardSheet = workbook.addWorksheet('Standard Translations', {
    properties: { tabColor: { argb: 'A4BF00' } },
  });

  standardSheet.columns = [
    { header: 'Key', key: 'key', width: 30 },
    { header: 'PT (Português)', key: 'pt', width: 40 },
    { header: 'EN (English)', key: 'en', width: 40 },
    { header: 'Category', key: 'category', width: 20 },
  ];

  standardSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  standardSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'A4BF00' }, // Warning color
  };

  Object.entries(standardTranslations).forEach(([key, value]) => {
    const category = key.split('.')[0];
    standardSheet.addRow({
      key,
      pt: value.pt,
      en: value.en,
      category: category.charAt(0).toUpperCase() + category.slice(1),
    });
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate translations JSON for React i18n
 */
export function generateTranslationsJSON(screens: ScreenCopy[]): {
  pt: Record<string, string>;
  en: Record<string, string>;
} {
  const pt: Record<string, string> = {};
  const en: Record<string, string> = {};

  // Add standard translations
  Object.entries(standardTranslations).forEach(([key, value]) => {
    pt[key] = value.pt;
    en[key] = value.en;
  });

  // Add screen-specific translations
  screens.forEach(screen => {
    screen.translations.forEach(t => {
      pt[t.componentCode] = t.valuePT;
      en[t.componentCode] = t.valueEN;
    });
  });

  return { pt, en };
}

/**
 * Validate translation entry (UX Writing Guidelines)
 */
export function validateTranslation(entry: TranslationEntry): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check PT value
  if (!entry.valuePT || entry.valuePT.trim() === '') {
    errors.push('PT value is empty');
  }

  // Check EN value
  if (!entry.valueEN || entry.valueEN.trim() === '') {
    errors.push('EN value is empty');
  }

  // UX Writing Guidelines checks
  if (entry.description.includes('title') || entry.description.includes('header')) {
    // Title max 60 chars
    if (entry.valuePT.length > 60) {
      warnings.push(`PT title exceeds 60 chars (${entry.valuePT.length})`);
    }
    if (entry.valueEN.length > 60) {
      warnings.push(`EN title exceeds 60 chars (${entry.valueEN.length})`);
    }
  }

  if (entry.description.includes('description') || entry.description.includes('message')) {
    // Description max 120 chars
    if (entry.valuePT.length > 120) {
      warnings.push(`PT description exceeds 120 chars (${entry.valuePT.length})`);
    }
    if (entry.valueEN.length > 120) {
      warnings.push(`EN description exceeds 120 chars (${entry.valueEN.length})`);
    }
  }

  // Check for placeholder patterns
  const ptPlaceholders = (entry.valuePT.match(/\{[^}]+\}/g) || []).sort();
  const enPlaceholders = (entry.valueEN.match(/\{[^}]+\}/g) || []).sort();

  if (JSON.stringify(ptPlaceholders) !== JSON.stringify(enPlaceholders)) {
    warnings.push('Placeholder mismatch between PT and EN');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Export translations to base64 Excel
 */
export async function exportTranslationsToBase64(
  bdevCode: string,
  screens: ScreenCopy[]
): Promise<string> {
  const buffer = await generateTranslationsExcel(bdevCode, screens);
  return buffer.toString('base64');
}
