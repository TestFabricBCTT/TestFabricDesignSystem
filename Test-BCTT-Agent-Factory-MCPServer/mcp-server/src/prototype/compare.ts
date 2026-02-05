/**
 * Prototype Compare Module
 * Handles comparison between prototype versions (FA vs Client approved)
 */

import {
  PrototypeRecord,
  GeneratedScreen,
  Journey,
  ScreenComponent,
} from './storage.js';

// ============================================
// TYPES
// ============================================

export interface ScreenDiff {
  screenId: string;
  screenName: string;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  componentChanges?: ComponentDiff[];
  translationChanges?: TranslationDiff[];
}

export interface ComponentDiff {
  path: string;  // e.g., "body.sections[0].components[1]"
  changeType: 'added' | 'removed' | 'modified';
  oldValue?: ScreenComponent;
  newValue?: ScreenComponent;
  description: string;
}

export interface TranslationDiff {
  key: string;
  language: 'pt' | 'en';
  changeType: 'added' | 'removed' | 'modified';
  oldValue?: string;
  newValue?: string;
}

export interface JourneyDiff {
  journeyId: string;
  journeyName: string;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  screenChanges?: string[];  // List of added/removed screen IDs
}

export interface PrototypeComparison {
  sourceVersion: number;
  targetVersion: number;
  sourceStatus: string;
  targetStatus: string;
  hasChanges: boolean;
  summary: {
    screensAdded: number;
    screensRemoved: number;
    screensModified: number;
    journeysChanged: number;
    translationsChanged: number;
  };
  screenDiffs: ScreenDiff[];
  journeyDiffs: JourneyDiff[];
  recommendations: string[];
}

// ============================================
// COMPARISON FUNCTIONS
// ============================================

/**
 * Compares two prototype versions
 */
export function comparePrototypes(
  source: PrototypeRecord,
  target: PrototypeRecord
): PrototypeComparison {
  const screenDiffs = compareScreens(source.screens, target.screens);
  const journeyDiffs = compareJourneys(source.journeySnapshot, target.journeySnapshot);

  const summary = {
    screensAdded: screenDiffs.filter(d => d.changeType === 'added').length,
    screensRemoved: screenDiffs.filter(d => d.changeType === 'removed').length,
    screensModified: screenDiffs.filter(d => d.changeType === 'modified').length,
    journeysChanged: journeyDiffs.filter(d => d.changeType !== 'unchanged').length,
    translationsChanged: screenDiffs.reduce(
      (count, d) => count + (d.translationChanges?.length || 0),
      0
    ),
  };

  const hasChanges =
    summary.screensAdded > 0 ||
    summary.screensRemoved > 0 ||
    summary.screensModified > 0 ||
    summary.journeysChanged > 0;

  const recommendations = generateRecommendations(screenDiffs, journeyDiffs, source, target);

  return {
    sourceVersion: source.version,
    targetVersion: target.version,
    sourceStatus: source.status,
    targetStatus: target.status,
    hasChanges,
    summary,
    screenDiffs,
    journeyDiffs,
    recommendations,
  };
}

/**
 * Compares screens between two prototype versions
 */
function compareScreens(
  sourceScreens: GeneratedScreen[],
  targetScreens: GeneratedScreen[]
): ScreenDiff[] {
  const diffs: ScreenDiff[] = [];
  const sourceMap = new Map(sourceScreens.map(s => [s.screenId, s]));
  const targetMap = new Map(targetScreens.map(s => [s.screenId, s]));

  // Check for removed and modified screens
  for (const [screenId, sourceScreen] of sourceMap) {
    const targetScreen = targetMap.get(screenId);

    if (!targetScreen) {
      diffs.push({
        screenId,
        screenName: sourceScreen.screenName,
        changeType: 'removed',
      });
    } else {
      const componentChanges = compareComponents(sourceScreen.components, targetScreen.components);
      const translationChanges = compareTranslations(
        sourceScreen.translations,
        targetScreen.translations
      );

      if (componentChanges.length > 0 || translationChanges.length > 0) {
        diffs.push({
          screenId,
          screenName: targetScreen.screenName,
          changeType: 'modified',
          componentChanges,
          translationChanges,
        });
      } else {
        diffs.push({
          screenId,
          screenName: targetScreen.screenName,
          changeType: 'unchanged',
        });
      }
    }
  }

  // Check for added screens
  for (const [screenId, targetScreen] of targetMap) {
    if (!sourceMap.has(screenId)) {
      diffs.push({
        screenId,
        screenName: targetScreen.screenName,
        changeType: 'added',
      });
    }
  }

  return diffs;
}

