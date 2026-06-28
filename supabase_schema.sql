-- =========================================================
-- EDR Laudos - Schema para Supabase Self-Hosted
-- Rode no SQL Editor do Studio
-- =========================================================

-- Extensões
create extension if not exists "pgcrypto";

-- =========================================================
-- ENUMS
-- =========================================================
do $$ begin
  create type public.laudo_status as enum ('pendente','finalizado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_status as enum ('pendente','aprovado','reprovado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.foto_categoria as enum ('geral','placa_chassi','hodometro','defeito');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.app_role as enum ('admin','user');
exception when duplicate_object then null; end $$;

-- =========================================================
-- USER ROLES (separado do profile - segurança)
-- =========================================================
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

drop policy if exists "users read own roles" on public.user_roles;
create policy "users read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

-- =========================================================
-- LAUDOS (tabela principal)
-- =========================================================
create table if not exists public.laudos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  status public.laudo_status not null default 'pendente',
  data_laudo date not null default current_date,
  ordem_servico text default '',

  -- Cliente
  cliente_solicitante text default '',
  cliente_empresa text default '',
  cliente_final text default '',
  cliente_cpf_cnpj text default '',
  cliente_agendamento text default '',
  cliente_endereco text default '',
  cliente_bairro text default '',
  cliente_cidade text default '',
  cliente_cep text default '',
  cliente_telefone text default '',
  cliente_email text default '',

  -- Veículo
  veiculo_marca_modelo text default '',
  veiculo_ano_fabricacao text default '',
  veiculo_ano_modelo text default '',
  veiculo_placa text default '',
  veiculo_chassi text default '',
  veiculo_hodometro text default '',
  veiculo_motorizacao text default '',
  veiculo_cor text default '',
  veiculo_combustivel text default '',

  -- Oficina
  oficina_nome text default '',
  oficina_endereco text default '',
  oficina_bairro text default '',
  oficina_cidade text default '',
  oficina_telefone text default '',
  oficina_responsavel text default '',
  oficina_cnpj text default '',

  -- Processo
  processo_analista text default '',
  processo_vistoriador text default '',
  processo_resp_tecnico text default '',
  processo_cargo_resp_tecnico text default 'Gestor de Operações EDR',

  -- OS
  os_status text default '',
  os_tipo_manutencao text default '',
  os_data_emissao text default '',
  os_data_prev_inicio text default '',
  os_data_prev_conclusao text default '',
  os_data_conclusao text default '',

  -- Análise (campos textuais)
  analise_causa_raiz text default '',
  analise_historico_manutencao text default '',
  analise_relato_motorista text default '',
  analise_ordem_itens jsonb default '[]'::jsonb,

  -- Conclusão
  conclusao_parecer_tecnico text default '',
  conclusao_recomendacoes text default '',
  conclusao_analista_vistoriador text default '',
  conclusao_gestor_operacoes text default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists laudos_user_id_idx on public.laudos(user_id);
create index if not exists laudos_status_idx on public.laudos(status);
create index if not exists laudos_placa_idx on public.laudos(veiculo_placa);

grant select, insert, update, delete on public.laudos to authenticated;
grant all on public.laudos to service_role;
alter table public.laudos enable row level security;

drop policy if exists "laudos select own" on public.laudos;
create policy "laudos select own" on public.laudos for select to authenticated using (auth.uid() = user_id);
drop policy if exists "laudos insert own" on public.laudos;
create policy "laudos insert own" on public.laudos for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "laudos update own" on public.laudos;
create policy "laudos update own" on public.laudos for update to authenticated using (auth.uid() = user_id);
drop policy if exists "laudos delete own" on public.laudos;
create policy "laudos delete own" on public.laudos for delete to authenticated using (auth.uid() = user_id);

-- =========================================================
-- ITENS DO ORÇAMENTO
-- =========================================================
create table if not exists public.laudo_itens_orcamento (
  id uuid primary key default gen_random_uuid(),
  laudo_id uuid references public.laudos(id) on delete cascade not null,
  codigo text default '',
  grupo text default '',
  descricao text default '',
  acao text default '',
  status_item text default '',
  qtd_peca numeric default 0,
  valor_peca numeric default 0,
  qtd_mao_obra numeric default 0,
  valor_mao_obra numeric default 0,
  valor_total numeric default 0,
  imposto_ipi numeric default 0,
  imposto_icms numeric default 0,
  justificativa text default '',
  status public.item_status not null default 'pendente',
  status_mao_obra public.item_status,
  fotos jsonb default '[]'::jsonb,
  ordem int default 0,
  created_at timestamptz not null default now()
);

create index if not exists itens_laudo_id_idx on public.laudo_itens_orcamento(laudo_id);

grant select, insert, update, delete on public.laudo_itens_orcamento to authenticated;
grant all on public.laudo_itens_orcamento to service_role;
alter table public.laudo_itens_orcamento enable row level security;

drop policy if exists "itens select" on public.laudo_itens_orcamento;
create policy "itens select" on public.laudo_itens_orcamento for select to authenticated
  using (exists (select 1 from public.laudos l where l.id = laudo_id and l.user_id = auth.uid()));
drop policy if exists "itens insert" on public.laudo_itens_orcamento;
create policy "itens insert" on public.laudo_itens_orcamento for insert to authenticated
  with check (exists (select 1 from public.laudos l where l.id = laudo_id and l.user_id = auth.uid()));
drop policy if exists "itens update" on public.laudo_itens_orcamento;
create policy "itens update" on public.laudo_itens_orcamento for update to authenticated
  using (exists (select 1 from public.laudos l where l.id = laudo_id and l.user_id = auth.uid()));
drop policy if exists "itens delete" on public.laudo_itens_orcamento;
create policy "itens delete" on public.laudo_itens_orcamento for delete to authenticated
  using (exists (select 1 from public.laudos l where l.id = laudo_id and l.user_id = auth.uid()));

-- =========================================================
-- GRUPOS DE ANÁLISE
-- =========================================================
create table if not exists public.laudo_grupos_analise (
  id uuid primary key default gen_random_uuid(),
  laudo_id uuid references public.laudos(id) on delete cascade not null,
  nome text default '',
  item_ids jsonb default '[]'::jsonb,
  justificativa text default '',
  status public.item_status not null default 'pendente',
  fotos jsonb default '[]'::jsonb,
  ordem int default 0,
  created_at timestamptz not null default now()
);

create index if not exists grupos_laudo_id_idx on public.laudo_grupos_analise(laudo_id);

grant select, insert, update, delete on public.laudo_grupos_analise to authenticated;
grant all on public.laudo_grupos_analise to service_role;
alter table public.laudo_grupos_analise enable row level security;

drop policy if exists "grupos select" on public.laudo_grupos_analise;
create policy "grupos select" on public.laudo_grupos_analise for select to authenticated
  using (exists (select 1 from public.laudos l where l.id = laudo_id and l.user_id = auth.uid()));
drop policy if exists "grupos insert" on public.laudo_grupos_analise;
create policy "grupos insert" on public.laudo_grupos_analise for insert to authenticated
  with check (exists (select 1 from public.laudos l where l.id = laudo_id and l.user_id = auth.uid()));
drop policy if exists "grupos update" on public.laudo_grupos_analise;
create policy "grupos update" on public.laudo_grupos_analise for update to authenticated
  using (exists (select 1 from public.laudos l where l.id = laudo_id and l.user_id = auth.uid()));
drop policy if exists "grupos delete" on public.laudo_grupos_analise;
create policy "grupos delete" on public.laudo_grupos_analise for delete to authenticated
  using (exists (select 1 from public.laudos l where l.id = laudo_id and l.user_id = auth.uid()));

-- =========================================================
-- FOTOS DA VISTORIA (metadados; arquivos no Storage)
-- =========================================================
create table if not exists public.laudo_fotos (
  id uuid primary key default gen_random_uuid(),
  laudo_id uuid references public.laudos(id) on delete cascade not null,
  storage_path text not null,
  categoria public.foto_categoria not null default 'geral',
  descricao text default '',
  ordem int default 0,
  created_at timestamptz not null default now()
);

create index if not exists fotos_laudo_id_idx on public.laudo_fotos(laudo_id);

grant select, insert, update, delete on public.laudo_fotos to authenticated;
grant all on public.laudo_fotos to service_role;
alter table public.laudo_fotos enable row level security;

drop policy if exists "fotos select" on public.laudo_fotos;
create policy "fotos select" on public.laudo_fotos for select to authenticated
  using (exists (select 1 from public.laudos l where l.id = laudo_id and l.user_id = auth.uid()));
drop policy if exists "fotos insert" on public.laudo_fotos;
create policy "fotos insert" on public.laudo_fotos for insert to authenticated
  with check (exists (select 1 from public.laudos l where l.id = laudo_id and l.user_id = auth.uid()));
drop policy if exists "fotos update" on public.laudo_fotos;
create policy "fotos update" on public.laudo_fotos for update to authenticated
  using (exists (select 1 from public.laudos l where l.id = laudo_id and l.user_id = auth.uid()));
drop policy if exists "fotos delete" on public.laudo_fotos;
create policy "fotos delete" on public.laudo_fotos for delete to authenticated
  using (exists (select 1 from public.laudos l where l.id = laudo_id and l.user_id = auth.uid()));

-- =========================================================
-- TRIGGER: updated_at automático em laudos
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists laudos_set_updated_at on public.laudos;
create trigger laudos_set_updated_at before update on public.laudos
  for each row execute function public.set_updated_at();

-- =========================================================
-- STORAGE: bucket de fotos (privado, com RLS por usuário)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('laudo-fotos','laudo-fotos', false)
on conflict (id) do nothing;

drop policy if exists "fotos storage select own" on storage.objects;
create policy "fotos storage select own" on storage.objects for select to authenticated
  using (bucket_id = 'laudo-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "fotos storage insert own" on storage.objects;
create policy "fotos storage insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'laudo-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "fotos storage update own" on storage.objects;
create policy "fotos storage update own" on storage.objects for update to authenticated
  using (bucket_id = 'laudo-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "fotos storage delete own" on storage.objects;
create policy "fotos storage delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'laudo-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================
-- PROFILES (dados de perfil do usuário)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text default '',
  avatar_url text default '',
  cargo text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto criar profile + role 'user' no signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome) values (new.id, coalesce(new.raw_user_meta_data->>'nome',''))
    on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user')
    on conflict (user_id, role) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- PAYLOAD JSONB em laudos (armazena o objeto completo do laudo)
-- =========================================================
alter table public.laudos add column if not exists payload jsonb default '{}'::jsonb;