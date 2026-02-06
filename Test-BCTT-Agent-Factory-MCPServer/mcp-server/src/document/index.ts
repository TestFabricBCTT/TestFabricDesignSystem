// Using createRequire for ESM/CJS compatibility
import { createRequire } from "module";
import * as fs from "fs";
import * as path from "path";

const require = createRequire(import.meta.url);
const docx = require("docx");

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  PageBreak,
  Header,
  Footer,
} = docx;

// Types for document generation
export interface DocumentField {
  id: string;
  campo: string;
  regras: string;
  formatacao: string;
}

export interface DocumentScreen {
  id: string;
  nome: string;
  descricao: string;
  campos: DocumentField[];
  mockupPlaceholder?: string;
}

export interface UserStoryRef {
  id: string;
  titulo: string;
  mvp: string;
}

export interface DocumentData {
  titulo: string;
  codigoBDEV: string;
  versao: string;
  autor: string;
  data: string;
  termosAbreviaturas: Array<{ termo: string; descricao: string }>;
  documentosRelacionados: Array<{ nome: string; tipo: string; descricao: string }>;
  ecras: DocumentScreen[];
  userStories: UserStoryRef[];
  camposRegras: Array<{
    requisito: string;
    userStory: string;
    campos: string;
    regras: string;
    formatacao: string;
  }>;
}

// Helper to create table cell with borders
function createTableCell(
  text: string,
  isHeader: boolean = false,
  width?: number
): any {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: isHeader,
            size: isHeader ? 22 : 20,
          }),
        ],
        alignment: AlignmentType.LEFT,
      }),
    ],
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: isHeader ? { fill: "D9E2F3" } : undefined,
  });
}

// Helper to create a table row
function createTableRow(cells: string[], isHeader: boolean = false): any {
  return new TableRow({
    children: cells.map((cell) => createTableCell(cell, isHeader)),
  });
}

// Generate the "Informação Adicional" document
export async function generateInformacaoAdicional(
  data: DocumentData
): Promise<Buffer> {
  const sections: any[] = [];

  // Cover page
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Informação Adicional",
          bold: true,
          size: 48,
          color: "1E3A5F",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 3000, after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "(modelo de entrega AGILE)",
          size: 28,
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1000 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: data.codigoBDEV,
          bold: true,
          size: 32,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: data.titulo,
          bold: true,
          size: 36,
          color: "C8102E",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 2000 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Área: Desenvolvimentos Canais Digitais",
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Data: ${data.data}`,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Versão: ${data.versao}`,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  // Version Control Table
  sections.push(
    new Paragraph({
      text: "Controlo de Versões",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        createTableRow(["Versão", "Data", "Autor", "Descrição"], true),
        createTableRow([data.versao, data.data, data.autor, "Versão inicial"]),
      ],
    }),
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  // Terms and Abbreviations
  sections.push(
    new Paragraph({
      text: "Termos e Abreviaturas",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );

  if (data.termosAbreviaturas.length > 0) {
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          createTableRow(["Termo/Abreviatura", "Descrição"], true),
          ...data.termosAbreviaturas.map((t) =>
            createTableRow([t.termo, t.descricao])
          ),
        ],
      })
    );
  } else {
    sections.push(
      new Paragraph({
        text: "Não aplicável.",
        spacing: { after: 200 },
      })
    );
  }

  sections.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  // Related Documents
  sections.push(
    new Paragraph({
      text: "Documentos Relacionados",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );

  if (data.documentosRelacionados.length > 0) {
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          createTableRow(["Nome do Documento", "Tipo", "Descrição"], true),
          ...data.documentosRelacionados.map((d) =>
            createTableRow([d.nome, d.tipo, d.descricao])
          ),
        ],
      })
    );
  } else {
    sections.push(
      new Paragraph({
        text: "Não aplicável.",
        spacing: { after: 200 },
      })
    );
  }

  sections.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  // Section 1: Informação Adicional
  sections.push(
    new Paragraph({
      text: "1. Informação Adicional",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );

  // 1.1 Ecrãs
  sections.push(
    new Paragraph({
      text: "1.1 Ecrãs",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 },
    })
  );

  data.ecras.forEach((ecra, index) => {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${index + 1}. ${ecra.nome}`,
            bold: true,
          }),
          new TextRun({
            text: ` - ${ecra.descricao}`,
          }),
        ],
        spacing: { after: 100 },
      })
    );
  });

  sections.push(
    new Paragraph({
      spacing: { after: 200 },
    })
  );

  // 1.2 Campos e Regras
  sections.push(
    new Paragraph({
      text: "1.2 Campos e Regras",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 },
    })
  );

  if (data.camposRegras.length > 0) {
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          createTableRow(
            ["# Requisito", "# US", "Campos", "Regras", "Formatação"],
            true
          ),
          ...data.camposRegras.map((cr) =>
            createTableRow([
              cr.requisito,
              cr.userStory,
              cr.campos,
              cr.regras,
              cr.formatacao,
            ])
          ),
        ],
      })
    );
  }

  sections.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  // Section 2: Anexos - Screens
  sections.push(
    new Paragraph({
      text: "2. Anexos",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );

  data.ecras.forEach((ecra, index) => {
    sections.push(
      new Paragraph({
        text: `2.${index + 1} ${ecra.nome}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "[Mockup placeholder - a ser gerado pelo DA no Figma]",
            italics: true,
            color: "666666",
          }),
        ],
        spacing: { after: 200 },
        alignment: AlignmentType.CENTER,
      })
    );

    // Screen fields table
    if (ecra.campos.length > 0) {
      sections.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            createTableRow(
              ["ID", "CAMPOS A APRESENTAR", "REGRAS", "FORMATAÇÃO"],
              true
            ),
            ...ecra.campos.map((campo) =>
              createTableRow([
                campo.id,
                campo.campo,
                campo.regras,
                campo.formatacao,
              ])
            ),
          ],
        }),
        new Paragraph({
          spacing: { after: 400 },
        })
      );
    }
  });

  // User Stories Summary
  sections.push(
    new Paragraph({
      children: [new PageBreak()],
    }),
    new Paragraph({
      text: "3. Resumo de User Stories",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );

  if (data.userStories.length > 0) {
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          createTableRow(["ID", "Título", "MVP"], true),
          ...data.userStories.map((us) =>
            createTableRow([us.id, us.titulo, us.mvp])
          ),
        ],
      })
    );
  }

  // Create the document
  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${data.codigoBDEV} - ${data.titulo}`,
                    size: 18,
                    color: "666666",
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Banco CTT - Informação Adicional - ",
                    size: 18,
                    color: "666666",
                  }),
                  new TextRun({
                    text: `Versão ${data.versao}`,
                    size: 18,
                    color: "666666",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: sections,
      },
    ],
  });

  // Generate buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

// Save document to file
export async function saveDocument(
  data: DocumentData,
  outputPath: string
): Promise<string> {
  const buffer = await generateInformacaoAdicional(data);

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

// Generate document and return as base64
export async function generateDocumentBase64(
  data: DocumentData
): Promise<string> {
  const buffer = await generateInformacaoAdicional(data);
  return buffer.toString("base64");
}
