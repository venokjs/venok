import { AST_NODE_TYPES, ESLintUtils, TSESTree } from "@typescript-eslint/utils";

type MessageIds = "incorrectOrder";
type Options = [{ internalPatterns?: string[] }];

interface ImportSpecifierInfo {
  name: string;
  alias?: string;
  isType: boolean;
}

interface ImportInfo {
  node: TSESTree.ImportDeclaration;
  source: string;
  defaultImport?: { name: string; isType: boolean };
  namespaceImport?: string;
  namedImports: ImportSpecifierInfo[];
  isExternal: boolean;
  group: number;
  hasAnyValue: boolean;
}

export const sortImportsRule = ESLintUtils.RuleCreator(
  (name) => `https://your-docs-url.com/rule/${name}`
)<Options, MessageIds>({
  name: "sort-imports",
  meta: {
    type: "suggestion",
    docs: {
      description: "Сортирует и объединяет импорты: типы/функционал, внешние/внутренние",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          internalPatterns: {
            type: "array",
            items: { type: "string" },
            description: "Паттерны для определения внутренних импортов",
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      incorrectOrder: "Импорты должны быть объединены и отсортированы",
    },
  },
  defaultOptions: [{ internalPatterns: ["@/", "~/", "src/"] }],
  create(context, [options]) {
    const internalPatterns = options.internalPatterns || ["@/", "~/", "src/"];

    function isInternalImport(source: string): boolean {
      return source.startsWith(".") || source.startsWith("/") ||
        internalPatterns.some(p => source.startsWith(p));
    }

    function parseImportDeclaration(node: TSESTree.ImportDeclaration): ImportInfo {
      const source = node.source.value;
      const isExternal = !isInternalImport(source);
      const namedImports: ImportSpecifierInfo[] = [];
      let defaultImport: { name: string; isType: boolean } | undefined;
      let namespaceImport: string | undefined;
      let hasAnyValue = false;
      const isWholeImportType = node.importKind === "type";

      for (const specifier of node.specifiers) {
        if (specifier.type === AST_NODE_TYPES.ImportDefaultSpecifier) {
          defaultImport = { name: specifier.local.name, isType: isWholeImportType };
          if (!isWholeImportType) hasAnyValue = true;
        } else if (specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
          namespaceImport = specifier.local.name;
          if (!isWholeImportType) hasAnyValue = true;
        } else if (specifier.type === AST_NODE_TYPES.ImportSpecifier) {
          const isSpecifierType = isWholeImportType || specifier.importKind === "type";
          namedImports.push({
            name: (specifier.imported as TSESTree.Identifier).name,
            alias: specifier.local.name !== (specifier.imported as TSESTree.Identifier).name ? specifier.local.name : undefined,
            isType: isSpecifierType,
          });
          if (!isSpecifierType) hasAnyValue = true;
        }
      }

      const isTypeOnlyImport = !hasAnyValue;
      let group: number;
      if (isTypeOnlyImport && isExternal) group = 1;
      else if (isTypeOnlyImport && !isExternal) group = 2;
      else if (!isTypeOnlyImport && isExternal) group = 3;
      else group = 4;

      // Сортируем named imports для консистентности
      namedImports.sort((a, b) => {
        if (a.name !== b.name) return a.name.localeCompare(b.name);
        if (a.alias && b.alias) return a.alias.localeCompare(b.alias);
        return 0;
      });

      return { node, source, defaultImport, namespaceImport, namedImports, isExternal, group, hasAnyValue };
    }

    function mergeImportsBySource(imports: ImportInfo[]): ImportInfo[] {
      // УБРАЛИ: if (imports.length === 1) return imports;
      // Теперь ВСЕГДА разделяем inline типы!

      // Разделяем на типы и значения
      const typeOnlyImports = imports.filter(imp => !imp.hasAnyValue);
      const valueImports = imports.filter(imp => imp.hasAnyValue);

      const result: ImportInfo[] = [];

      // Собираем все типы (из type-only импортов И inline types из value импортов)
      const allTypeSpecifiers = new Map<string, ImportSpecifierInfo>();
      let typeDefaultImport: { name: string; isType: boolean } | undefined;
      let typeNamespaceImport: string | undefined;

      for (const imp of typeOnlyImports) {
        if (imp.defaultImport && !typeDefaultImport) {
          typeDefaultImport = imp.defaultImport;
        }
        if (imp.namespaceImport && !typeNamespaceImport) {
          typeNamespaceImport = imp.namespaceImport;
        }
        for (const named of imp.namedImports) {
          const key = named.alias ? `${named.name}:${named.alias}` : named.name;
          allTypeSpecifiers.set(key, named);
        }
      }

      // Добавляем inline типы из value импортов
      for (const imp of valueImports) {
        for (const named of imp.namedImports.filter(n => n.isType)) {
          const key = named.alias ? `${named.name}:${named.alias}` : named.name;
          if (!allTypeSpecifiers.has(key)) {
            allTypeSpecifiers.set(key, { ...named, isType: true });
          }
        }
      }

      // Если есть типы, создаём type импорт
      if (allTypeSpecifiers.size > 0 || typeDefaultImport || typeNamespaceImport) {
        const namedImports = Array.from(allTypeSpecifiers.values());
        // Сортируем для стабильного порядка
        namedImports.sort((a, b) => {
          if (a.name !== b.name) return a.name.localeCompare(b.name);
          if (a.alias && b.alias) return a.alias.localeCompare(b.alias);
          return 0;
        });

        const typeImport: ImportInfo = {
          node: imports[0].node,
          source: imports[0].source,
          isExternal: imports[0].isExternal,
          hasAnyValue: false,
          group: imports[0].isExternal ? 1 : 2,
          namedImports,
          defaultImport: typeDefaultImport,
          namespaceImport: typeNamespaceImport,
        };
        result.push(typeImport);
      }

      // Собираем все значения (только не-типы)
      if (valueImports.length > 0) {
        const allValueSpecifiers = new Map<string, ImportSpecifierInfo>();
        let valueDefaultImport: { name: string; isType: boolean } | undefined;
        let valueNamespaceImport: string | undefined;

        for (const imp of valueImports) {
          if (imp.defaultImport && !valueDefaultImport) {
            valueDefaultImport = imp.defaultImport;
          }
          if (imp.namespaceImport && !valueNamespaceImport) {
            valueNamespaceImport = imp.namespaceImport;
          }
          for (const named of imp.namedImports.filter(n => !n.isType)) {
            const key = named.alias ? `${named.name}:${named.alias}` : named.name;
            allValueSpecifiers.set(key, named);
          }
        }

        const namedImports = Array.from(allValueSpecifiers.values());
        // Сортируем для стабильного порядка
        namedImports.sort((a, b) => {
          if (a.name !== b.name) return a.name.localeCompare(b.name);
          if (a.alias && b.alias) return a.alias.localeCompare(b.alias);
          return 0;
        });

        const valueImport: ImportInfo = {
          node: imports[0].node,
          source: imports[0].source,
          isExternal: imports[0].isExternal,
          hasAnyValue: true,
          group: imports[0].isExternal ? 3 : 4,
          namedImports,
          defaultImport: valueDefaultImport,
          namespaceImport: valueNamespaceImport,
        };
        result.push(valueImport);
      }

      return result;
    }

    function generateImportText(imp: ImportInfo): string {
      const useTypeKeyword = !imp.hasAnyValue;
      let result = "import";
      if (useTypeKeyword) result += " type";

      const parts: string[] = [];
      if (imp.defaultImport) parts.push(imp.defaultImport.name);
      if (imp.namespaceImport) parts.push(`* as ${imp.namespaceImport}`);

      if (imp.namedImports.length > 0) {
        const sortedNamed = [...imp.namedImports].sort((a, b) => {
          if (a.name !== b.name) return a.name.localeCompare(b.name);
          if (a.alias && b.alias) return a.alias.localeCompare(b.alias);
          return 0;
        });

        const namedParts = sortedNamed.map(n => {
          // КРИТИЧНО: Для value импортов НЕ должно быть inline типов!
          // Они должны быть извлечены в отдельный type import
          // Но на всякий случай проверяем
          if (!useTypeKeyword && n.isType) {
            console.warn(`WARNING: Found inline type "${n.name}" in value import from "${imp.source}"`);
          }

          const name = n.alias ? `${n.name} as ${n.alias}` : n.name;
          return name;
        });

        parts.push(`{ ${namedParts.join(", ")} }`);
      }

      result += " " + parts.join(", ") + ` from "${imp.source}";`;
      return result;
    }

    function sortByLength(imports: ImportInfo[]): ImportInfo[] {
      return imports.sort((a, b) => generateImportText(b).length - generateImportText(a).length);
    }

    function generateCorrectImportsText(imports: ImportInfo[]): string {
      const groups: { [key: number]: ImportInfo[] } = { 1: [], 2: [], 3: [], 4: [] };
      for (const imp of imports) {
        groups[imp.group].push(imp);
      }

      // Сортируем только группы типов (1 и 2) по длине
      groups[1] = sortByLength(groups[1]);
      groups[2] = sortByLength(groups[2]);

      const result: string[] = [];
      for (const groupNum of [1, 2, 3, 4]) {
        if (groups[groupNum].length > 0) {
          result.push(groups[groupNum].map(generateImportText).join("\n"));
        }
      }

      return result.join("\n\n");
    }

    function createImportSignature(imp: ImportInfo): string {
      const defaultPart = imp.defaultImport ? `default:${imp.defaultImport.name}` : "";
      const namespacePart = imp.namespaceImport ? `namespace:${imp.namespaceImport}` : "";
      const namedPart = imp.namedImports
        .map(n => `${n.isType ? "type:" : ""}${n.name}${n.alias ? ":" + n.alias : ""}`)
        .sort()
        .join(",");

      return `${imp.source}|${imp.group}|${defaultPart}|${namespacePart}|${namedPart}`;
    }

    function areImportsStructurallySame(current: ImportInfo[], expected: ImportInfo[]): boolean {
      if (current.length !== expected.length) return false;

      for (let i = 0; i < current.length; i++) {
        const currentSig = createImportSignature(current[i]);
        const expectedSig = createImportSignature(expected[i]);

        if (currentSig !== expectedSig) {
          return false;
        }
      }

      return true;
    }

    return {
      Program(node) {
        const importNodes: TSESTree.ImportDeclaration[] = [];
        for (const statement of node.body) {
          if (statement.type === AST_NODE_TYPES.ImportDeclaration) {
            importNodes.push(statement);
          }
        }

        if (importNodes.length === 0) return;

        // Парсим текущие импорты КАК ОНИ ЕСТЬ (без мерджа)
        const currentImports = importNodes.map(parseImportDeclaration);

        // Генерируем ОЖИДАЕМУЮ структуру (с мерджем и сортировкой)
        const bySource = new Map<string, ImportInfo[]>();
        for (const imp of currentImports) {
          if (!bySource.has(imp.source)) bySource.set(imp.source, []);
          bySource.get(imp.source)!.push(imp);
        }

        const mergedImports: ImportInfo[] = [];
        for (const imports of bySource.values()) {
          mergedImports.push(...mergeImportsBySource(imports));
        }

        const groups: { [key: number]: ImportInfo[] } = { 1: [], 2: [], 3: [], 4: [] };
        for (const imp of mergedImports) {
          groups[imp.group].push(imp);
        }

        groups[1] = sortByLength(groups[1]);
        groups[2] = sortByLength(groups[2]);

        const expectedImports: ImportInfo[] = [];
        for (const groupNum of [1, 2, 3, 4]) {
          expectedImports.push(...groups[groupNum]);
        }

        // Сравниваем ИСХОДНЫЕ импорты с ОЖИДАЕМЫМИ
        if (!areImportsStructurallySame(currentImports, expectedImports)) {
          const correctText = generateCorrectImportsText(expectedImports);

          context.report({
            node: importNodes[0],
            messageId: "incorrectOrder",
            fix: fixer => fixer.replaceTextRange(
              [importNodes[0].range[0], importNodes[importNodes.length - 1].range[1]],
              correctText
            ),
          });
        }
      },
    };
  },
});

export default sortImportsRule;