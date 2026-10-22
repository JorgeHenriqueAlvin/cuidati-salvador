# Briefing de construção do CuidaTI Salvador

Este arquivo registra o prompt consolidado da implementação. Não é um histórico exportado do Lovable: o usuário escolheu construir diretamente aqui e enviar ao GitHub.

## Objetivo

Criar um MVP responsivo em português para manutenção preventiva de computadores de pequenos negócios em Salvador/BA. Testar interesse em serviço recorrente com preço e escopo por proposta. Fechamento, pagamento e confirmação da agenda manuais pelo WhatsApp.

## Identidade

Nome CuidaTI Salvador. Azul-marinho #0B2341, ciano #19C7D8, branco #FFFFFF e fundo #F4F7FB. Estilo profissional e acessível, ícones simples e ilustração em CSS, sem imagens geradas por IA.

## Página pública

Cabeçalho com Serviços, Como funciona e Solicitar orçamento. Explicar cuidados preventivos antes de uma falha interromper o trabalho. Público de aproximadamente 3 a 20 computadores sem equipe própria de TI. Serviços: manutenção agendada, verificação e atualizações autorizadas, histórico, suporte contratado e orientações sobre backup. Peças, licenças, recuperação de dados e adicionais separados. Não prometer atendimento ilimitado, 24 horas ou ausência de falhas. Atendimento em Salvador, disponibilidade e deslocamento conforme bairro. Perguntas frequentes sem preços, depoimentos ou números inventados.

## Formulário e WhatsApp

Nome, empresa, WhatsApp com DDD, bairro, quantidade inteira positiva de computadores, dificuldade de até 1.000 caracteres e interesse (avulsa, recorrente ou orientação). Aviso de uso dos dados para responder e preparar proposta. Não pedir CPF, senhas ou dados bancários. Validar no frontend e backend, limitar requisições e envios repetidos. Salvar antes de confirmar; preservar campos quando houver erro. Após sucesso, oferecer link de WhatsApp configurado pelo administrador com todos os dados codificados no texto. Não abrir automaticamente nem inventar número. Sem número, apenas confirmar a gravação.

## Administração

Rota /admin com autenticação e autorização no servidor. Sem cadastro público ou credenciais fixas. Dashboard com totais de interessados, novos, propostas enviadas, clientes ativos, visitas agendadas e manutenções pendentes. Interessados com busca, filtro, observações, contato e status Novo, Em contato, Proposta enviada, Convertido ou Encerrado. Converter em cliente sem redigitar, preservar interessado e evitar duplicações. Clientes com dados, computadores, serviço, mensalidade opcional e status ativo/inativo. Visitas por cliente com data/hora, descrição, status agendada/realizada/cancelada, observações e próxima manutenção opcional. Lembretes internos de datas próximas e vencidas. Configurar WhatsApp, e-mail e horário. Exclusão de interessado mediante confirmação.

## Dados e qualidade

Persistência no backend, sem banco no navegador. Visitantes somente enviam pedidos e consultam configurações públicas. Não expor segredos em código, logs ou Git. Rótulos acessíveis, teclado, celular, estados de vazio, processamento, erro e sucesso. Banco de produção vazio. Dados fictícios apenas em testes e identificados.

## Fora do escopo

Stripe, cobrança automática, chatbot, área do cliente, acesso remoto, notas fiscais e envio automático de mensagens. O link de WhatsApp inicia a conversa manualmente.

## Mudança autorizada

O briefing original previa Lovable Cloud. Depois, o usuário informou: “nao precisa criar no lovable, crie por aqui mesmo usando o github”. Implementar backend próprio com Node.js 24 e SQLite, com instruções de publicação e configuração segura do administrador.

## Entrega

README com dor, modelo de mercado/Canvas, hipótese, processos manuais, tecnologia, execução, configuração do administrador, testes e publicação. Documentar limitações reais. Não inventar pesquisas, testes, clientes, URL publicada, arquivos ou pastas.
