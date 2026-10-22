# Decisões e ajustes de implementação

Não houve uma rodada de correções em Lovable. Os registros abaixo descrevem ajustes efetivamente feitos durante a construção aqui.

- Backend próprio após a dispensa explícita do Lovable: Node.js 24 e SQLite persistente, sem dependências externas.
- Idempotência no envio público e transação na conversão de interessado para cliente; repetir a conversão não cria outro cliente.
- Cliente convertido mantém status Convertido no interessado, evitando inconsistência entre as duas listas.
- Senha no login preserva espaços iniciais e finais, igual ao cadastro administrativo.
- Datas digitadas em visitas são interpretadas em UTC−03:00 e armazenadas em UTC, independentemente do fuso do navegador.
- Exclusão de interessado convertido preserva cliente e visitas, removendo somente o vínculo com o interessado.
- Lembretes de manutenção usam o último atendimento realizado de cada cliente ativo, reduzindo avisos antigos duplicados.
- Frontend não usa CDN ou recursos externos; CSP restringe scripts, estilos e conexões à própria origem.
- Script de desenvolvimento aceita a porta informada pelo ambiente de prévia; o servidor de produção continua usando PORT e APP_ORIGIN explícitos.

## Verificação executada

`npm run check` e `npm test`: 13 testes passaram na sessão de desenvolvimento, com Node.js 24.19.0. O banco de teste é temporário e removido ao final.

Publicação, contratação piloto, dados reais de mercado e homologação em celular permanecem pendentes. Não há URL pública a apresentar como resultado.

A prévia local iniciou, mas a observação pelo navegador foi bloqueada pela política do navegador da sessão. Por isso, a revisão visual e a homologação do frontend em navegador não foram concluídas. Os testes de API e de sintaxe não substituem essa etapa.

## Adaptação para Netlify

Após o pedido de usar Netlify, foram adicionados Netlify Functions, PostgreSQL via Netlify Database, migração SQL, configuração de deploy e geração local das credenciais administrativas como hash scrypt. O SQLite continua disponível para execução tradicional; na Netlify não há banco em arquivo local.

A suíte completa passou com 22 testes: 13 da versão SQLite e 9 da versão Netlify/PostgreSQL usando PGlite. Ela verifica a mesma migração e handler de produção, mas não a infraestrutura hospedada ou concorrência entre múltiplas conexões. A homologação do deploy real ainda precisa ser executada.
