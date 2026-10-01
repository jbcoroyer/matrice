-- Suppression de compte depuis l'appli (RGPD, règle Apple 5.1.1(v)).
-- Chaque personne ne peut supprimer que son propre compte. Les tables liées (profil, films vus, journal,
-- listes, collection, parcours…) se vident par cascade. Relançable sans erreur.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Non connecté';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
