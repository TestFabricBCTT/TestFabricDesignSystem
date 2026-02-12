# Batch 0 — Passos Manuais (Pré-requisitos)

Estes passos precisam de ser executados **uma vez** antes de correr o `start-demo.bat`.

---

## 1. Instalar Docker Desktop

- Download: https://www.docker.com/products/docker-desktop/
- Instalar e reiniciar o computador se necessário
- Verificar: abrir terminal → `docker --version` → deve mostrar versão
- Verificar: `docker compose version` → deve mostrar versão

**Nota:** O Docker Desktop para Windows requer WSL 2 ou Hyper-V.

---

## 2. Instalar Java 17+ (JDK)

Necessário para o `sonarqube-scanner` CLI.

- Download Eclipse Temurin (recomendado): https://adoptium.net/
- Seleccionar JDK 17 ou 21, Windows x64, `.msi`
- Instalar com a opção "Add to PATH" activada
- Verificar: `java -version` → deve mostrar versão 17+

---

## 3. Configurar Hosts File

Editar `C:\Windows\System32\drivers\etc\hosts` (requer Administrador):

1. Abrir Notepad como **Administrador** (right-click → Run as administrator)
2. File → Open → navegar para `C:\Windows\System32\drivers\etc\hosts`
3. Adicionar estas 7 linhas **no final do ficheiro**:

```
# Agent Factory Demo — Custom URLs
127.0.0.1   www.DCsCreatedbyAI.pt
127.0.0.1   fix.DCsCreatedbyAI.pt
127.0.0.1   backoffice.DCsCreatedbyAI.pt
127.0.0.1   api.DCsCreatedbyAI.pt
127.0.0.1   sonarqube.DCsCreatedbyAI.pt
127.0.0.1   auth.DCsCreatedbyAI.pt
127.0.0.1   workshop.DCsCreatedbyAI.pt
```

4. Guardar o ficheiro
5. Verificar: `ping www.DCsCreatedbyAI.pt` → deve resolver para 127.0.0.1

---

## 4. Arrancar Docker Containers

```bash
cd c:\Rodrigo\TestFabricDesignSystem\Test-BCTT-Agent-Factory-MCPServer\mcp-server
docker compose up -d
```

Verificar que os 3 containers arrancam:
- `agent-factory-nginx` (porta 80)
- `agent-factory-sonarqube` (porta 9000)
- `agent-factory-keycloak` (porta 8080)

```bash
docker compose ps
```

**Primeiro arranque do SonarQube demora ~2-3 minutos** (inicialização da BD interna).

---

## 5. Configuração Inicial do SonarQube

Após containers a correr:

1. Abrir `http://sonarqube.DCsCreatedbyAI.pt` (ou `http://localhost:9000`)
2. Login inicial: **admin** / **admin**
3. Forçado a mudar password → usar: **sonar1234**
4. Criar token:
   - My Account (canto superior direito) → Security → Generate Token
   - Nome: `agent-factory`
   - Type: Global Analysis Token
   - Copiar o token gerado (começa com `squ_`)
5. Criar 3 projectos (Projects → Create Project → Manually):
   - **agent-factory-core** (Key: `agent-factory-core`)
   - **agent-factory-middleware** (Key: `agent-factory-middleware`)
   - **agent-factory-dc** (Key: `agent-factory-dc`)
6. Guardar token no ficheiro `.env` do MCP server:

```bash
# Ficheiro: mcp-server/.env (criar se não existe)
SONAR_TOKEN=squ_xxxxxxxxxxxxxxxxxxxxxxxxxx
SONAR_HOST_URL=http://localhost:9000
```

7. (Opcional) Criar Quality Gate custom:
   - Administration → Quality Gates → Create
   - Nome: "Agent Factory"
   - Condições: Coverage ≥ 80%, Duplications ≤ 3%, Bugs = 0, Vulnerabilities = 0

---

## 6. Verificação do Keycloak

1. Abrir `http://auth.DCsCreatedbyAI.pt` (ou `http://localhost:8080`)
2. Login admin: **admin** / **admin1234**
3. Verificar que o realm **"bctt"** foi importado automaticamente
4. No realm "bctt", verificar:
   - Users: joao@exemplo.pt, maria@exemplo.pt, pedro@exemplo.pt, admin@bctt.pt
   - Clients: digital-channels, backoffice, middleware-api
   - Realm Roles: consultation, operations, administration, backoffice-admin

Se o realm não foi importado automaticamente:
- Ir a Administration → Create Realm → Import → seleccionar `bctt-realm.json`

---

## 7. Instalar sonarqube-scanner (global npm)

```bash
npm install -g sonarqube-scanner
```

Verificar: `sonar-scanner --version` → deve mostrar versão

---

## 8. Configurar Jira Workflow (requer Jira Admin)

No projecto **BCTT** do Jira Cloud, criar 5 custom statuses:

1. Ir a **Project Settings** → **Board** → **Columns**
2. Adicionar as seguintes colunas/statuses ao workflow:

| Status | Categoria Jira | Quando usar |
|--------|---------------|-------------|
| **Ready for Development** | Done (Fase 1 concluída) | Conceção completa (PA terminou) |
| **In Development** | In Progress | TAA + FDE/BDE a trabalhar |
| **Ready for Testing** | In Progress | Código escrito, aguarda CI/CD |
| **In Testing** | In Progress | CI/CD pipeline a correr |
| **In Production** | Done | Merged + deployed + live |

**Nota:** Sem estes statuses, as tools de transição Jira dos agentes Fase 2 vão falhar com "Invalid transition". Os statuses existentes (To Do, In Progress, Done) mantêm-se — os novos são adicionais.

3. No workflow, adicionar transições que permitam mover issues entre estes statuses

---

## Checklist Final

- [ ] Docker Desktop instalado e a correr
- [ ] Java 17+ instalado e no PATH
- [ ] Hosts file com 7 entradas
- [ ] `docker compose up -d` → 3 containers a correr
- [ ] SonarQube acessível, password mudada, token gerado, 3 projectos criados
- [ ] Keycloak acessível, realm "bctt" importado, 4 users visíveis
- [ ] `sonarqube-scanner` instalado globalmente
- [ ] Jira: 5 custom statuses criados no workflow do projecto BCTT
- [ ] Ficheiro `.env` do MCP server com SONAR_TOKEN
- [ ] `ping www.DCsCreatedbyAI.pt` resolve para 127.0.0.1
