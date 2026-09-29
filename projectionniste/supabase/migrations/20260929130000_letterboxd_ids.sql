-- Identifiants Letterboxd : permettent de réimporter un export sans créer de doublons.

alter table public.diary_entries add column letterboxd_uri text;
alter table public.diary_entries add constraint diary_entries_user_lb_uri unique (user_id, letterboxd_uri);

alter table public.lists add column letterboxd_url text;
alter table public.lists add constraint lists_user_lb_url unique (user_id, letterboxd_url);
