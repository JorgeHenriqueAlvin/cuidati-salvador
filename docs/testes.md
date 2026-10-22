# Roteiro de homologação

Os testes automatizados estão em `tests/app.test.js`. Este roteiro deve ser executado em uma instalação de teste com dados fictícios antes da produção.

## Página pública

1. Abrir a página no computador e em celular; verificar menus, textos, contraste e ausência de rolagem horizontal.
2. Navegar por teclado até o formulário. Todos os campos devem ter rótulo e foco visível.
3. Enviar sem preencher e com valores inválidos: quantidade zero, decimal e mensagem com mais de 1.000 caracteres devem ser recusadas.
4. Resolver a verificação simples e enviar um pedido fictício. Após sucesso, conferir o registro no painel.
5. Clicar várias vezes no envio e repetir após falha de rede: não deve haver pedidos duplicados com o mesmo identificador.
6. Testar falha do servidor: o formulário deve manter os campos, permitir nova tentativa e não apresentar falso sucesso.
7. Sem WhatsApp configurado, verificar confirmação sem botão inválido. Depois configurar um número comercial e verificar a mensagem com os dados; abrir a conversa não deve enviar a mensagem automaticamente.

## Painel

1. Sem login, tentar consultar `/api/admin/data`: resposta 401, sem dados.
2. Entrar com o administrador criado no console. Conferir busca e filtro de interessados.
3. Alterar status e observações e recarregar a página: alterações preservadas.
4. Converter um interessado e repetir a operação: apenas um cliente, interessado preservado.
5. Editar o serviço e a mensalidade opcional. Valor zero e campo vazio devem ser distinguíveis.
6. Cadastrar visita com cliente, data e hora de Salvador; alterar para Realizada e definir a próxima manutenção.
7. Verificar lembretes de visitas vencidas, próximos sete dias e próxima manutenção vencida.
8. Excluir um interessado após ler a confirmação: removê-lo da lista; preservar cliente já convertido e seu histórico.
9. Alterar contato comercial e conferir a página pública.
10. Sair da conta e tentar a API novamente: acesso negado.

## Publicação

1. Conferir HTTPS, `APP_ORIGIN` correto, cookie Secure, volume persistente e usuário sem privilégios de root.
2. Reiniciar a aplicação e confirmar que os dados fictícios continuam disponíveis.
3. Validar backup e restauração em uma instalação separada.
4. Realizar o fluxo no celular com uma pessoa real, sem expor dados pessoais em prints.
5. Registrar a URL real e evidências no README. Não anunciar publicação antes de confirmá-la.