/**
 * Compares components between two screens
 */
function compareComponents(
  sourceComponents: ScreenComponent[],
  targetComponents: ScreenComponent[],
  path: string = ''
): ComponentDiff[] {
  const diffs: ComponentDiff[] = [];

  const maxLen = Math.max(sourceComponents.length, targetComponents.length);

  for (let i = 0; i < maxLen; i++) {
    const currentPath = path ? `${path}[${i}]` : `[${i}]`;
    const source = sourceComponents[i];
    const target = targetComponents[i];

    if (!source && target) {
      diffs.push({
        path: currentPath,
        changeType: 'added',
        newValue: target,
        description: `Component added: ${target.type}`,
      });
    } else if (source && !target) {
      diffs.push({
        path: currentPath,
        changeType: 'removed',
        oldValue: source,
        description: `Component removed: ${source.type}`,
      });
    } else if (source && target) {
      // Compare component properties
      if (JSON.stringify(source) !== JSON.stringify(target)) {
        diffs.push({
          path: currentPath,
          changeType: 'modified',
          oldValue: source,
          newValue: target,
          description: `Component modified: ${source.type} → ${target.type}`,
        });
      }

      // Compare children recursively
      if (source.children || target.children) {
        const childDiffs = compareComponents(
          source.children || [],
          target.children || [],
          `${currentPath}.children`
        );
        diffs.push(...childDiffs);
      }
    }
  }

  return diffs;
}

/**
 * Compares translations between two screens
 */
function compareTranslations(
  source: { pt: Record<string, string>; en: Record<string, string> },
  target: { pt: Record<string, string>; en: Record<string, string> }
): TranslationDiff[] {
  const diffs: TranslationDiff[] = [];

  // Compare PT translations
  const allPtKeys = new Set([...Object.keys(source.pt), ...Object.keys(target.pt)]);
  for (const key of allPtKeys) {
    const oldVal = source.pt[key];
    const newVal = target.pt[key];

    if (!oldVal && newVal) {
      diffs.push({ key, language: 'pt', changeType: 'added', newValue: newVal });
    } else if (oldVal && !newVal) {
      diffs.push({ key, language: 'pt', changeType: 'removed', oldValue: oldVal });
    } else if (oldVal !== newVal) {
      diffs.push({ key, language: 'pt', changeType: 'modified', oldValue: oldVal, newValue: newVal });
    }
  }

  // Compare EN translations
  const allEnKeys = new Set([...Object.keys(source.en), ...Object.keys(target.en)]);
  for (const key of allEnKeys) {
    const oldVal = source.en[key];
    const newVal = target.en[key];

    if (!oldVal && newVal) {
      diffs.push({ key, language: 'en', changeType: 'added', newValue: newVal });
    } else if (oldVal && !newVal) {
      diffs.push({ key, language: 'en', changeType: 'removed', oldValue: oldVal });
    } else if (oldVal !== newVal) {
      diffs.push({ key, language: 'en', changeType: 'modified', oldValue: oldVal, newValue: newVal });
    }
  }

  return diffs;
}

/**
 * Compares journeys between two prototype versions
 */
function compareJourneys(
  sourceJourneys: Journey[],
  targetJourneys: Journey[]
): JourneyDiff[] {
  const diffs: JourneyDiff[] = [];
  const sourceMap = new Map(sourceJourneys.map(j => [j.id, j]));
  const targetMap = new Map(targetJourneys.map(j => [j.id, j]));

  // Check for removed and modified journeys
  for (const [journeyId, sourceJourney] of sourceMap) {
    const targetJourney = targetMap.get(journeyId);

    if (!targetJourney) {
      diffs.push({
        journeyId,
        journeyName: sourceJourney.name,
        changeType: 'removed',
      });
    } else {
      const addedScreens = targetJourney.screens.filter(s => !sourceJourney.screens.includes(s));
      const removedScreens = sourceJourney.screens.filter(s => !targetJourney.screens.includes(s));

      if (addedScreens.length > 0 || removedScreens.length > 0) {
        diffs.push({
          journeyId,
          journeyName: targetJourney.name,
          changeType: 'modified',
          screenChanges: [...addedScreens.map(s => `+${s}`), ...removedScreens.map(s => `-${s}`)],
        });
      } else {
        diffs.push({
          journeyId,
          journeyName: targetJourney.name,
          changeType: 'unchanged',
        });
      }
    }
  }

  // Check for added journeys
  for (const [journeyId, targetJourney] of targetMap) {
    if (!sourceMap.has(journeyId)) {
      diffs.push({
        journeyId,
        journeyName: targetJourney.name,
        changeType: 'added',
        screenChanges: targetJourney.screens.map(s => `+${s}`),
      });
    }
  }

  return diffs;
}

