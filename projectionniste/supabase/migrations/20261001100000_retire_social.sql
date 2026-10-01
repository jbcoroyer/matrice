-- Filmable n'a plus de critiques publiques, de « Qui l'a vu » ni de profil public : tout reste privé.
-- Relançable sans erreur. Les tables et les colonnes restent (aucune donnée n'est supprimée).

-- plus personne ne voit les films vus ni les notes des autres membres
alter table public.profiles alter column show_activity set default false;
update public.profiles set show_activity = false where show_activity;

-- les critiques du journal ne sont lisibles que par leur auteur
alter table public.diary_entries alter column review_public set default false;
update public.diary_entries set review_public = false where review_public;
