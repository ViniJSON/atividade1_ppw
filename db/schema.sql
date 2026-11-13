
CREATE TABLE disciplinas (
    id              text PRIMARY KEY,
    codigo          text NOT NULL UNIQUE,
    nome            text NOT NULL,
    vagas_totais    integer NOT NULL CHECK (vagas_totais >= 1),
    vagas_ocupadas  integer NOT NULL DEFAULT 0,
    CONSTRAINT ck_vagas CHECK (vagas_ocupadas >= 0 AND vagas_ocupadas <= vagas_totais)
);

CREATE TABLE disciplina_horarios (
    disciplina_id  text     NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    dia_semana     smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), 
    inicio         time     NOT NULL,
    fim            time     NOT NULL,
    PRIMARY KEY (disciplina_id, dia_semana, inicio),
    CHECK (inicio < fim)
);

CREATE TABLE disciplina_pre_requisitos (
    disciplina_id     text NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    pre_requisito_id  text NOT NULL REFERENCES disciplinas(id) ON DELETE RESTRICT,
    PRIMARY KEY (disciplina_id, pre_requisito_id),
    CHECK (disciplina_id <> pre_requisito_id)
);
CREATE INDEX ix_pre_requisito_reverso ON disciplina_pre_requisitos (pre_requisito_id);

CREATE TABLE alunos (
    id         text PRIMARY KEY,
    nome       text NOT NULL,
    matricula  text NOT NULL UNIQUE
);

CREATE TABLE aluno_concluidas (
    aluno_id       text NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    disciplina_id  text NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    PRIMARY KEY (aluno_id, disciplina_id)
);

CREATE TABLE aluno_matriculas (
    aluno_id       text NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    disciplina_id  text NOT NULL REFERENCES disciplinas(id) ON DELETE RESTRICT,
    PRIMARY KEY (aluno_id, disciplina_id)
);
CREATE INDEX ix_matriculas_por_disciplina ON aluno_matriculas (disciplina_id);

CREATE TABLE solicitacoes (
    id                      text PRIMARY KEY,
    aluno_id                text NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    disciplina_id           text NOT NULL REFERENCES disciplinas(id) ON DELETE RESTRICT,
    tipo                    text NOT NULL CHECK (tipo IN ('MATRICULA', 'TRANCAMENTO')),
    status                  text NOT NULL CHECK (status IN
        ('PENDENTE','EM_ANALISE','AJUSTE_SOLICITADO','APROVADA','CONCLUIDA','REJEITADA','CANCELADA','EXPIRADA','ESTORNADA')),
    pre_requisitos_ok       boolean NOT NULL,
    vaga_disponivel         boolean NOT NULL,
    sem_conflito_horario    boolean NOT NULL,
    ultima_justificativa    text,
    criado_em               timestamptz NOT NULL,
    atualizado_em           timestamptz NOT NULL,
    prazo_limite            timestamptz NOT NULL,
    escalonar_em            timestamptz NOT NULL,
    escalonada_em           timestamptz,
    versao                  integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX uq_solicitacao_aberta
    ON solicitacoes (aluno_id, disciplina_id, tipo)
    WHERE status IN ('PENDENTE','EM_ANALISE','AJUSTE_SOLICITADO','APROVADA');

CREATE INDEX ix_solicitacoes_sla ON solicitacoes (prazo_limite)
    WHERE status IN ('PENDENTE','EM_ANALISE','AJUSTE_SOLICITADO');

CREATE TABLE solicitacao_historico (
    id               bigserial PRIMARY KEY,
    id_registro      text NOT NULL REFERENCES solicitacoes(id) ON DELETE RESTRICT,
    evento           text NOT NULL,
    estado_anterior  text,
    novo_estado      text NOT NULL,
    autor_id         text NOT NULL,
    autor_papel      text NOT NULL CHECK (autor_papel IN ('ALUNO','COORDENADOR','SECRETARIA','SISTEMA')),
    justificativa    text,
    metadados        jsonb NOT NULL DEFAULT '{}'::jsonb,
    criado_em        timestamptz NOT NULL
);
CREATE INDEX ix_historico_por_registro ON solicitacao_historico (id_registro, id);

CREATE FUNCTION bloquear_alteracao_historico() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'A trilha de auditoria é imutável (% não permitido)', TG_OP;
END;
$$;

CREATE TRIGGER trg_historico_imutavel
    BEFORE UPDATE OR DELETE ON solicitacao_historico
    FOR EACH ROW EXECUTE FUNCTION bloquear_alteracao_historico();

CREATE TRIGGER trg_historico_sem_truncate
    BEFORE TRUNCATE ON solicitacao_historico
    FOR EACH STATEMENT EXECUTE FUNCTION bloquear_alteracao_historico();
