# BCTT Bridge - Figma Plugin

Plugin Figma para receber comandos do MCP Server e criar páginas/frames automaticamente.

## Restrição de Segurança

Este plugin **só funciona** no:
- **Projeto:** AI
- **Ficheiro:** AI Tests

Se tentares usar noutro ficheiro, o plugin mostrará um erro.

## Instalação

### 1. Instalar dependências
```bash
cd figma-bctt-bridge
npm install
```

### 2. Compilar o plugin
```bash
npm run build
```

### 3. Importar no Figma Desktop

1. Abrir o ficheiro "AI Tests" no Figma Desktop
2. Menu Figma → Plugins → Development → Import plugin from manifest...
3. Selecionar o ficheiro `manifest.json` desta pasta
4. O plugin aparece em: Plugins → Development → BCTT Bridge

## Uso

### No Figma
1. Abrir o ficheiro "AI Tests"
2. Executar o plugin: Right-click → Plugins → Development → BCTT Bridge
3. Clicar "Conectar" para ligar ao MCP Server

### No MCP Server
O MCP Server precisa de ter um endpoint WebSocket em `ws://localhost:3001/figma` que envie comandos no formato:

```json
{
  "type": "create-page",
  "name": "BDEV-001 - Ecrãs"
}
```

```json
{
  "type": "create-bdev-structure",
  "bdevCode": "BDEV-001",
  "screens": [
    {
      "id": "SCR-001",
      "name": "Login",
      "type": "mobile",
      "states": ["default", "loading", "error"]
    }
  ]
}
```

## Comandos Suportados

| Comando | Descrição |
|---------|-----------|
| `create-page` | Criar uma nova página |
| `create-frame` | Criar um frame numa página |
| `create-screen` | Criar um ecrã com header/body/footer |
| `create-bdev-structure` | Criar estrutura completa de um BDEV |

## Desenvolvimento

```bash
# Compilar uma vez
npm run build

# Watch mode (recompila automaticamente)
npm run watch
```

## Estrutura do Projeto

```
figma-bctt-bridge/
├── manifest.json      # Config do plugin Figma
├── package.json       # Dependências
├── tsconfig.json      # Config TypeScript
├── src/
│   ├── code.ts        # Lógica principal (sandbox Figma)
│   └── ui.html        # Interface (WebSocket client)
└── dist/              # Ficheiros compilados
    ├── code.js
    └── ui.html
```

## Design Tokens

O plugin usa os design tokens do BCTT Design System:

| Token | Cor | Uso |
|-------|-----|-----|
| primary | #E00024 | Brand, CTAs |
| background | #F7F9FC | Fundo de páginas |
| surface | #FFFFFF | Cards, headers |
| textPrimary | #333333 | Texto principal |
