# Publicar no Render

A configuração `render.yaml` usa o repositório público, Node.js 24 e disco persistente de 1 GB para o SQLite. Não depende de Lovable.

## Estado

Configuração preparada; nenhum serviço, disco ou assinatura foi contratado neste trabalho. Não há URL pública confirmada. O plano Starter e o disco exigem pagamento; conferir o total apresentado pelo Render antes de aprovar a criação.

## Etapas

1. Conectar uma conta Render e selecionar o workspace de hospedagem.
2. Criar um Blueprint a partir deste repositório e revisar os recursos e o custo. O arquivo sozinho não cria recursos.
3. Após aprovar a criação, acompanhar o build e o health check.
4. O script `scripts/start-render.sh` usa a URL pública gerada pelo Render como APP_ORIGIN. Para um domínio próprio, configurar APP_ORIGIN com a origem HTTPS exata e republicar.
5. No Shell do serviço, executar `npm run admin:create`. O comando usa o mesmo DATA_DIR do servidor e pede a senha de forma oculta. Não enviar senha ao chat ou ao GitHub.
6. Abrir /admin, configurar o WhatsApp comercial, e-mail e horário. Sem número configurado, o formulário salva pedidos sem oferecer um link de WhatsApp.
7. Testar o roteiro de `docs/testes.md`, incluindo reinício do serviço para conferir a persistência.
8. Adicionar a URL real e prints ao README somente depois de verificar a publicação.

## Operação

- O SQLite usa /var/data/cuidati, dentro do disco persistente.
- Manter uma única instância.
- TRUST_PROXY começa em 0: atrás de proxy, os limites podem ser compartilhados por visitantes. Somente habilitar 1 após confirmar a política do proxy sobre X-Forwarded-For.
- Não usar armazenamento efêmero para os dados reais.
- Monitorar consumo e configurar backup e retenção.
- A conexão da conta e aprovação do custo são pendências de publicação, não alterações no código.

Referências oficiais: https://render.com/docs/blueprint-spec e https://render.com/docs/disks
