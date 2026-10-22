# Publicação em 22/10/2026

Aplicação: https://cuidati-salvador.netlify.app/
Repositório: https://github.com/JorgeHenriqueAlvin/cuidati-salvador

## Evidências verificadas

- Netlify concluiu o deploy de produção, com uma função e a migração do banco aplicadas.
- A visibilidade foi alterada para pública; o painel informou que qualquer pessoa pode visitar o site.
- Requisição sem sessão para a página inicial: HTTP 200.
- /api/health: HTTP 200, resposta {"ok":true}.
- /api/settings: HTTP 200; contatos ainda vazios.
- /api/admin/data e /api/session: HTTP 401 sem sessão.
- A página /admin apresenta o formulário de login.
- Screenshot da página pública: screenshots/landing-publicada.jpg.

## Ajuste observado no ambiente real

Ao renomear o site, as variáveis de URL do build anterior ainda apontavam para o endereço temporário. Isso fez a proteção de origem recusar envios pelo endereço definitivo. O handler foi corrigido para usar a origem da própria requisição, validada pelo roteamento da Netlify, ou APP_ORIGIN explícita. Foi adicionado um teste de regressão para a renomeação.

## Pendências reais

O administrador não tem credenciais padrão. O responsável precisa gerar suas credenciais com npm run admin:netlify e configurar ADMIN_EMAIL, ADMIN_PASSWORD_SALT e ADMIN_PASSWORD_HASH como variáveis protegidas do projeto Netlify, conforme docs/netlify.md. Não enviar esses valores ao GitHub ou ao chat.

Após isso, configurar WhatsApp, e-mail e horário no painel. A tela pública funciona sem esses contatos, mas não oferece o botão de WhatsApp até haver um número configurado.

O cadastro válido pelo navegador, a conversão na instalação hospedada, o painel autenticado, o teste em celular e a validação com uma pessoa real continuam pendentes. Os testes de código não substituem essas etapas. Nenhum cliente real foi registrado por esta verificação.
