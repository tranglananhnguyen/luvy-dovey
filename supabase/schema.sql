create table if not exists public.stars (
  id uuid primary key,
  title text not null,
  note text not null,
  author text not null,
  color text not null,
  tags text not null,
  visibility text not null check (visibility in ('public', 'private')),
  x double precision not null,
  y double precision not null,
  created timestamptz not null,
  owner_hash text,
  access_hash text
);
create index if not exists public_stars_created on public.stars (created desc) where visibility = 'public';
alter table public.stars enable row level security;
revoke all on public.stars from public, anon, authenticated;
grant select, insert, delete on public.stars to service_role;

create or replace function public.find_public_stars(term text)
returns table(id uuid, title text, author text, color text, tags text, x double precision, y double precision)
language sql stable security invoker set search_path = ''
as $$
  select s.id, s.title, s.author, s.color, s.tags, s.x, s.y
  from public.stars s
  where s.visibility = 'public' and (
    position(lower(term) in lower(s.title)) > 0 or position(lower(term) in lower(s.author)) > 0 or
    position(lower(term) in lower(s.tags)) > 0 or position(lower(term) in lower(s.note)) > 0
  )
  order by s.created desc limit 60
$$;
revoke all on function public.find_public_stars(text) from public, anon, authenticated;
grant execute on function public.find_public_stars(text) to service_role;
