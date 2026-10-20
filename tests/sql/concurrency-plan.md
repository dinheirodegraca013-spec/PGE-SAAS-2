# Testes de concorrência (homologação)

Ambiente: PostgreSQL descartável. Verificar duas saídas simultâneas sobre saldo 10 e duas baixas simultâneas sobre lançamento 100; cada operação de 7 ou 70 deve resultar em exatamente um sucesso e um erro de saldo insuficiente. Confirmar status parcial e quitação, isolamento entre tenants, ausência de escrita na produção.