/**
 * Generates recommendations based on the comparison
 */
function generateRecommendations(
  screenDiffs: ScreenDiff[],
  journeyDiffs: JourneyDiff[],
  source: PrototypeRecord,
  target: PrototypeRecord
): string[] {
  const recommendations: string[] = [];

  // Check if client made changes to FA approved version
  if (source.status === 'fa_approved' && target.approvedBy === 'Client') {
    const modifiedScreens = screenDiffs.filter(d => d.changeType === 'modified');
    if (modifiedScreens.length > 0) {
      recommendations.push(
        `O cliente alterou ${modifiedScreens.length} ecrã(s) após aprovação do FA. ` +
        `Reveja as alterações e atualize o protótipo para versão final.`
      );
    }

    const addedScreens = screenDiffs.filter(d => d.changeType === 'added');
    if (addedScreens.length > 0) {
      recommendations.push(
        `O cliente adicionou ${addedScreens.length} novo(s) ecrã(s). ` +
        `Verifique se estão de acordo com os requisitos do FA.`
      );
    }
  }

  // Check for removed screens
  const removedScreens = screenDiffs.filter(d => d.changeType === 'removed');
  if (removedScreens.length > 0) {
    recommendations.push(
      `Atenção: ${removedScreens.length} ecrã(s) foram removidos. ` +
      `Confirme se a remoção é intencional.`
    );
  }

  // Check for translation changes
  const translationChanges = screenDiffs.reduce(
    (count, d) => count + (d.translationChanges?.filter(t => t.changeType === 'modified').length || 0),
    0
  );
  if (translationChanges > 0) {
    recommendations.push(
      `${translationChanges} tradução(ões) foram alteradas. ` +
      `Verifique a consistência entre PT e EN.`
    );
  }

  // Check for journey changes
  const modifiedJourneys = journeyDiffs.filter(d => d.changeType === 'modified');
  if (modifiedJourneys.length > 0) {
    recommendations.push(
      `${modifiedJourneys.length} jornada(s) foram modificadas. ` +
      `Reveja o fluxo de navegação.`
    );
  }

  // If no changes, recommend finalization
  if (!screenDiffs.some(d => d.changeType !== 'unchanged')) {
    recommendations.push(
      'Não foram detetadas alterações significativas. ' +
      'O protótipo pode ser finalizado.'
    );
  }

  return recommendations;
}

/**
 * Generates a summary text of the comparison
 */
export function generateComparisonSummary(comparison: PrototypeComparison): string {
  const lines: string[] = [
    `## Comparação de Protótipos`,
    ``,
    `**Versão Origem:** v${comparison.sourceVersion} (${comparison.sourceStatus})`,
    `**Versão Destino:** v${comparison.targetVersion} (${comparison.targetStatus})`,
    ``,
    `### Resumo de Alterações`,
    `- Ecrãs adicionados: ${comparison.summary.screensAdded}`,
    `- Ecrãs removidos: ${comparison.summary.screensRemoved}`,
    `- Ecrãs modificados: ${comparison.summary.screensModified}`,
    `- Jornadas alteradas: ${comparison.summary.journeysChanged}`,
    `- Traduções alteradas: ${comparison.summary.translationsChanged}`,
    ``,
  ];

  if (comparison.screenDiffs.filter(d => d.changeType !== 'unchanged').length > 0) {
    lines.push(`### Detalhes dos Ecrãs`);
    for (const diff of comparison.screenDiffs) {
      if (diff.changeType === 'unchanged') continue;
      lines.push(`- **${diff.screenName}** (${diff.screenId}): ${diff.changeType}`);
      if (diff.componentChanges && diff.componentChanges.length > 0) {
        for (const comp of diff.componentChanges.slice(0, 3)) {
          lines.push(`  - ${comp.description}`);
        }
        if (diff.componentChanges.length > 3) {
          lines.push(`  - ... e mais ${diff.componentChanges.length - 3} alterações`);
        }
      }
    }
    lines.push(``);
  }

  if (comparison.recommendations.length > 0) {
    lines.push(`### Recomendações`);
    for (const rec of comparison.recommendations) {
      lines.push(`- ${rec}`);
    }
  }

  return lines.join('\n');
}
