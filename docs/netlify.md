# Publicação na Netlify

## Arquitetura

A página em `public/` é estática. A função moderna em `netlify/functions/api.mjs` atende `/api/*`, usa `server/netlify-api.js` e grava no PostgreSQL persistente do Netlify Database por `@netlify/database`. Nenhum dado é guardado no disco temporário da função ou no navegador. O servidor SQLite continua disponível somente para desenvolvimento local e hospedagem tradicional.

As migrações ficam em `netlify/database/migrations/`. O deploy hospedado deve aplicá-las antes da publicação. O esquema usa chaves únicas, referências e transações; a conversão bloqueia o interessado durante a operação, e o envio repetido é serializado por sua chave idempotente. Cada requisição devolve a conexão ao pool, inclusive quando há erro.

## Importar do GitHub

1. Entrar em https://app.netlify.com/ e escolher importar um projeto existente do GitHub.
2. Selecionar `JorgeHenriqueAlvin/cuidati-salvador`, branch `main`.
3. Usar `netlify.toml`: build `npm run check && npm test`, publicação `public`, funções `netlify/functions` e Node 24. O Netlify instala as dependências do `package-lock.json` antes do build; os testes precisam das dependências de desenvolvimento.
4. Escolher o plano gratuito disponível na conta e conferir os limites e créditos, sem ativar recarga ou plano pago sem decisão explícita.
5. O pacote `@netlify/database` declara a necessidade do banco. Confirmar seu provisionamento em Data & Storage > Database. Se a conta não oferecer provisionamento automático, criar o Netlify Database por essa seção e disparar novo deploy. Ele exige uma conta com plano baseado em créditos.
6. Conferir no deploy se a migração `20261022170000_create_cuidati.sql` foi aplicada. Não ignorar falhas de migração e não marcar o site como funcional só porque a página abre.
7. Verificar `/api/health` (deve responder `{"ok":true}`), enviar uma solicitação fictícia e conferir no painel após configurar o administrador.

O site público pode ser publicado antes da configuração administrativa, mas `/admin` não permitirá acesso até as credenciais serem configuradas. Sem banco, os envios falham sem apresentar sucesso.

## Configurar administrador sem expor a senha

No computador do responsável, com Node 24:

```bash
npm ci
npm run admin:netlify
```

O comando solicita e-mail e senha em terminal, com entrada de senha oculta. Ele não grava a senha. Copiar os três valores apresentados para as variáveis protegidas do projeto Netlify:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_SALT`
- `ADMIN_PASSWORD_HASH`

Os dois últimos são valores derivados da senha e devem ser tratados como segredos. Configure as variáveis para o runtime Functions, não as escreva no repositório ou em `netlify.toml`. Não envie senha, hash ou salt ao chat. Republicar aplica os valores novos.

Depois acessar `/admin` com o e-mail e a senha escolhidos. Não há conta padrão, cadastro público ou rota pública de criação de administrador. Alterar qualquer um dos três valores e republicar invalida as sessões anteriores. As sessões usam cookie HttpOnly, SameSite=Strict e Secure em HTTPS e expiram em 8 horas.

O comando `admin:create` configura somente o banco SQLite local; ele NÃO configura o administrador da versão Netlify.

## Origem, domínio e limites

As mutações aceitam somente a origem da própria requisição, cujo domínio é validado pelo roteamento da Netlify. Assim, renomear o endereço do site não deixa o formulário preso a uma variável antiga do build. Para fixar um único domínio, definir `APP_ORIGIN=https://seu-dominio`, sem barra final, e republicar. Não usar o mesmo APP_ORIGIN de produção em previews com outro endereço.

Limites de login e envio ficam no Postgres; não são contadores em memória. O IP vem do `context.ip` da plataforma, sem confiar em cabeçalhos enviados pelo visitante. O desafio de soma é uma proteção básica, sem garantir bloqueio de todo spam.

O plano gratuito tem cotas de uso: a disponibilidade do banco, as funções, os builds e o tráfego dependem dos créditos e regras da conta. Não é promessa de hospedagem ilimitada ou grátis para qualquer volume. A configuração não cria serviço Render e não requer seu disco pago.

## Testes e publicação real

`npm test` executa as suítes SQLite e Postgres. A suíte Netlify usa PGlite, um motor Postgres local de teste, com a mesma migração SQL e o mesmo handler. Não testa infraestrutura real, rede, roteamento da plataforma ou concorrência entre múltiplas conexões do Postgres hospedado.

Antes de entregar o desafio:

- Verificar build e migrações no Netlify.
- Configurar o administrador e o WhatsApp comercial.
- Testar cadastro, conversão, edição e visitas pelo navegador e celular.
- Repetir conversões simultâneas e novas tentativas de envio na instalação de teste hospedada.
- Adicionar a URL efetivamente publicada e prints sem dados pessoais ao README.
- Registrar uma validação real do negócio. A existência do site não comprova disposição de pagar.

Referências oficiais: https://docs.netlify.com/build/data-and-storage/netlify-database/ , https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/ e https://docs.netlify.com/build/functions/api/
