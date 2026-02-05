"use strict";
(() => {
  // src/code.ts
  var COLORS = {
    primary: { r: 0.878, g: 0, b: 0.141 },
    // #E00024
    primaryDark: { r: 0.769, g: 0, b: 0.122 },
    // #C4001F
    textPrimary: { r: 0.2, g: 0.2, b: 0.2 },
    // #333333
    textSecondary: { r: 0.4, g: 0.4, b: 0.4 },
    // #666666
    background: { r: 0.969, g: 0.976, b: 0.988 },
    // #F7F9FC
    surface: { r: 1, g: 1, b: 1 },
    // #FFFFFF
    border: { r: 0.894, g: 0.914, b: 0.949 },
    // #E4E9F2
    success: { r: 0, g: 0.749, b: 0.706 },
    // #00BFB4
    warning: { r: 0.643, g: 0.749, b: 0 },
    // #A4BF00
    error: { r: 1, g: 0.282, b: 0.322 }
    // #FF4852
  };
  figma.showUI(__html__, { width: 400, height: 500 });
  var ALLOWED_FILE_NAME = "AI Tests";
  function checkFileRestriction() {
    const fileName = figma.root.name;
    if (!fileName.includes(ALLOWED_FILE_NAME)) {
      figma.notify(`ERRO: Este plugin s\xF3 funciona no ficheiro "${ALLOWED_FILE_NAME}". Ficheiro atual: "${fileName}"`, { error: true });
      return false;
    }
    return true;
  }
  figma.ui.onmessage = async (msg) => {
    if (msg.type !== "ping" && !checkFileRestriction()) {
      figma.ui.postMessage({ type: "error", message: "File restriction violated" });
      return;
    }
    switch (msg.type) {
      case "ping":
        figma.ui.postMessage({ type: "pong", fileName: figma.root.name });
        break;
      case "create-page":
        await handleCreatePage(msg);
        break;
      case "create-frame":
        await handleCreateFrame(msg);
        break;
      case "create-screen":
        await handleCreateScreen(msg);
        break;
      case "create-bdev-structure":
        await handleCreateBdevStructure(msg);
        break;
    }
  };
  async function handleCreatePage(msg) {
    try {
      const existingPage = figma.root.children.find((p) => p.name === msg.name);
      if (existingPage) {
        figma.ui.postMessage({ type: "page-exists", name: msg.name, id: existingPage.id });
        figma.notify(`P\xE1gina "${msg.name}" j\xE1 existe`);
        return;
      }
      const page = figma.createPage();
      page.name = msg.name;
      figma.ui.postMessage({ type: "page-created", name: msg.name, id: page.id });
      figma.notify(`P\xE1gina "${msg.name}" criada com sucesso`);
    } catch (error) {
      figma.ui.postMessage({ type: "error", message: String(error) });
    }
  }
  async function handleCreateFrame(msg) {
    try {
      const page = figma.root.children.find((p) => p.name === msg.pageName);
      if (!page) {
        figma.ui.postMessage({ type: "error", message: `P\xE1gina "${msg.pageName}" n\xE3o encontrada` });
        return;
      }
      await figma.setCurrentPageAsync(page);
      const frame = figma.createFrame();
      frame.name = msg.frame.name;
      frame.resize(msg.frame.width, msg.frame.height);
      frame.x = msg.frame.x;
      frame.y = msg.frame.y;
      frame.fills = [{ type: "SOLID", color: COLORS.background }];
      figma.ui.postMessage({ type: "frame-created", name: frame.name, id: frame.id });
      figma.notify(`Frame "${frame.name}" criado`);
    } catch (error) {
      figma.ui.postMessage({ type: "error", message: String(error) });
    }
  }
  async function handleCreateScreen(msg) {
    try {
      const page = figma.root.children.find((p) => p.name === msg.pageName);
      if (!page) {
        figma.ui.postMessage({ type: "error", message: `P\xE1gina "${msg.pageName}" n\xE3o encontrada` });
        return;
      }
      await figma.setCurrentPageAsync(page);
      const dimensions = msg.screen.type === "mobile" ? { width: 375, height: 812 } : { width: 1440, height: 900 };
      for (let i = 0; i < msg.screen.states.length; i++) {
        const state = msg.screen.states[i];
        const frame = figma.createFrame();
        frame.name = `${msg.screen.id} - ${msg.screen.name} [${state}]`;
        frame.resize(dimensions.width, dimensions.height);
        frame.x = i * (dimensions.width + 40);
        frame.y = 0;
        frame.fills = [{ type: "SOLID", color: COLORS.background }];
        if (msg.screen.header) {
          const header = figma.createFrame();
          header.name = "Header";
          header.resize(dimensions.width, 56);
          header.x = 0;
          header.y = 0;
          header.fills = [{ type: "SOLID", color: COLORS.surface }];
          frame.appendChild(header);
          const title = figma.createText();
          await figma.loadFontAsync({ family: "Inter", style: "Medium" });
          title.fontName = { family: "Inter", style: "Medium" };
          title.characters = msg.screen.header.title;
          title.fontSize = 18;
          title.fills = [{ type: "SOLID", color: COLORS.textPrimary }];
          title.x = dimensions.width / 2 - title.width / 2;
          title.y = 18;
          header.appendChild(title);
        }
        const content = figma.createFrame();
        content.name = "Content";
        content.resize(dimensions.width, dimensions.height - 56 - 72);
        content.x = 0;
        content.y = 56;
        content.fills = [{ type: "SOLID", color: COLORS.background }];
        frame.appendChild(content);
        if (msg.screen.footer) {
          const footer = figma.createFrame();
          footer.name = "Footer";
          footer.resize(dimensions.width, 72);
          footer.x = 0;
          footer.y = dimensions.height - 72;
          footer.fills = [{ type: "SOLID", color: COLORS.surface }];
          frame.appendChild(footer);
          if (msg.screen.footer.primaryAction) {
            const button = figma.createFrame();
            button.name = `Button - ${msg.screen.footer.primaryAction}`;
            button.resize(dimensions.width - 32, 48);
            button.x = 16;
            button.y = 12;
            button.fills = [{ type: "SOLID", color: COLORS.primary }];
            button.cornerRadius = 8;
            footer.appendChild(button);
          }
        }
      }
      figma.ui.postMessage({ type: "screen-created", id: msg.screen.id, statesCount: msg.screen.states.length });
      figma.notify(`Ecr\xE3 "${msg.screen.name}" criado com ${msg.screen.states.length} estados`);
    } catch (error) {
      figma.ui.postMessage({ type: "error", message: String(error) });
    }
  }
  async function handleCreateBdevStructure(msg) {
    try {
      const { bdevCode, screens } = msg;
      const screensPageName = `${bdevCode} - Ecr\xE3s`;
      let screensPage = figma.root.children.find((p) => p.name === screensPageName);
      if (!screensPage) {
        screensPage = figma.createPage();
        screensPage.name = screensPageName;
      }
      const flowPageName = `${bdevCode} - UX Flow`;
      let flowPage = figma.root.children.find((p) => p.name === flowPageName);
      if (!flowPage) {
        flowPage = figma.createPage();
        flowPage.name = flowPageName;
      }
      await figma.setCurrentPageAsync(screensPage);
      let currentY = 0;
      for (const screen of screens) {
        const dimensions = screen.type === "mobile" ? { width: 375, height: 812 } : { width: 1440, height: 900 };
        for (let i = 0; i < screen.states.length; i++) {
          const state = screen.states[i];
          const frame = figma.createFrame();
          frame.name = `${screen.id} - ${screen.name} [${state}]`;
          frame.resize(dimensions.width, dimensions.height);
          frame.x = i * (dimensions.width + 40);
          frame.y = currentY;
          frame.fills = [{ type: "SOLID", color: COLORS.background }];
          const header = figma.createFrame();
          header.name = "Header";
          header.resize(dimensions.width, 56);
          header.fills = [{ type: "SOLID", color: COLORS.surface }];
          frame.appendChild(header);
          const content = figma.createFrame();
          content.name = "Content";
          content.resize(dimensions.width, dimensions.height - 56 - 72);
          content.y = 56;
          content.fills = [{ type: "SOLID", color: COLORS.background }];
          frame.appendChild(content);
          const footer = figma.createFrame();
          footer.name = "Footer";
          footer.resize(dimensions.width, 72);
          footer.y = dimensions.height - 72;
          footer.fills = [{ type: "SOLID", color: COLORS.surface }];
          frame.appendChild(footer);
        }
        currentY += dimensions.height + 100;
      }
      figma.ui.postMessage({
        type: "bdev-structure-created",
        bdevCode,
        pagesCreated: [screensPageName, flowPageName],
        screensCount: screens.length
      });
      figma.notify(`Estrutura BDEV "${bdevCode}" criada: ${screens.length} ecr\xE3s em 2 p\xE1ginas`);
    } catch (error) {
      figma.ui.postMessage({ type: "error", message: String(error) });
    }
  }
  if (!checkFileRestriction()) {
    figma.notify(`Por favor abre o ficheiro "${ALLOWED_FILE_NAME}" para usar este plugin`, { error: true });
  }
})();
